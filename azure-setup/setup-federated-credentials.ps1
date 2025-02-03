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

# Login to Azure
Write-Host "Logging into Azure..."
az login --tenant $TenantId

# Function to create federated credential
function Set-FederatedCredential {
    param(
        [string]$ClientId,
        [string]$CredentialName,
        [string]$Subject
    )
    
    Write-Host "Creating federated credential '$CredentialName' for app '$ClientId'..."
    
    $credential = @{
        name = $CredentialName
        issuer = "https://token.actions.githubusercontent.com"
        subject = $Subject
        audiences = @("api://AzureADTokenExchange")
        description = "GitHub Actions federated credential for $CredentialName"
    }
    
    $credentialJson = $credential | ConvertTo-Json -Compress
    
    # Create the federated credential
    az ad app federated-credential create `
        --id $ClientId `
        --parameters $credentialJson
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully created federated credential '$CredentialName'"
    } else {
        Write-Error "Failed to create federated credential '$CredentialName'"
        exit 1
    }
}

# Set up backend credentials
$backendSubjects = @(
    "repo:$RepoOwner/$RepoName:ref:refs/heads/main",
    "repo:$RepoOwner/$RepoName:environment:production"
)

foreach ($subject in $backendSubjects) {
    $name = if ($subject.Contains("environment")) { "prod-environment" } else { "main-branch" }
    Set-FederatedCredential -ClientId $BackendClientId -CredentialName "backend-$name" -Subject $subject
}

# Set up frontend credentials
$frontendSubjects = @(
    "repo:$RepoOwner/$RepoName:ref:refs/heads/main",
    "repo:$RepoOwner/$RepoName:environment:production"
)

foreach ($subject in $frontendSubjects) {
    $name = if ($subject.Contains("environment")) { "prod-environment" } else { "main-branch" }
    Set-FederatedCredential -ClientId $FrontendClientId -CredentialName "frontend-$name" -Subject $subject
}

Write-Host "`nFederated credentials setup complete!"
Write-Host "Please ensure the following permissions are granted to the app registrations:"
Write-Host "Backend app ($BackendClientId):"
Write-Host "- Azure Functions: User_Impersonation"
Write-Host "Frontend app ($FrontendClientId):"
Write-Host "- Azure Web Sites: User_Impersonation"
