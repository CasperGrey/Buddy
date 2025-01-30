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
    subscriptionId = $subscriptionId
}
# Format credentials as compact JSON without whitespace
$jsonCreds = $credentials | ConvertTo-Json -Compress

# Get GitHub token and repository info
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
    
    # Set GH_PAT as repository secret
    Write-Host "Setting GH_PAT as repository secret..."
    try {
        $headers = @{
            Authorization = "token $githubToken"
            Accept = "application/vnd.github.v3+json"
        }

        # Get public key for secret encryption
        $keyUrl = "https://api.github.com/repos/$owner/$repo/actions/secrets/public-key"
        $publicKey = Invoke-RestMethod -Uri $keyUrl -Headers $headers

        # Create a temporary file to store the Python encryption script
        $tempScriptPath = [System.IO.Path]::GetTempFileName()
        
        # Write Python encryption script with UTF-8 encoding
        $scriptContent = @'
import sys
import base64
from nacl import encoding, public

def encrypt(public_key: str, secret_value: str) -> str:
    """Encrypt a Unicode string using the public key."""
    public_key = public.PublicKey(base64.b64decode(public_key))
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")

# Get the public key and secret from command line arguments
public_key = sys.argv[1]
secret_value = sys.argv[2]

# Encrypt and print the result
print(encrypt(public_key, secret_value))
'@
        [System.IO.File]::WriteAllText($tempScriptPath, $scriptContent, [System.Text.Encoding]::UTF8)

        # Install required Python package
        python -m pip install pynacl | Out-Null

        # Run the encryption script
        $encryptedValue = python $tempScriptPath $publicKey.key $githubToken
        Remove-Item $tempScriptPath

        # Create or update the secret
        $secretUrl = "https://api.github.com/repos/$owner/$repo/actions/secrets/GH_PAT"
        $secretBody = @{
            encrypted_value = $encryptedValue
            key_id = $publicKey.key_id
        } | ConvertTo-Json

        Invoke-RestMethod -Uri $secretUrl -Method Put -Headers $headers -Body $secretBody -ContentType "application/json"
        Write-Host "Successfully set GH_PAT secret"
    } catch {
        Write-Host "Warning: Failed to set GH_PAT secret automatically. Please set it manually in repository settings."
        Write-Host "Error: $_"
    }
    
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

permissions: write-all

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20.x'
        cache: 'npm'

    - name: Parse Azure credentials
      id: creds
      run: |
        echo '${{github.event.inputs.azure_creds}}' > creds.json
        echo "CLIENT_ID=$(jq -r .clientId creds.json)" >> $GITHUB_ENV
        echo "CLIENT_SECRET=$(jq -r .clientSecret creds.json)" >> $GITHUB_ENV
        echo "TENANT_ID=$(jq -r .tenantId creds.json)" >> $GITHUB_ENV
        echo "SUBSCRIPTION_ID=$(jq -r .subscriptionId creds.json)" >> $GITHUB_ENV
        rm creds.json

    - name: Install dependencies
      run: npm install

    - name: Check GH_PAT
      run: |
        echo "==================== DEBUG INFO ===================="
        echo "Is GH_PAT secret configured? ${{ secrets.GH_PAT != '' }}"
        echo "================================================="
        
        if [ "${{ secrets.GH_PAT }}" = "" ]; then
          echo "ERROR: GH_PAT secret is not set in repository secrets"
          echo "Please add it in Settings > Secrets and variables > Actions"
          exit 1
        fi

    - name: Run setup script
      env:
        AZURE_CLIENT_ID: ${{env.CLIENT_ID}}
        AZURE_CLIENT_SECRET: ${{env.CLIENT_SECRET}}
        AZURE_TENANT_ID: ${{env.TENANT_ID}}
        AZURE_SUBSCRIPTION_ID: ${{env.SUBSCRIPTION_ID}}
      run: |
        echo "Setting up Azure authentication..."
        node setup-azure-auth.js "${{ secrets.GH_PAT }}"
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
