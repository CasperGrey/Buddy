# Script to set up federated credentials for GitHub Actions

param(
    [Parameter(Mandatory=$true)]
    [string]$TenantId,
    
    [Parameter(Mandatory=$true)]
    [string]$BackendClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$FrontendClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoOwner,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoName
)

# Function to create federated credential
function Set-FederatedCredential {
    param(
        [string]$ClientId,
        [string]$CredentialName,
        [string]$Subject
    )
    
    Write-Host "Checking/creating federated credential '$CredentialName' for app '$ClientId'..."
    
    # Check if credential already exists
    $existingCred = az ad app federated-credential list --id $ClientId --query "[?name=='$CredentialName']" | ConvertFrom-Json
    
    if ($existingCred) {
        Write-Host "Federated credential '$CredentialName' already exists"
        return
    }
    
    # Create new credential
    $credential = @{
        name = $CredentialName
        issuer = "https://token.actions.githubusercontent.com"
        subject = $Subject
        audiences = @("api://AzureADTokenExchange")
        description = "GitHub Actions federated credential for $CredentialName"
    }
    
    # Create a temporary file for the JSON
    $tempFile = [System.IO.Path]::GetTempFileName()
    $credential | ConvertTo-Json | Set-Content $tempFile -Encoding UTF8
    
    # Create the federated credential using the file
    $result = az ad app federated-credential create `
        --id $ClientId `
        --parameters "@$tempFile"
    
    # Clean up temp file
    Remove-Item $tempFile -Force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully created federated credential '$CredentialName'"
    } else {
        Write-Error "Failed to create federated credential '$CredentialName'"
        exit 1
    }
}

# Function to clean up existing credentials
function Remove-ExistingCredentials {
    param(
        [string]$ClientId,
        [string]$AppPrefix
    )
    
    Write-Host "`nChecking for existing $AppPrefix credentials..."
    $existingCreds = az ad app federated-credential list --id $ClientId | ConvertFrom-Json
    
    foreach ($cred in $existingCreds) {
        Write-Host "Found credential: $($cred.name) with subject: $($cred.subject)"
        Write-Host "Removing to ensure clean setup..."
        az ad app federated-credential delete --id $ClientId --federated-credential-id $cred.name
    }
}

# Function to set up app credentials
function Set-AppCredentials {
    param(
        [string]$ClientId,
        [string]$AppPrefix
    )
    
    Write-Host "`nSetting up $AppPrefix credentials..."
    
    # Clean up any existing credentials first
    Remove-ExistingCredentials -ClientId $ClientId -AppPrefix $AppPrefix
    
    # Main branch deployment - ensure exact format
    $mainSubject = "repo:$($RepoOwner)/$($RepoName):ref:refs/heads/main"
    
    Write-Host "Creating credential with subject: $mainSubject"
    Write-Host "This must match GitHub's OIDC token claim exactly"
    Set-FederatedCredential `
        -ClientId $ClientId `
        -CredentialName "$AppPrefix-branch-main" `
        -Subject $mainSubject
    
    Write-Host "Created credential for main branch with exact format: $mainSubject"
    Write-Host "Verify this matches: repo:org/repo:ref:refs/heads/main"
}

# Set up backend credentials
Set-AppCredentials -ClientId $BackendClientId -AppPrefix "backend"

# Set up frontend credentials
Set-AppCredentials -ClientId $FrontendClientId -AppPrefix "frontend"

Write-Host "`nFederated credentials setup complete!"
Write-Host "Verify the following:"
Write-Host "1. Permissions are granted to the app registrations:"
Write-Host "   Backend app ($BackendClientId):"
Write-Host "   - Azure Functions: User_Impersonation"
Write-Host "   Frontend app ($FrontendClientId):"
Write-Host "   - Azure Web Sites: User_Impersonation"
Write-Host "2. Credential subjects match exactly:"
Write-Host "   - Format: repo:org/repo:ref:refs/heads/main"
Write-Host "   - Example: repo:$($RepoOwner)/$($RepoName):ref:refs/heads/main"
Write-Host "3. No extra credentials exist that might conflict"
