# Setup script for Buddy Chat application
Write-Host "Checking prerequisites..."

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Azure CLI..."
    winget install -e --id Microsoft.AzureCLI
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install Azure CLI"
        exit 1
    }
}

# Check if Git is installed and repository is initialized
try {
    git rev-parse --git-dir | Out-Null
} catch {
    Write-Error "This directory is not a git repository"
    exit 1
}

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Node.js..."
    winget install -e --id OpenJS.NodeJS.LTS
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install Node.js"
        exit 1
    }
}

# Login to Azure if not already logged in
Write-Host "Checking Azure login status..."
$azureAccount = az account show 2>&1 | ConvertFrom-Json
if (-not $azureAccount) {
    Write-Host "Please log in to Azure..."
    az login
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to log in to Azure"
        exit 1
    }
}
Write-Host "Azure login successful"

# Get subscription ID
Write-Host "`nGetting subscription ID..."
$subscriptionId = az account list --query "[0].id" -o tsv
$subscriptionName = az account list --query "[0].name" -o tsv
Write-Host "Using subscription: $subscriptionName ($subscriptionId)"

# Use the same subscription for both frontend and backend
$frontendSubId = $subscriptionId
$backendSubId = $subscriptionId

# Get GitHub PAT from Key Vault
Write-Host "Retrieving GitHub PAT from Key Vault..."
try {
    $githubPat = az keyvault secret show `
        --vault-name "chat-keyvault-prod-001" `
        --name "github-ph" `
        --query "value" `
        -o tsv

    if (-not $githubPat) {
        throw "GitHub PAT not found in Key Vault"
    }
    Write-Host "GitHub PAT retrieved successfully"
} catch {
    Write-Error "Failed to retrieve GitHub PAT from Key Vault: $_"
    Write-Host "Please ensure you have access to chat-keyvault-prod-001 and the secret exists"
    exit 1
}

# Create Azure resources
Write-Host "`nCreating Azure resources..."
$scriptPath = Join-Path $PSScriptRoot "split-apps.ps1"
& $scriptPath -frontendSubscriptionId $frontendSubId -backendSubscriptionId $backendSubId -frontendLocation "australiaeast" -backendLocation "australiaeast"

# Verify resource creation
Write-Host "`nVerifying resources..."

# Verify frontend resources
$frontendRg = "chat-app-frontend-rg"
$frontendApp = "buddy-chat-app"
$frontendExists = az webapp show --name $frontendApp --resource-group $frontendRg 2>$null
if (-not $frontendExists) {
    Write-Error "Frontend Web App creation failed. Please check the logs above for details."
    exit 1
}
Write-Host "Frontend Web App verified successfully."

# Verify backend resources
$backendRg = "rg-chat-prod-001"
$backendApp = "chat-functions-prod"
$backendExists = az functionapp show --name $backendApp --resource-group $backendRg 2>$null
if (-not $backendExists) {
    Write-Error "Backend Function App verification failed. Please check the logs above for details."
    exit 1
}
Write-Host "Backend Function App verified successfully."

# Get the output values from split-apps.ps1
Write-Host "Setting up environment variables..."
$frontendClientId = az ad app list --display-name "buddy-chat-frontend-github" --query "[0].appId" -o tsv
$backendClientId = az ad app list --display-name "buddy-chat-backend-github" --query "[0].appId" -o tsv
$tenantId = az account show --query "tenantId" -o tsv

# Set up environment variables
$env:GITHUB_TOKEN = $githubPat
$env:AZURE_FRONTEND_CLIENT_ID = $frontendClientId
$env:AZURE_FRONTEND_SUBSCRIPTION_ID = $frontendSubId
$env:AZURE_BACKEND_CLIENT_ID = $backendClientId
$env:AZURE_BACKEND_SUBSCRIPTION_ID = $backendSubId
$env:AZURE_TENANT_ID = $tenantId

Write-Host "Environment variables set:"
Write-Host "AZURE_FRONTEND_CLIENT_ID: $frontendClientId"
Write-Host "AZURE_BACKEND_CLIENT_ID: $backendClientId"
Write-Host "AZURE_TENANT_ID: $tenantId"

