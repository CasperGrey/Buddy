# Script to split apps into separate subscriptions
param(
    [Parameter(Mandatory=$true)]
    [string]$frontendSubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$backendSubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$frontendLocation = "australiaeast",
    
    [Parameter(Mandatory=$true)]
    [string]$backendLocation = "australiaeast"
)

# Ensure Azure CLI is installed and user is logged in
$azVersion = az version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Azure CLI is not installed. Please install it first."
    exit 1
}

# Check if user is logged in
$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not logged in to Azure. Please run 'az login' first."
    exit 1
}

# Function to create resources for an app
function Create-AppResources {
    param(
        [string]$subscriptionId,
        [string]$location,
        [string]$appType,
        [string]$appName
    )
    
    Write-Host "Creating resources for $appType in subscription $subscriptionId..."
    
    # Switch to the correct subscription
    az account set --subscription $subscriptionId
    
    $rgName = "chat-app-$appType-rg"
    $planName = "chat-app-$appType-plan"
    
    # Create or use existing resource group
    Write-Host "Creating/verifying resource group $rgName..."
    az group create --name $rgName --location $location --output none
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create resource group $rgName"
        exit 1
    }
    Write-Host "Resource group $rgName is ready"
    
    # Create and verify App Service Plan
    Write-Host "Creating/verifying App Service Plan..."
    $planExists = az appservice plan show --name $planName --resource-group $rgName 2>$null
    if (-not $planExists) {
        Write-Host "Creating new App Service Plan..."
        az appservice plan create `
            --name $planName `
            --resource-group $rgName `
            --sku F1 `
            --location $location `
            --is-linux false
        
        # Verify App Service Plan creation
        $planVerify = az appservice plan show --name $planName --resource-group $rgName 2>$null
        if (-not $planVerify) {
            Write-Error "Failed to create App Service Plan $planName"
            exit 1
        }
    } else {
        Write-Host "Using existing App Service Plan $planName"
    }

    # Wait for App Service Plan to be ready
    Start-Sleep -Seconds 10

    if ($appType -eq "backend") {
        # Use existing Function App name and resource group
        $appName = "chat-functions-prod"
        $rgName = "rg-chat-prod-001"
        Write-Host "Using existing Function App: $appName in resource group: $rgName"
        
        # Update Function App settings
        Write-Host "Updating Function App settings..."
        az functionapp config set `
            --name $appName `
            --resource-group $rgName `
            --use-32bit-worker-process true `
            --http20-enabled true
    } else {
        # Create Web App with retries
        $maxRetries = 3
        $retryCount = 0
        $success = $false

        while (-not $success -and $retryCount -lt $maxRetries) {
            $retryCount++
            Write-Host "Attempt $retryCount of $maxRetries to create Web App..."
            
            # Create basic Windows web app
            $result = az webapp create `
                --name $appName `
                --resource-group $rgName `
                --plan $planName 2>&1

            if ($LASTEXITCODE -eq 0) {
                Write-Host "Web App created, configuring Node.js version..."
                
                # Configure Node.js version through app settings
                $nodeResult = az webapp config appsettings set `
                    --name $appName `
                    --resource-group $rgName `
                    --settings WEBSITE_NODE_DEFAULT_VERSION="~16" 2>&1

                if ($LASTEXITCODE -eq 0) {
                    $success = $true
                    Write-Host "Web App created and configured successfully"
                    
                    # Verify web app exists and is running
                    Write-Host "Verifying Web App deployment..."
                    Start-Sleep -Seconds 10  # Give Azure some time to propagate
                    
                    $webappStatus = az webapp show --name $appName --resource-group $rgName --query "state" -o tsv
                    if ($webappStatus -ne "Running") {
                        Write-Error "Web App created but not in Running state. Current state: $webappStatus"
                        exit 1
                    }
                    Write-Host "Web App verified and running"
                } else {
                    Write-Host "Failed to configure Node.js version: $nodeResult"
                }
            } else {
                Write-Host "Attempt $retryCount failed: $result"
            }

            if (-not $success -and $retryCount -lt $maxRetries) {
                Write-Host "Waiting 30 seconds before retry..."
                Start-Sleep -Seconds 30
            }
        }

        if (-not $success) {
            Write-Error "Failed to create Web App after $maxRetries attempts"
            exit 1
        }
        
        # Configure Web App settings
        Write-Host "Configuring Web App settings..."
        az webapp config set `
            --name $appName `
            --resource-group $rgName `
            --use-32bit-worker-process true `
            --web-sockets-enabled true `
            --http20-enabled true
    }
    
    # Create or update Azure AD app registration
    Write-Host "Creating/updating Azure AD app registration..."
    $existingApp = $(az ad app list --display-name "buddy-chat-$appType-github" --query "[0].appId" -o tsv)
    if ($existingApp) {
        Write-Host "Updating existing app registration..."
        $appId = $existingApp
    } else {
        Write-Host "Creating new app registration..."
        $appId = $(az ad app create --display-name "buddy-chat-$appType-github" --query appId -o tsv)
    }
    
    # Create or update service principal
    Write-Host "Creating/updating service principal..."
    $existingSp = $(az ad sp list --filter "appId eq '$appId'" --query "[0].id" -o tsv)
    if (-not $existingSp) {
        Write-Host "Creating new service principal..."
        az ad sp create --id $appId
    } else {
        Write-Host "Service principal already exists..."
    }
    
    # Assign contributor role
    Write-Host "Assigning Contributor role..."
    $scope = "/subscriptions/$subscriptionId"
    az role assignment create `
        --role Contributor `
        --assignee $appId `
        --scope $scope
    
    # Configure federated credentials for GitHub Actions
    Write-Host "Configuring federated credentials..."
    
    # Get repository info from git config
    $remoteUrl = git config --get remote.origin.url
    if ($remoteUrl -match 'github\.com[:/]([^/]+)/([^/.]+)(\.git)?$') {
        $orgName = $matches[1]
        $repoName = $matches[2]
        $fullRepoName = "$orgName/$repoName"
    } else {
        Write-Error "Could not parse GitHub repository from git remote URL"
        exit 1
    }
    
    $fedCredName = "github-federated-$appType"
    
    $fedCred = @{
        name = $fedCredName
        issuer = "https://token.actions.githubusercontent.com"
        subject = "repo:$fullRepoName:ref:refs/heads/main"
        audiences = @("api://AzureADTokenExchange")
    }
    
    $fedCredJson = $fedCred | ConvertTo-Json
    $fedCredFile = "fedcred-$appType.json"
    $fedCredJson | Out-File $fedCredFile
    
    # Try to create federated credential, ignore if it already exists
    $fedCredResult = az ad app federated-credential create `
        --id $appId `
        --parameters "@$fedCredFile" 2>&1

    if ($LASTEXITCODE -ne 0) {
        if ($fedCredResult -like "*FederatedIdentityCredential with name $fedCredName already exists*") {
            Write-Host "Federated credential already exists, continuing..."
            $LASTEXITCODE = 0  # Reset error code since this is not a fatal error
        } else {
            Write-Error "Failed to create federated credential: $fedCredResult"
            exit 1
        }
    }
    
    Remove-Item $fedCredFile
    
    # Output important values
    Write-Host "`nImportant values for $appType app:"
    Write-Host "Client ID: $appId"
    Write-Host "Subscription ID: $subscriptionId"
    Write-Host "Resource Group: $rgName"
    Write-Host "App Service Plan: $planName"
    Write-Host "Web App Name: $appName"
}

# Create frontend resources
Write-Host "`n=== Creating Frontend Resources ===`n"
Create-AppResources `
    -subscriptionId $frontendSubscriptionId `
    -location $frontendLocation `
    -appType "frontend" `
    -appName "buddy-chat-app"

# Create backend resources
Write-Host "`n=== Creating Backend Resources ===`n"
Create-AppResources `
    -subscriptionId $backendSubscriptionId `
    -location $backendLocation `
    -appType "backend" `
    -appName "chat-functions-prod"

Write-Host "`nResource creation complete!"
Write-Host "Please update your GitHub repository secrets with the new Client IDs and Subscription IDs"
Write-Host "Required secrets:"
Write-Host "- AZURE_FRONTEND_CLIENT_ID"
Write-Host "- AZURE_FRONTEND_SUBSCRIPTION_ID"
Write-Host "- AZURE_BACKEND_CLIENT_ID"
Write-Host "- AZURE_BACKEND_SUBSCRIPTION_ID"
Write-Host "- AZURE_TENANT_ID (remains the same)"
