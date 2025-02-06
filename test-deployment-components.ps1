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
    Write-Host "Checking .NET runtime version..."
    $netVersion = az functionapp config show `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --query "netFrameworkVersion" -o tsv
        
    Write-Host "Current .NET version: $netVersion"
    if ($netVersion -ne "v8.0") {
        Write-Warning "Function app is not running .NET 8.0 (required by ChatFunctions.csproj)"
    }
    
    # Check worker runtime
    Write-Host "Checking worker runtime..."
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
        "FUNCTIONS_EXTENSION_VERSION",
        "ASPNETCORE_ENVIRONMENT"
    )
    
    foreach ($setting in $requiredSettings) {
        if (-not ($settings | Where-Object { $_.name -eq $setting })) {
            Write-Error "Missing required setting: $setting"
            return $false
        }
    }
    
    # Check environment setting
    $environment = $settings | Where-Object { $_.name -eq 'ASPNETCORE_ENVIRONMENT' }
    if (-not $environment) {
        Write-Warning "ASPNETCORE_ENVIRONMENT setting not found, error details may be limited"
    } else {
        Write-Host "Environment: $($environment.value)"
        if ($environment.value -eq "Development") {
            Write-Warning "Application is running in Development mode, consider switching to Production"
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
    
    # Check CORS configuration
    Write-Host "Checking CORS configuration..."
    $corsSettings = az functionapp cors show `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --query "{allowedOrigins:allowedOrigins}" -o json | ConvertFrom-Json
        
    if ($corsSettings) {
        Write-Host "CORS settings:"
        Write-Host "Allowed Origins:"
        foreach ($origin in $corsSettings.allowedOrigins) {
            Write-Host "- $origin"
        }
        
        # Verify required origins
        $requiredOrigins = @(
            "http://localhost:3000",
            "https://buddy-chat-app.azurewebsites.net"
        )
        
        foreach ($required in $requiredOrigins) {
            if ($corsSettings.allowedOrigins -notcontains $required) {
                Write-Warning "Missing required CORS origin: $required"
            }
        }

        # Check CORS headers
        Write-Host "Checking CORS headers..."
        $corsHeaders = az functionapp cors show `
            --name $FunctionAppName `
            --resource-group $ResourceGroup `
            --query "allowedHeaders" -o json | ConvertFrom-Json

        if ($corsHeaders) {
            Write-Host "Allowed Headers:"
            foreach ($header in $corsHeaders) {
                Write-Host "- $header"
            }

            # Verify required headers
            $requiredHeaders = @(
                "x-functions-key",
                "Content-Type",
                "Authorization",
                "Upgrade",
                "Connection",
                "Sec-WebSocket-Version",
                "Sec-WebSocket-Key",
                "Sec-WebSocket-Protocol"
            )

            foreach ($required in $requiredHeaders) {
                if ($corsHeaders -notcontains $required) {
                    Write-Warning "Missing required CORS header: $required"
                }
            }
        } else {
            Write-Warning "Could not retrieve CORS headers"
        }
    } else {
        Write-Warning "Could not retrieve CORS settings"
    }
    
    # Get function key
    $key = az functionapp keys list `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --query "functionKeys.default" -o tsv
    
    if (-not $key) {
        Write-Error "Could not retrieve function key"
        return $false
    }
    
    # Test HTTP endpoint with introspection query
    $httpUrl = "https://$FunctionAppName.azurewebsites.net/api/graphql"
    $wsUrl = "https://$FunctionAppName.azurewebsites.net/api/graphql-ws"
    $query = '{"query":"query{__schema{types{name}}}"}'
    
    Write-Host "Testing HTTP endpoint: $httpUrl"
    
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
        
        if ($response.data.__schema.types) {
            Write-Host "GraphQL schema introspection successful"
            
            # Verify required types exist
            $requiredTypes = @(
                "Query",
                "Mutation",
                "Subscription",
                "Message",
                "Conversation",
                "MessageInput",
                "AIModel",
                "ChatError",
                "ModelCapability",
                "SendMessageInput"
            )
            
            $types = $response.data.__schema.types | ForEach-Object { $_.name }
            Write-Host "Found types:"
            foreach ($type in $types) {
                Write-Host "- $type"
            }
            
            foreach ($required in $requiredTypes) {
                if ($types -notcontains $required) {
                    Write-Warning "Missing required GraphQL type: $required"
                    return $false
                }
            }
            
            Write-Host "All required GraphQL types found"
            
            # Verify ModelCapability fields
            Write-Host "Verifying ModelCapability fields..."
            $modelCapabilityQuery = '{"query":"query{__type(name:\"ModelCapability\"){fields{name type{name kind ofType{name}}}}}"}'
            $modelCapabilityResponse = Invoke-RestMethod `
                -Uri $httpUrl `
                -Method Post `
                -Headers @{
                    "Content-Type" = "application/json"
                    "x-functions-key" = $key
                } `
                -Body $modelCapabilityQuery `
                -ErrorAction Stop
                
            if ($modelCapabilityResponse.data.__type.fields) {
                $fields = $modelCapabilityResponse.data.__type.fields
                Write-Host "Found ModelCapability fields:"
                foreach ($field in $fields) {
                    Write-Host "- $($field.name)"
                }
                
                $requiredFields = @(
                    "name",
                    "capabilities",
                    "maxTokens"
                )
                
                foreach ($required in $requiredFields) {
                    if (-not ($fields | Where-Object { $_.name -eq $required })) {
                        Write-Warning "Missing required ModelCapability field: $required"
                        return $false
                    }
                }
                
                Write-Host "All required ModelCapability fields found"
            } else {
                Write-Warning "Could not retrieve ModelCapability fields"
                return $false
            }
            
            # Verify subscription fields
            Write-Host "Verifying subscription fields..."
            $subscriptionQuery = '{"query":"query{__type(name:\"Subscription\"){fields{name type{name kind ofType{name}}}}}"}'
            $subscriptionResponse = Invoke-RestMethod `
                -Uri $httpUrl `
                -Method Post `
                -Headers @{
                    "Content-Type" = "application/json"
                    "x-functions-key" = $key
                } `
                -Body $subscriptionQuery `
                -ErrorAction Stop
                
            if ($subscriptionResponse.data.__type.fields) {
                $fields = $subscriptionResponse.data.__type.fields
                Write-Host "Found subscription fields:"
                foreach ($field in $fields) {
                    Write-Host "- $($field.name)"
                }
                
                $requiredFields = @(
                    "messageReceived",
                    "onError"
                )
                
                foreach ($required in $requiredFields) {
                    if (-not ($fields | Where-Object { $_.name -eq $required })) {
                        Write-Warning "Missing required subscription field: $required"
                        return $false
                    }
                }
                
                Write-Host "All required subscription fields found"
            } else {
                Write-Warning "Could not retrieve subscription fields"
                return $false
            }
            
            # Test WebSocket endpoint
            Write-Host "Testing WebSocket endpoint: $wsUrl"
            try {
                $wsResponse = Invoke-WebRequest `
                    -Uri $wsUrl `
                    -Method Get `
                    -Headers @{
                        "Upgrade" = "websocket"
                        "Connection" = "Upgrade"
                        "Sec-WebSocket-Version" = "13"
                        "Sec-WebSocket-Key" = "dGhlIHNhbXBsZSBub25jZQ=="
                        "Sec-WebSocket-Protocol" = "graphql-ws"
                        "x-functions-key" = $key
                    } `
                    -ErrorAction Stop
                
                if ($wsResponse.StatusCode -eq 101) {
                    Write-Host "WebSocket upgrade successful"
                    return $true
                }
                
                Write-Warning "WebSocket endpoint returned unexpected status: $($wsResponse.StatusCode)"
                return $false
            }
            catch {
                Write-Warning "WebSocket endpoint test failed: $_"
                return $false
            }
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
    
    # Get app settings
    $settings = az functionapp config appsettings list `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --query "[].{name:name,value:value}" -o json | ConvertFrom-Json
    
    # Check Azure Client ID
    Write-Host "Checking Azure Client ID configuration..."
    $azureClientId = $settings | Where-Object { $_.name -eq 'AZURE_CLIENT_ID' }
    if (-not $azureClientId) {
        Write-Warning "AZURE_CLIENT_ID setting not found"
    } else {
        Write-Host "Found Azure Client ID configuration"
        if ($azureClientId.value -like "@Microsoft.KeyVault*") {
            Write-Host "Azure Client ID is configured with KeyVault reference"
        }
    }

    # Check Event Grid settings
    Write-Host "Checking Event Grid configuration..."
    $eventGridEndpoint = $settings | Where-Object { $_.name -eq 'EventGridEndpoint' }
    $eventGridKey = $settings | Where-Object { $_.name -eq 'EventGridKey' }
    
    if (-not $eventGridEndpoint) {
        Write-Warning "EventGridEndpoint setting not found"
    } else {
        Write-Host "Found Event Grid endpoint configuration"
    }
    
    if (-not $eventGridKey) {
        Write-Warning "EventGridKey setting not found"
    } else {
        Write-Host "Found Event Grid key configuration"
    }
    
    # Check Redis Cache settings
    Write-Host "Checking Redis Cache configuration..."
    $redisCache = az redis list `
        --resource-group $ResourceGroup `
        --query "[0]" -o json | ConvertFrom-Json
        
    if ($redisCache) {
        Write-Host "Found Redis Cache: $($redisCache.name)"
        Write-Host "Redis Cache status: $($redisCache.provisioningState)"
        
        # Check Redis connection string
        $redisConnectionString = $settings | Where-Object { $_.name -eq 'REDIS_CONNECTION_STRING' }
        if (-not $redisConnectionString) {
            Write-Warning "REDIS_CONNECTION_STRING setting not found"
        } else {
            Write-Host "Found Redis connection string configuration"
        }
    } else {
        Write-Warning "No Redis Cache found in resource group"
    }
    
    # Check for connection string in different formats
    $cosmosSettings = $settings | Where-Object { 
        $_.name -eq 'COSMOS_DB_CONNECTION_STRING' -or 
        $_.name -eq 'CosmosDbConnectionString' -or
        $_.name -eq 'COSMOSDB_CONNECTION_STRING' -or
        $_.name -eq 'COSMOS_CONNECTION_STRING'
    }
    
    if (-not $cosmosSettings) {
        # If not found in app settings, check if we can get it directly from Cosmos DB
        Write-Host "Connection string not found in app settings, checking Cosmos DB account..."
        $cosmosAccount = az cosmosdb list `
            --resource-group $ResourceGroup `
            --query "[0].name" -o tsv
            
        if ($cosmosAccount) {
            Write-Host "Found Cosmos DB account: $cosmosAccount"
            $connectionString = az cosmosdb keys list `
                --name $cosmosAccount `
                --resource-group $ResourceGroup `
                --type connection-strings `
                --query "connectionStrings[0].connectionString" -o tsv
                
            if ($connectionString) {
                Write-Host "Successfully retrieved Cosmos DB connection string"
                return $true
            }
        }
        
        Write-Host "Connection string not found in app settings. Supported names are:"
        Write-Host "- COSMOS_DB_CONNECTION_STRING (GitHub Actions)"
        Write-Host "- CosmosDbConnectionString (Bicep)"
        Write-Host "- COSMOSDB_CONNECTION_STRING (Legacy)"
        Write-Host "- COSMOS_CONNECTION_STRING (Key Vault)"
        Write-Error "Cosmos DB connection setting not found in app settings or direct access"
        return $false
    }
    
    foreach ($setting in $cosmosSettings) {
        # Check for KeyVault reference
        if ($setting.value -like "@Microsoft.KeyVault*") {
            Write-Host "Cosmos DB connection string is configured with KeyVault reference"
            return $true
        }
        
        # Check for direct connection string
        if ($setting.value -match "^(AccountEndpoint=https://|DefaultEndpoint=https://).*") {
            Write-Host "Cosmos DB connection string is configured directly"
            return $true
        }
    }
    
    Write-Error "Cosmos DB connection string is not properly configured"
    Write-Host "Current settings:"
    foreach ($setting in $cosmosSettings) {
        Write-Host "Name: $($setting.name), Value: $($setting.value)"
    }
    
    # Get Key Vault access info
    try {
        $keyVaultUrl = $settings | Where-Object { $_.name -eq 'KEY_VAULT_URL' }
        if ($keyVaultUrl) {
            $keyVaultName = $keyVaultUrl.value -replace 'https://(.*).vault.azure.net/', '$1'
            $keyVaultAccess = az keyvault show --name $keyVaultName 2>&1
            Write-Host "Key Vault ($keyVaultName) access check result: $keyVaultAccess"
            
            # Try to get the actual connection string from Key Vault
            foreach ($setting in $cosmosSettings) {
                if ($setting.value -like "@Microsoft.KeyVault*") {
                    $secretUri = $setting.value -replace '@Microsoft.KeyVault\(SecretUri=(.*)\)', '$1'
                    Write-Host "Attempting to access secret: $secretUri"
                    try {
                        $secretInfo = az keyvault secret show --id $secretUri 2>&1
                        Write-Host "Secret access result: $secretInfo"
                    }
                    catch {
                        Write-Warning "Could not access secret: $_"
                    }
                }
            }
        } else {
            Write-Warning "KEY_VAULT_URL setting not found"
        }
        
        # Check Cosmos DB database
        Write-Host "Checking Cosmos DB database..."
        $cosmosAccount = az cosmosdb list `
            --resource-group $ResourceGroup `
            --query "[0].name" -o tsv
            
        if ($cosmosAccount) {
            Write-Host "Found Cosmos DB account: $cosmosAccount"
            $databases = az cosmosdb sql database list `
                --account-name $cosmosAccount `
                --resource-group $ResourceGroup `
                --query "[].{id:id}" -o json | ConvertFrom-Json
                
            Write-Host "Available databases:"
            foreach ($db in $databases) {
                Write-Host "- $($db.id)"
            }
            
            # Verify database exists
            $expectedDb = "chat-app"
            if (-not ($databases | Where-Object { $_.id -eq $expectedDb })) {
                Write-Warning "Expected database '$expectedDb' not found"
            } else {
                Write-Host "Found expected database: $expectedDb"
                
                # Check containers
                Write-Host "Checking containers..."
                $containers = az cosmosdb sql container list `
                    --account-name $cosmosAccount `
                    --database-name $expectedDb `
                    --resource-group $ResourceGroup `
                    --query "[].{id:id}" -o json | ConvertFrom-Json
                    
                Write-Host "Available containers:"
                foreach ($container in $containers) {
                    Write-Host "- $($container.id)"
                }
                
                # Verify required containers
                $requiredContainers = @(
                    "messages",
                    "conversations"
                )
                
                foreach ($required in $requiredContainers) {
                    if (-not ($containers | Where-Object { $_.id -eq $required })) {
                        Write-Warning "Missing required container: $required"
                    } else {
                        Write-Host "Found required container: $required"
                    }
                }
            }
        } else {
            Write-Warning "No Cosmos DB account found in resource group"
        }
    }
    catch {
        Write-Warning "Could not check Key Vault or Cosmos DB access: $_"
    }
    
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
