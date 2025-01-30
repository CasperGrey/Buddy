# Login to Azure (this will open a browser)
az login

# Create the initial app registration
$appName = "github-actions-setup"
Write-Host "Creating app registration '$appName'..."

# Check if app already exists
Write-Host "Checking for existing app registration..."
$existingApp = az ad app list --display-name $appName | ConvertFrom-Json
if ($existingApp) {
    Write-Host "Found existing app registration, reusing it..."
    $appId = $existingApp[0].appId
    
    # Reset credentials for existing app
    Write-Host "Resetting credentials..."
    $secret = az ad app credential reset --id $appId --append | ConvertFrom-Json
    
    # Check for existing service principal
    $sp = az ad sp list --filter "appId eq '$appId'" | ConvertFrom-Json
    if (-not $sp) {
        Write-Host "Creating service principal..."
        $sp = az ad sp create --id $appId | ConvertFrom-Json
    }
} else {
    Write-Host "Creating new app registration..."
    $app = az ad app create --display-name $appName | ConvertFrom-Json
    $appId = $app.appId
    
    Write-Host "Creating service principal..."
    $sp = az ad sp create --id $appId | ConvertFrom-Json
    
    Write-Host "Creating credentials..."
    $secret = az ad app credential reset --id $appId --append | ConvertFrom-Json
}

# Get tenant ID
$tenantId = az account show --query tenantId -o tsv

# Assign Directory.ReadWrite.All permission
az ad app permission add --id $appId --api 00000003-0000-0000-c000-000000000000 --api-permissions 19dbc75e-c2e2-444c-a770-ec69d8559fc7=Role
az ad app permission grant --id $appId --api 00000003-0000-0000-c000-000000000000 --scope Directory.ReadWrite.All
az ad app permission admin-consent --id $appId

# Assign Owner role at subscription level
$subscriptionId = az account show --query id -o tsv
az role assignment create --assignee $appId --role "Owner" --scope "/subscriptions/$subscriptionId"

# Create credentials JSON
$credentials = @{
    clientId = $appId
    clientSecret = $secret.password
    tenantId = $tenantId
}
# Format credentials as compact JSON without whitespace
$jsonCreds = $credentials | ConvertTo-Json -Compress

# Get GitHub token
$githubToken = Read-Host -Prompt "Enter your GitHub personal access token"

# Get repository name from git config or environment
try {
    $remoteUrl = git config --get remote.origin.url
    if (-not $remoteUrl) {
        # Try to get from environment variable
        $remoteUrl = $env:GITHUB_REPOSITORY
        if (-not $remoteUrl) {
            throw "No git remote URL or GITHUB_REPOSITORY found"
        }
        $owner, $repo = $remoteUrl -split "/"
    }
    
    # Handle both HTTPS and SSH URLs
    if ($remoteUrl -match "github\.com[:/]([^/]+)/([^/.]+)") {
        $owner = $matches[1]
        $repo = $matches[2] -replace "\.git$", ""
    } else {
        throw "Could not parse GitHub repository from URL: $remoteUrl"
    }
    
    Write-Host "Found GitHub repository: $owner/$repo"
    
    # Create the workflow file via GitHub API
    Write-Host "Creating workflow file via GitHub API..."
    
    $workflowContent = @'
name: Setup Azure Authentication

on:
  workflow_dispatch:
    inputs:
      azure_creds:
        description: 'Azure credentials JSON'
        required: true

permissions:
  id-token: write
  contents: read
  actions: write

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
        cache: 'npm'

    - name: Parse Azure credentials
      id: creds
      run: |
        echo '${{github.event.inputs.azure_creds}}' > creds.json
        echo "CLIENT_ID=$(jq -r .clientId creds.json)" >> $GITHUB_ENV
        echo "CLIENT_SECRET=$(jq -r .clientSecret creds.json)" >> $GITHUB_ENV
        echo "TENANT_ID=$(jq -r .tenantId creds.json)" >> $GITHUB_ENV
        rm creds.json

    - name: Install dependencies
      run: npm install

    - name: Run setup script
      env:
        GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
        AZURE_CLIENT_ID: ${{env.CLIENT_ID}}
        AZURE_CLIENT_SECRET: ${{env.CLIENT_SECRET}}
        AZURE_TENANT_ID: ${{env.TENANT_ID}}
      run: node setup-azure-auth.js
'@
    # Create or update workflow file in the repository
    $headers = @{
        Authorization = "token $githubToken"
        Accept = "application/vnd.github.v3+json"
    }
    
    # Convert workflow content to base64
    $contentBytes = [System.Text.Encoding]::UTF8.GetBytes($workflowContent)
    $contentBase64 = [Convert]::ToBase64String($contentBytes)
    
    # Get the default branch
    $repoUrl = "https://api.github.com/repos/$owner/$repo"
    $repoInfo = Invoke-RestMethod -Uri $repoUrl -Headers $headers
    $defaultBranch = $repoInfo.default_branch
    
    # Get the current commit SHA
    $refUrl = "https://api.github.com/repos/$owner/$repo/git/ref/heads/$defaultBranch"
    $ref = Invoke-RestMethod -Uri $refUrl -Headers $headers
    $latestCommitSha = $ref.object.sha
    
    # Create or update the file
    $createFileUrl = "https://api.github.com/repos/$owner/$repo/contents/.github/workflows/azure-setup.yml"
    $fileBody = @{
        message = "Add Azure setup workflow"
        content = $contentBase64
        branch = $defaultBranch
        sha = $null
    }
    
    # Check if file exists
    try {
        $existingFile = Invoke-RestMethod -Uri $createFileUrl -Headers $headers
        $fileBody.sha = $existingFile.sha
    } catch {
        Write-Host "File doesn't exist, creating new file..."
    }
    
    Write-Host "Creating/updating workflow file..."
    $createResponse = Invoke-RestMethod -Uri $createFileUrl -Method Put -Headers $headers -Body ($fileBody | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Waiting for GitHub to process the new workflow..."
    Start-Sleep -Seconds 5
    
    # Get the workflow ID
    $headers = @{
        Authorization = "token $githubToken"
        Accept = "application/vnd.github.v3+json"
    }
    
    $workflowsUrl = "https://api.github.com/repos/$owner/$repo/actions/workflows"
    Write-Host "Fetching workflows..."
    $workflows = Invoke-RestMethod -Uri $workflowsUrl -Headers $headers
    $setupWorkflow = $workflows.workflows | Where-Object { $_.name -eq "Setup Azure Authentication" }
    
    if (-not $setupWorkflow) {
        throw "Failed to find workflow after creating it. Please check GitHub Actions tab."
    }
    
    # Trigger the workflow
    $dispatchUrl = "https://api.github.com/repos/$owner/$repo/actions/workflows/$($setupWorkflow.id)/dispatches"
    $body = @{
        ref = "main"
        inputs = @{
            azure_creds = $jsonCreds
        }
    } | ConvertTo-Json -Depth 10 -Compress
    
    Write-Host "Triggering GitHub workflow..."
    Invoke-RestMethod -Uri $dispatchUrl -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "Setup workflow triggered successfully. Check GitHub Actions tab for progress."
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    exit 1
}
