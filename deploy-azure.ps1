# Azure deployment script for Buddy Chat

# Check if Azure CLI is installed
if (!(Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if logged in to Azure
$account = az account show | ConvertFrom-Json
if (!$account) {
    Write-Host "Please log in to Azure..."
    az login
}

# Get or create resource group
$resourceGroup = $env:AZURE_RESOURCE_GROUP
if (!$resourceGroup) {
    $resourceGroup = "buddy-chat-rg"
    Write-Host "Creating resource group: $resourceGroup"
    az group create --name $resourceGroup --location australiaeast
}

# Get or create App Service Plan
$appPlan = $env:AZURE_APP_PLAN
if (!$appPlan) {
    $appPlan = "buddy-chat-plan"
    Write-Host "Creating App Service Plan: $appPlan"
    az appservice plan create --name $appPlan --resource-group $resourceGroup --sku FREE --is-linux
}

# Get or create Web App
$webAppName = $env:AZURE_WEBAPP_NAME
if (!$webAppName) {
    $webAppName = "buddy-chat-" + (Get-Random -Maximum 999999)
    Write-Host "Creating Web App: $webAppName"
    az webapp create --name $webAppName --resource-group $resourceGroup --plan $appPlan --runtime "NODE|18-lts"
}

# Enable WebSocket support
Write-Host "Enabling WebSocket support..."
az webapp config set --name $webAppName --resource-group $resourceGroup --web-sockets-enabled true

# Set environment variables
Write-Host "Setting environment variables..."
az webapp config appsettings set --name $webAppName --resource-group $resourceGroup --settings `
    NODE_ENV=production `
    COSMOS_DB_CONNECTION_STRING=$env:COSMOS_DB_CONNECTION_STRING `
    REDIS_CONNECTION_STRING=$env:REDIS_CONNECTION_STRING

# Build and deploy
Write-Host "Building application..."
npm run azure:predeploy

Write-Host "Deploying to Azure..."
npm run azure:deploy

Write-Host "Deployment complete! Your app is available at: https://$webAppName.azurewebsites.net"
