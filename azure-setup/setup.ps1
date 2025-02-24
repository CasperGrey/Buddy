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

# Check if .NET 8.0 SDK is installed
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "Installing .NET 8.0 SDK..."
    winget install -e --id Microsoft.DotNet.SDK.8
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install .NET 8.0 SDK"
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

# Configure Function App settings
Write-Host "`nConfiguring Function App settings..."
az functionapp config appsettings set `
    --name $backendApp `
    --resource-group $backendRg `
    --settings `
        FUNCTIONS_WORKER_RUNTIME=dotnet `
        FUNCTIONS_INPROC_NET8_ENABLED=true `
        DOTNET_ENVIRONMENT=Production `
        WEBSITE_WEBSOCKETS_ENABLED=true

# Enable WebSocket support
Write-Host "Enabling WebSocket support..."
az functionapp config set `
    --name $backendApp `
    --resource-group $backendRg `
    --web-sockets-enabled true

# Find and get Cosmos DB details
Write-Host "`nFinding Cosmos DB account..."
$cosmosAccount = az cosmosdb list --resource-group $backendRg --query "[0]" | ConvertFrom-Json
if (-not $cosmosAccount) {
    Write-Error "No Cosmos DB account found in resource group $backendRg"
    exit 1
}
$cosmosAccountName = $cosmosAccount.name
Write-Host "Found Cosmos DB account: $cosmosAccountName"

Write-Host "Getting Cosmos DB connection string..."
$cosmosConnectionString = az cosmosdb keys list `
    --name $cosmosAccountName `
    --resource-group $backendRg `
    --type connection-strings `
    --query "connectionStrings[0].connectionString" `
    -o tsv

if (-not $cosmosConnectionString) {
    Write-Error "Failed to get Cosmos DB connection string"
    exit 1
}

# Find and get Event Grid details
Write-Host "`nFinding Event Grid topic..."
$eventGridTopic = az eventgrid topic list --resource-group $backendRg --query "[0]" | ConvertFrom-Json
if (-not $eventGridTopic) {
    Write-Error "No Event Grid topic found in resource group $backendRg"
    exit 1
}
$eventGridTopicName = $eventGridTopic.name
Write-Host "Found Event Grid topic: $eventGridTopicName"

$eventGridEndpoint = $eventGridTopic.endpoint
if (-not $eventGridEndpoint) {
    Write-Error "Failed to get Event Grid endpoint"
    exit 1
}

Write-Host "Getting Event Grid key..."
$eventGridKey = az eventgrid topic key list `
    --name $eventGridTopicName `
    --resource-group $backendRg `
    --query "key1" `
    -o tsv

if (-not $eventGridKey) {
    Write-Error "Failed to get Event Grid key"
    exit 1
}

# Store secrets in Key Vault
Write-Host "`nStoring secrets in Key Vault..."
$vaultName = "chat-keyvault-prod-001"

Write-Host "Storing Cosmos DB connection string..."
az keyvault secret set `
    --vault-name $vaultName `
    --name "cosmos-connection-string" `
    --value $cosmosConnectionString

Write-Host "Storing Event Grid endpoint..."
az keyvault secret set `
    --vault-name $vaultName `
    --name "event-grid-endpoint" `
    --value $eventGridEndpoint

Write-Host "Storing Event Grid key..."
az keyvault secret set `
    --vault-name $vaultName `
    --name "event-grid-key" `
    --value $eventGridKey

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

# Set up federated credentials
Write-Host "`nSetting up federated credentials..."
$scriptPath = Join-Path $PSScriptRoot "setup-federated-credentials.ps1"

# Get repository info
$remoteUrl = git config --get remote.origin.url
if ($remoteUrl -match 'github\.com[:/]([^/]+)/([^/.]+)(\.git)?$') {
    $repoOwner = $matches[1]
    $repoName = $matches[2]
} else {
    Write-Error "Could not parse GitHub repository from git remote URL"
    exit 1
}

# Run federated credentials setup
& $scriptPath `
    -TenantId $tenantId `
    -BackendClientId $backendClientId `
    -FrontendClientId $frontendClientId `
    -RepoOwner $repoOwner `
    -RepoName $repoName

Write-Host "`nSetup completed successfully!"
Write-Host "GitHub Actions secrets have been configured and deployment workflows are ready."

# Create local.settings.json template
Write-Host "`nCreating local.settings.json template..."
$localSettings = @{
    IsEncrypted = $false
    Values = @{
        AzureWebJobsStorage = "UseDevelopmentStorage=true"
        FUNCTIONS_WORKER_RUNTIME = "dotnet"
        FUNCTIONS_INPROC_NET8_ENABLED = "true"
        CosmosDbConnectionString = "<your-cosmos-connection-string>"
        EventGridEndpoint = "<your-eventgrid-endpoint>"
        EventGridKey = "<your-eventgrid-key>"
        ASPNETCORE_ENVIRONMENT = "Development"
    }
    Host = @{
        CORS = "*"
        CORSCredentials = $true
    }
} | ConvertTo-Json -Depth 10

Set-Content -Path "api/ChatFunctions/local.settings.json" -Value $localSettings -Force

# Automatically commit and push changes
Write-Host "`nCommitting and pushing changes..."
git add .
git commit -m "Setup complete: Configure Azure resources and GitHub Actions"
git push

Write-Host "`nDeployment initiated! Monitor the deployment status in GitHub Actions"
