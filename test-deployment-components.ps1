param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$FunctionAppName
)

Write-Host "Testing essential deployment components..."

# Check function app status
$functionApp = az functionapp show `
    --name $FunctionAppName `
    --resource-group $ResourceGroup `
    --query "{state:state}" -o json | ConvertFrom-Json

if (-not $functionApp -or $functionApp.state -ne "Running") {
    Write-Error "Function app is not running"
    exit 1
}

# Get function key
$key = az functionapp keys list `
    --name $FunctionAppName `
    --resource-group $ResourceGroup `
    --query "functionKeys.default" -o tsv

if (-not $key) {
    Write-Error "Could not retrieve function key"
    exit 1
}

# Test GraphQL endpoint
$httpUrl = "https://$FunctionAppName.azurewebsites.net/api/graphql"
$query = '{"query":"query{__schema{types{name}}}"}'

try {
    $response = Invoke-RestMethod `
        -Uri $httpUrl `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "x-functions-key" = $key
        } `
        -Body $query `
        -ErrorAction Stop

    if (-not $response.data.__schema.types) {
        Write-Error "GraphQL endpoint not responding correctly"
        exit 1
    }
} catch {
    Write-Error "GraphQL endpoint test failed: $_"
    exit 1
}

Write-Host "Essential deployment components validated successfully"
exit 0
