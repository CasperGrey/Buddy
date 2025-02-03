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
    $response = Invoke-WebRequest -Uri $functionUrl -Method Post -ContentType "application/json" -Body '{"query":"{ __schema { types { name } } }"}' -UseBasicParsing
    Write-Host "Endpoint is accessible. Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
    
    Write-Host "`nAttempting to download schema..."
    # Download schema using introspection
    get-graphql-schema $functionUrl > schema.new.graphql
    
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
