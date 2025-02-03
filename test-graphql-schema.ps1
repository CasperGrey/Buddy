# Test cloud GraphQL schema
Write-Host "Testing cloud GraphQL schema functionality..."

# Get Function App details
$backendRg = "rg-chat-prod-001"
$backendApp = "chat-functions-prod"

Write-Host "Getting Function App status..."
$status = az functionapp show --name $backendApp --resource-group $backendRg --query "state" -o tsv
Write-Host "Function App status: $status"

# Install GraphQL tools
Write-Host "Installing GraphQL tools..."
npm install -g get-graphql-schema

# Test cloud endpoint
Write-Host "`nTesting cloud GraphQL endpoint..."
$functionUrl = "https://$backendApp.azurewebsites.net/api/graphql"

Write-Host "Testing endpoint: $functionUrl"
try {
    # First check if endpoint is accessible
    Write-Host "Checking endpoint accessibility..."
    $response = Invoke-WebRequest -Uri $functionUrl -Method Get -UseBasicParsing
    Write-Host "Endpoint is accessible. Status: $($response.StatusCode)"

    # Set up headers for GraphQL requests
    $headers = @{
        "Content-Type" = "application/json"
        "Accept" = "application/json"
        "x-functions-key" = $env:FUNCTION_KEY
    }

    # Check if GraphQL introspection is enabled
    Write-Host "`nChecking GraphQL endpoint..."
    $response = Invoke-WebRequest -Uri $functionUrl -Method Post -Headers $headers -Body '{"query":"query { __schema { queryType { name } } }"}' -UseBasicParsing
    $jsonResponse = $response.Content | ConvertFrom-Json
    
    if (-not ($jsonResponse.data.__schema.queryType.name)) {
        Write-Host "Error: Invalid GraphQL response"
        Write-Host "Response: $($response.Content)"
        if ($jsonResponse.errors) {
            Write-Host "GraphQL Errors:"
            $jsonResponse.errors | ForEach-Object { Write-Host $_.message }
        }
        exit 1
    }
    Write-Host "GraphQL endpoint is accessible and introspection is enabled"

    # Download full schema
    Write-Host "`nDownloading schema..."
    $response = Invoke-WebRequest -Uri $functionUrl -Method Post -Headers $headers `
        -Body '{"query":"query { __schema { types { name kind fields { name type { name kind ofType { name kind } } } } } }"}' `
        -UseBasicParsing
    $jsonResponse = $response.Content | ConvertFrom-Json
    
    if ($jsonResponse.data.__schema) {
        $jsonResponse.data.__schema | ConvertTo-Json -Depth 10 > schema.new.graphql
        Write-Host "Schema downloaded successfully"
    } else {
        Write-Host "Error: Failed to download schema"
        Write-Host "Response: $($response.Content)"
        exit 1
    }
    
    $schemaFile = "api/ChatFunctions/schema.graphql"
    if (Test-Path $schemaFile) {
        $schemaContent = Get-Content $schemaFile -Raw
        Write-Host "`nSchema content:"
        Write-Host $schemaContent
        
        if ($schemaContent -match "type Query" -and $schemaContent -match "type Mutation") {
            Write-Host "`nSchema validation successful - contains Query and Mutation types"
        } else {
            Write-Host "`nSchema validation failed - missing Query or Mutation types"
        }
    }
} catch {
    Write-Host "Error accessing endpoint: $_"
    Write-Host "Response status code: $($_.Exception.Response.StatusCode)"
    Write-Host "Response status description: $($_.Exception.Response.StatusDescription)"
}

Write-Host "`nTest complete!"
