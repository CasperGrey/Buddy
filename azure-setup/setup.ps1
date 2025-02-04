
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

# Set up GraphQL schema
Write-Host "Setting up GraphQL schema deployment..."
Push-Location
$apiPath = Join-Path $PSScriptRoot ".."
$chatFunctionsPath = Join-Path $apiPath "api\ChatFunctions"
Set-Location $chatFunctionsPath

# Install required tools
Write-Host "Installing required tools..."
npm install -g get-graphql-schema

# Configure Function App settings
Write-Host "Configuring Function App settings..."
$vaultName = "chat-keyvault-prod-001"
$cosmosDbConnectionString = az keyvault secret show --vault-name $vaultName --name "cosmos-connection-string" --query "value" -o tsv
$eventGridEndpoint = az keyvault secret show --vault-name $vaultName --name "event-grid-endpoint" --query "value" -o tsv
$eventGridKey = az keyvault secret show --vault-name $vaultName --name "event-grid-key" --query "value" -o tsv

# Update Function App settings
Write-Host "Updating Function App settings..."
az functionapp config appsettings set `
    --name $backendApp `
    --resource-group $backendRg `
    --settings `
        CosmosDbConnectionString="$cosmosDbConnectionString" `
        EventGridEndpoint="$eventGridEndpoint" `
        EventGridKey="$eventGridKey"

# Restart Function App and wait for it to be ready
Write-Host "Restarting Function App..."
az functionapp restart --name $backendApp --resource-group $backendRg

# Function to test if the Function App is ready
function Test-FunctionAppHealth {
    param (
        [string]$functionApp,
        [string]$resourceGroup
    )
    
    $maxAttempts = 20  # Increased from 10
    $attempt = 1
    $delay = 15  # Decreased from 30 for more frequent checks
    
    Write-Host "Waiting for Function App to be ready..."
    
    while ($attempt -le $maxAttempts) {
        Write-Host "`nAttempt $attempt of $maxAttempts..."
        
        try {
            Write-Host "Checking Function App and GraphQL function..."
            
            # Check if Function App is running
            $status = az functionapp show --name $functionApp --resource-group $resourceGroup --query "state" -o tsv
            Write-Host "Function App state: $status"
            
            # Check if GraphQL function exists and is enabled
            Write-Host "Checking GraphQL function..."
            $graphqlFunction = az functionapp function show `
                --name $functionApp `
                --resource-group $resourceGroup `
                --function-name graphql `
                --query "{name: name, isDisabled: config.disabled}" | ConvertFrom-Json
            
            if (-not $graphqlFunction) {
                Write-Host "GraphQL function not found"
                continue
            }
            
            if ($graphqlFunction.isDisabled) {
                Write-Host "GraphQL function is disabled"
                continue
            }
            
            Write-Host "GraphQL function is enabled and configured"
            
            if ($status -eq "Running") {
                Write-Host "Function App is running, checking configuration..."
                
                # Check app settings are applied
                Write-Host "Verifying app settings..."
                $settings = az functionapp config appsettings list `
                    --name $functionApp `
                    --resource-group $resourceGroup | ConvertFrom-Json
                
                $requiredSettings = @(
                    "CosmosDbConnectionString",
                    "EventGridEndpoint",
                    "EventGridKey"
                )
                
                $missingSettings = $requiredSettings | Where-Object {
                    -not ($settings | Where-Object { $_.name -eq $_ -and $_.value })
                }
                
                if ($missingSettings) {
                    Write-Host "Missing or empty app settings: $($missingSettings -join ', ')"
                    Write-Host "Checking Function App logs..."
                    az functionapp logs tail --name $functionApp --resource-group $resourceGroup
                    continue
                }
                
                Write-Host "App settings verified, checking GraphQL endpoint..."
                
                # Get function key for authentication
                Write-Host "Getting function key..."
                $functionKey = az functionapp keys list -g $resourceGroup -n $functionApp --query "functionKeys.default" -o tsv
                
                if ($functionKey) {
                    Write-Host "Function key retrieved successfully"
                    
                    # Try to access the GraphQL endpoint with authentication
                    $url = "https://$functionApp.azurewebsites.net/api/graphql"
                    Write-Host "Testing GraphQL endpoint: $url"
                    
                    $headers = @{
                        "Content-Type" = "application/json"
                        "x-functions-key" = $functionKey
                    }
                    
                    $body = @{
                        query = "query { __schema { queryType { name } } }"
                    } | ConvertTo-Json
                    
                    $response = Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $body -UseBasicParsing
                    
                    if ($response.StatusCode -eq 200) {
                        $content = $response.Content | ConvertFrom-Json
                        if ($content.data.__schema.queryType.name) {
                            Write-Host "GraphQL endpoint is responding correctly!"
                            return $true
                        } else {
                            Write-Host "GraphQL response missing schema information"
                        }
                    } else {
                        Write-Host "GraphQL endpoint returned status code: $($response.StatusCode)"
                    }
                } else {
                    Write-Host "Failed to retrieve function key"
                }
            } else {
                Write-Host "Function App not in Running state"
            }
        }
        catch {
            Write-Host "Error checking Function App health: $_"
            if ($_.Exception.Response) {
                Write-Host "Response status code: $($_.Exception.Response.StatusCode)"
            }
        }
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "Waiting $delay seconds before next attempt..."
            Start-Sleep -Seconds $delay
        }
        $attempt++
    }
    
    Write-Host "`nFunction App health check failed after $maxAttempts attempts"
    return $false
}

