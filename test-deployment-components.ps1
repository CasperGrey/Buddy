param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$FunctionAppName
)

function Test-FunctionApp {
    param (
        [string]$ResourceGroup,
        [string]$FunctionAppName
    )
    
    Write-Host "Testing Function App deployment..."
    
    # Check if function app exists
    $functionApp = az functionapp show `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --query "{state:state,defaultHostName:defaultHostName}" -o json | ConvertFrom-Json
    
    if (-not $functionApp) {
        Write-Error "Function app not found"
        return $false
    }
    
    Write-Host "Function app state: $($functionApp.state)"
    
    # Check runtime status
    $runtime = az functionapp list-runtimes `
        --os linux `
        --query "[?runtime=='dotnet-isolated']" -o json | ConvertFrom-Json
    
    if (-not $runtime) {
        Write-Error "Runtime not properly configured"
        return $false
    }
    
    # Get app settings
    $settings = az functionapp config appsettings list `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --query "[].{name:name,value:value}" -o json | ConvertFrom-Json
    
    # Verify critical settings
    $requiredSettings = @(
        "FUNCTIONS_WORKER_RUNTIME",
        "WEBSITE_RUN_FROM_PACKAGE",
        "FUNCTIONS_EXTENSION_VERSION"
    )
    
    foreach ($setting in $requiredSettings) {
        if (-not ($settings | Where-Object { $_.name -eq $setting })) {
            Write-Error "Missing required setting: $setting"
            return $false
        }
    }
    
    return $true
}

function Test-FunctionKeys {
    param (
        [string]$ResourceGroup,
        [string]$FunctionAppName
    )
    
    Write-Host "Testing Function Keys..."
    
    # Get function keys
    $keys = az functionapp keys list `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --query "functionKeys" -o json | ConvertFrom-Json
    
    if (-not $keys) {
        Write-Error "No function keys found"
        return $false
    }
    
    Write-Host "Function keys retrieved successfully"
    return $true
}

function Test-GraphQLEndpoint {
    param (
        [string]$ResourceGroup,
        [string]$FunctionAppName
    )
    
    Write-Host "Testing GraphQL endpoint..."
    
    # Get function key
    $key = az functionapp keys list `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --query "functionKeys.default" -o tsv
    
    if (-not $key) {
        Write-Error "Could not retrieve function key"
        return $false
    }
    
    # Test endpoint with introspection query
    $url = "https://$FunctionAppName.azurewebsites.net/api/graphql"
    $query = '{"query":"query{__schema{types{name}}}"}'
    
    try {
        $response = Invoke-RestMethod `
            -Uri $url `
            -Method Post `
            -Headers @{
                "Content-Type" = "application/json"
                "x-functions-key" = $key
            } `
            -Body $query `
            -ErrorAction Stop
        
        if ($response.data.__schema.types) {
            Write-Host "GraphQL schema introspection successful"
            return $true
        }
    }
    catch {
        Write-Error "GraphQL endpoint test failed: $_"
        # Get recent logs
        Write-Host "Recent function logs:"
        try {
            az webapp log tail `
                --name $FunctionAppName `
                --resource-group $ResourceGroup `
                --provider http `
                --filter Error `
                --limit 25
        }
        catch {
            Write-Warning "Could not retrieve logs: $_"
        }
        return $false
    }
    
    Write-Error "GraphQL endpoint not responding correctly"
    return $false
}

function Test-CosmosConnection {
    param (
        [string]$ResourceGroup,
        [string]$FunctionAppName
    )
    
    Write-Host "Testing Cosmos DB connection..."
    
    # Get Cosmos connection string from app settings
    $cosmosConnection = az functionapp config appsettings list `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --query "[?name=='COSMOS_DB_CONNECTION_STRING'].value" -o tsv
    
    if (-not $cosmosConnection) {
        Write-Error "Cosmos DB connection string not found in app settings"
        return $false
    }
    
    # Test if connection string is valid KeyVault reference
    if ($cosmosConnection -like "@Microsoft.KeyVault*") {
        Write-Host "Cosmos DB connection string is properly configured with KeyVault reference"
        return $true
    }
    
    Write-Error "Cosmos DB connection string is not properly configured"
    return $false
}

# Main test sequence
Write-Host "Starting deployment component tests..."

$success = $true

# Test function app deployment
if (-not (Test-FunctionApp -ResourceGroup $ResourceGroup -FunctionAppName $FunctionAppName)) {
    Write-Error "Function app validation failed"
    $success = $false
}

# Test function keys
if ($success -and -not (Test-FunctionKeys -ResourceGroup $ResourceGroup -FunctionAppName $FunctionAppName)) {
    Write-Error "Function keys validation failed"
    $success = $false
}

# Test Cosmos DB connection
if ($success -and -not (Test-CosmosConnection -ResourceGroup $ResourceGroup -FunctionAppName $FunctionAppName)) {
    Write-Error "Cosmos DB connection validation failed"
    $success = $false
}

# Test GraphQL endpoint
if ($success -and -not (Test-GraphQLEndpoint -ResourceGroup $ResourceGroup -FunctionAppName $FunctionAppName)) {
    Write-Error "GraphQL endpoint validation failed"
    $success = $false
}

if ($success) {
    Write-Host "All deployment components validated successfully"
    exit 0
} else {
    Write-Error "One or more deployment components failed validation"
    exit 1
}
