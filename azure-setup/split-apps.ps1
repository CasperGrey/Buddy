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
    
    # Create resource group
    Write-Host "Creating resource group..."
    az group create --name $rgName --location $location
    
    # Create App Service Plan (F1 tier)
    Write-Host "Creating App Service Plan..."
    az appservice plan create `
        --name $planName `
        --resource-group $rgName `
        --sku F1 `
        --is-linux false
    
    # Create Web App
    Write-Host "Creating Web App..."
    az webapp create `
        --name $appName `
        --resource-group $rgName `
        --plan $planName `
        --runtime "NODE:18-lts"
    
    # Configure Web App settings
    Write-Host "Configuring Web App settings..."
    az webapp config set `
        --name $appName `
        --resource-group $rgName `
        --use-32bit-worker-process true `
        --web-sockets-enabled true `
        --http20-enabled true
    
    # Create Azure AD app registration
    Write-Host "Creating Azure AD app registration..."
    $appId = $(az ad app create --display-name "buddy-chat-$appType-github" --query appId -o tsv)
    
    # Create service principal
    Write-Host "Creating service principal..."
    az ad sp create --id $appId
    
    # Assign contributor role
    Write-Host "Assigning Contributor role..."
    $scope = "/subscriptions/$subscriptionId"
    az role assignment create `
        --role Contributor `
        --assignee $appId `
        --scope $scope
    
    # Configure federated credentials for GitHub Actions
    Write-Host "Configuring federated credentials..."
    $repoName = "your-org/buddy-chat"  # Replace with your actual repo name
    $fedCredName = "github-federated-$appType"
    
    $fedCred = @{
        name = $fedCredName
        issuer = "https://token.actions.githubusercontent.com"
        subject = "repo:$repoName:ref:refs/heads/main"
        audiences = @("api://AzureADTokenExchange")
    }
    
    $fedCredJson = $fedCred | ConvertTo-Json
    $fedCredFile = "fedcred-$appType.json"
    $fedCredJson | Out-File $fedCredFile
    
    az ad app federated-credential create `
        --id $appId `
        --parameters "@$fedCredFile"
    
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
    -appName "chat-app-backend-123"

Write-Host "`nResource creation complete!"
Write-Host "Please update your GitHub repository secrets with the new Client IDs and Subscription IDs"
Write-Host "Required secrets:"
Write-Host "- AZURE_FRONTEND_CLIENT_ID"
Write-Host "- AZURE_FRONTEND_SUBSCRIPTION_ID"
Write-Host "- AZURE_BACKEND_CLIENT_ID"
Write-Host "- AZURE_BACKEND_SUBSCRIPTION_ID"
Write-Host "- AZURE_TENANT_ID (remains the same)"
