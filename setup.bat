@echo off
setlocal enabledelayedexpansion

echo Checking prerequisites...

REM Check if Azure CLI is installed
where az >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Azure CLI...
    winget install -e --id Microsoft.AzureCLI
    if %errorlevel% neq 0 (
        echo Failed to install Azure CLI
        exit /b 1
    )
)

REM Check if Git is installed and repository is initialized
git rev-parse --git-dir >nul 2>nul
if %errorlevel% neq 0 (
    echo This directory is not a git repository
    exit /b 1
)

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Node.js...
    winget install -e --id OpenJS.NodeJS.LTS
    if %errorlevel% neq 0 (
        echo Failed to install Node.js
        exit /b 1
    )
)

REM Login to Azure if not already logged in
az account show >nul 2>nul
if %errorlevel% neq 0 (
    echo Please log in to Azure...
    az login
    if %errorlevel% neq 0 (
        echo Failed to log in to Azure
        exit /b 1
    )
)

REM Get list of subscriptions
echo.
echo Available Azure subscriptions:
az account list --query "[].{Name:name, SubscriptionId:id}" -o table
echo.

REM Get subscription IDs from user
set /p FRONTEND_SUB_ID="Enter subscription ID for frontend app: "
set /p BACKEND_SUB_ID="Enter subscription ID for backend app: "

REM Validate subscription IDs
az account show --subscription %FRONTEND_SUB_ID% >nul 2>nul
if %errorlevel% neq 0 (
    echo Invalid frontend subscription ID
    exit /b 1
)

az account show --subscription %BACKEND_SUB_ID% >nul 2>nul
if %errorlevel% neq 0 (
    echo Invalid backend subscription ID
    exit /b 1
)

REM Get GitHub PAT
set /p GH_PAT="Enter GitHub Personal Access Token (with repo and workflow permissions): "

REM Create Azure resources for both apps
echo.
echo Creating Azure resources...
powershell -ExecutionPolicy Bypass -File azure-setup\split-apps.ps1 -frontendSubscriptionId %FRONTEND_SUB_ID% -backendSubscriptionId %BACKEND_SUB_ID% -frontendLocation "australiaeast" -backendLocation "australiaeast"
if %errorlevel% neq 0 (
    echo Failed to create Azure resources
    exit /b 1
)

REM Get the output values from split-apps.ps1 (stored in environment variables)
echo Setting up authentication...

REM Set environment variables for setup-azure-auth.js
set GITHUB_TOKEN=%GH_PAT%
set AZURE_FRONTEND_CLIENT_ID=%FRONTEND_CLIENT_ID%
set AZURE_FRONTEND_SUBSCRIPTION_ID=%FRONTEND_SUB_ID%
set AZURE_BACKEND_CLIENT_ID=%BACKEND_CLIENT_ID%
set AZURE_BACKEND_SUBSCRIPTION_ID=%BACKEND_SUB_ID%
set AZURE_TENANT_ID=%TENANT_ID%

REM Install dependencies for setup-azure-auth.js
echo Installing dependencies...
call npm install @octokit/rest @azure/identity @azure/arm-resources node-fetch sodium-native

REM Run setup-azure-auth.js
echo Setting up GitHub Actions authentication...
node setup-azure-auth.js
if %errorlevel% neq 0 (
    echo Failed to set up GitHub Actions authentication
    exit /b 1
)

REM Set up GraphQL schema deployment
echo Setting up GraphQL schema deployment...
powershell -ExecutionPolicy Bypass -Command "
# Export GraphQL schema
dotnet tool install --global StrawberryShake.Tools
dotnet graphql download schema -n BuddySchema -f api/ChatFunctions/Schema/schema.graphql http://localhost:7071/api/graphql
"

REM Create GitHub Environments and Secrets
echo Creating GitHub Environments and configuring secrets...
powershell -ExecutionPolicy Bypass -Command "
try {
    $headers = @{
        'Authorization' = 'token %GH_PAT%'
        'Accept' = 'application/vnd.github.v3+json'
    }
    
    # Get repository info from git config
    $remoteUrl = git config --get remote.origin.url
    $repoInfo = $remoteUrl -match 'github\.com[:/]([^/]+)/([^/.]+)(\.git)?$'
    if (-not $repoInfo) {
        throw 'Could not parse GitHub repository from git remote URL'
    }
    $owner = $matches[1]
    $repo = $matches[2]
    
    # Create production environment
    $prodEnvUrl = 'https://api.github.com/repos/$owner/$repo/environments/production'
    $prodEnvBody = @{
        deployment_branch_policy = @{
            protected_branches = $true
            custom_branch_policies = $false
        }
    }
    Invoke-RestMethod -Uri $prodEnvUrl -Method PUT -Headers $headers -Body ($prodEnvBody | ConvertTo-Json)
    
    # Add GraphQL-specific secrets
    $graphqlEndpoint = "https://$functionAppName.azurewebsites.net/api/graphql"
    $secretsToAdd = @{
        'GRAPHQL_ENDPOINT' = $graphqlEndpoint
        'GRAPHQL_SCHEMA_PATH' = './api/ChatFunctions/Schema/schema.graphql'
    }

    foreach ($secret in $secretsToAdd.GetEnumerator()) {
        $secretUrl = "https://api.github.com/repos/$owner/$repo/environments/production/secrets/$($secret.Key)"
        $secretValue = $secret.Value
        
        $secretBody = @{
            encrypted_value = $secretValue
            key_id = $keyId
        }
        
        Invoke-RestMethod -Uri $secretUrl -Method PUT -Headers $headers -Body ($secretBody | ConvertTo-Json)
    }

    Write-Host 'GitHub Environments and secrets created successfully'
} catch {
    Write-Host 'Failed to create GitHub Environments and secrets: $_'
    exit 1
}"

echo.
echo Setup completed successfully! The deployment workflows are now configured with GraphQL support.
echo.
echo Additional configuration:
echo 1. The GraphQL endpoint is configured at: https://%functionAppName%.azurewebsites.net/api/graphql
echo 2. GraphQL schema has been exported to: api/ChatFunctions/Schema/schema.graphql
echo.
echo Next steps:
echo 1. Push your changes to GitHub
echo 2. The workflows will automatically deploy both apps to their respective environments
echo 3. Monitor the deployment status in GitHub Actions
echo.
pause