# Wait for Function App to be ready
if (-not (Test-FunctionAppHealth -functionApp $backendApp -resourceGroup $backendRg)) {
    Write-Error "Function App failed to become ready in time"
    exit 1
}

# Generate GraphQL schema
Write-Host "Generating GraphQL schema..."
$schemaDir = Join-Path $chatFunctionsPath "Schema"
if (-not (Test-Path $schemaDir)) {
    New-Item -ItemType Directory -Path $schemaDir | Out-Null
}

$schemaFile = Join-Path $schemaDir "schema.graphql"
$functionUrl = "https://$backendApp.azurewebsites.net/api/graphql"

# Function to download and validate schema
function Get-GraphQLSchema {
    param (
        [string]$url,
        [string]$outputFile
    )
    
    $maxAttempts = 3
    $attempt = 1
    
    # Get function key from Key Vault
    Write-Host "Getting Function App key..."
    $functionKey = az functionapp keys list -g $backendRg -n $backendApp --query "functionKeys.default" -o tsv
    if (-not $functionKey) {
        Write-Error "Failed to get Function App key"
        exit 1
    }
    
    # Store function key in Key Vault
    Write-Host "Storing Function App key in Key Vault..."
    az keyvault secret set `
        --vault-name $vaultName `
        --name "function-key" `
        --value $functionKey
    
    # Set environment variable for get-graphql-schema
    $env:FUNCTION_KEY = $functionKey
    
    while ($attempt -le $maxAttempts) {
        try {
            Write-Host "Downloading schema (attempt $attempt of $maxAttempts)..."
            $env:GET_GRAPHQL_SCHEMA_HEADERS = "x-functions-key:$functionKey"
            npx get-graphql-schema --header "x-functions-key:$functionKey" $url > $outputFile
            
            if (Test-Path $outputFile) {
                $schemaContent = Get-Content $outputFile -Raw
                if ($schemaContent -match "type Query" -and $schemaContent -match "type Mutation") {
                    Write-Host "Schema downloaded and validated successfully!"
                    return $true
                }
            }
        }
        catch {
            Write-Host "Error downloading schema: $_"
        }
        
        $attempt++
        if ($attempt -le $maxAttempts) {
            Write-Host "Waiting 10 seconds before retry..."
            Start-Sleep -Seconds 10
        }
    }
    
    return $false
}

# Function to get GitHub repository info from remote URL
function Get-GitRemoteUrl {
    # Try to get from environment first
    if ($env:GITHUB_REPOSITORY) {
        $parts = $env:GITHUB_REPOSITORY -split '/'
        return @{
            owner = $parts[0]
            repo = $parts[1]
        }
    }

    # Fall back to git config
    try {
        $remoteUrl = git config --get remote.origin.url
        # Handle different git URL formats (HTTPS or SSH)
        if ($remoteUrl -match 'github\.com[:/]([^/]+)/([^/.]+)(\.git)?$') {
            return @{
                owner = $matches[1]
                repo = $matches[2]
            }
        }
        throw "Could not parse GitHub repository from git remote URL"
    } catch {
        throw "Could not determine GitHub repository: $_"
    }
}

# Create GitHub production environment if it doesn't exist
Write-Host "`nSetting up GitHub production environment..."
try {
    $repoInfo = Get-GitRemoteUrl
    $owner = $repoInfo.owner
    $repo = $repoInfo.repo
    
    $headers = @{
        "Authorization" = "token $githubPat"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    $envUrl = "https://api.github.com/repos/$owner/$repo/environments/production"
    $response = Invoke-RestMethod -Uri $envUrl -Headers $headers -Method Get -ErrorAction SilentlyContinue
    
    if (-not $response) {
        Write-Host "Creating production environment..."
        $body = @{
            deployment_branch_policy = @{
                protected_branches = $true
                custom_branch_policies = $false
            }
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri $envUrl -Headers $headers -Method Put -Body $body -ContentType "application/json"
        Write-Host "Production environment created successfully"
    } else {
        Write-Host "Production environment already exists"
    }
} catch {
    Write-Error "Failed to set up GitHub production environment: $_"
    exit 1
}

if (-not (Get-GraphQLSchema -url $functionUrl -outputFile $schemaFile)) {
    Write-Error "Failed to download and validate GraphQL schema"
    exit 1
}
Pop-Location

Write-Host "`nSetup completed successfully!"
Write-Host "GitHub Actions secrets have been configured and deployment workflows are ready."

# Automatically commit and push changes
Write-Host "`nCommitting and pushing changes..."
git add .
git commit -m "Setup complete: Configure Azure resources and GitHub Actions"
git push

Write-Host "`nDeployment initiated! Monitor the deployment status in GitHub Actions"