# Install dependencies and run setup-azure-auth.js
Write-Host "Installing dependencies..."
Push-Location
Set-Location $PSScriptRoot
Write-Host "Installing npm packages..."
npm install @octokit/rest @azure/identity @azure/arm-resources sodium-native

Write-Host "Running setup-azure-auth.js..."
$setupResult = node setup-azure-auth.js 2>&1
if ($LASTEXITCODE -ne 0) {
    # Check if error is due to existing configuration
    if ($setupResult -like "*already exists*") {
        Write-Host "GitHub Actions authentication already configured, continuing..."
    } else {
        Write-Error "Failed to set up GitHub Actions authentication: $setupResult"
        exit 1
    }
}
Pop-Location

# Set up GraphQL schema
Write-Host "Setting up GraphQL schema deployment..."
Push-Location
# Fix Join-Path by joining paths one at a time
$apiPath = Join-Path $PSScriptRoot ".."
$chatFunctionsPath = Join-Path $apiPath "api\ChatFunctions"
Set-Location $chatFunctionsPath

# Check if dotnet tool is already installed
$toolInstallResult = dotnet tool install --global StrawberryShake.Tools 2>&1
if ($LASTEXITCODE -ne 0) {
    if ($toolInstallResult -like "*already installed*") {
        Write-Host "StrawberryShake.Tools already installed, continuing..."
    } else {
        Write-Error "Failed to install StrawberryShake.Tools: $toolInstallResult"
        exit 1
    }
}

# Run dotnet tool restore to ensure the tool is available
dotnet tool restore

# Create Schema directory if it doesn't exist
$schemaDir = Join-Path $chatFunctionsPath "Schema"
if (-not (Test-Path $schemaDir)) {
    New-Item -ItemType Directory -Path $schemaDir | Out-Null
}

# Check if Azure Functions Core Tools is installed
if (-not (Get-Command func -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Azure Functions Core Tools..."
    npm install -g azure-functions-core-tools@4 --unsafe-perm true
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install Azure Functions Core Tools"
        exit 1
    }
}

# Build Function App
Write-Host "Building Function App..."
dotnet build

# Start Function App in background
Write-Host "Starting Function App..."
$funcProcess = Start-Process func -ArgumentList "start" -NoNewWindow -PassThru -ErrorAction Stop

# Wait for Function App to start
Write-Host "Waiting for Function App to start..."
Start-Sleep -Seconds 10

try {
    # Download GraphQL schema using the correct command syntax
    Write-Host "Downloading GraphQL schema..."
    $maxAttempts = 3
    $attempt = 1
    $success = $false

    while (-not $success -and $attempt -le $maxAttempts) {
        Write-Host "Attempt $attempt of $maxAttempts to download schema..."
        $downloadResult = dotnet graphql download http://localhost:7071/api/graphql -f Schema/schema.graphql 2>&1
        if ($LASTEXITCODE -eq 0) {
            $success = $true
            Write-Host "Schema downloaded successfully"
        } else {
            Write-Host "Attempt $attempt failed: $downloadResult"
            if ($attempt -lt $maxAttempts) {
                Write-Host "Waiting 10 seconds before retry..."
                Start-Sleep -Seconds 10
            }
            $attempt++
        }
    }

    if (-not $success) {
        throw "Failed to download GraphQL schema after $maxAttempts attempts"
    }
}
finally {
    # Stop Function App
    if ($funcProcess) {
        Write-Host "Stopping Function App..."
        try {
            Stop-Process -Id $funcProcess.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "Note: Function App process already stopped"
        }
    }
}
Pop-Location

Write-Host "`nSetup completed successfully!"
Write-Host "GitHub Actions secrets have been configured and deployment workflows are ready."
Write-Host "`nNext steps:"
Write-Host "1. Push your changes to GitHub"
Write-Host "2. The workflows will automatically deploy both apps to their respective environments"
Write-Host "3. Monitor the deployment status in GitHub Actions"

Read-Host "Press Enter to continue..."
