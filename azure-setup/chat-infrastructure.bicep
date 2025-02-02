@description('The location for all resources.')
param location string = resourceGroup().location

@description('The name prefix for all resources.')
param prefix string = 'chat'

@description('The environment (dev, prod, etc.)')
param environment string = 'prod'

// Variables for resource naming
var functionAppName = '${prefix}-functions-${environment}'
var eventGridTopicName = '${prefix}-events-${environment}'
var cosmosAccountName = '${prefix}-cosmos-${environment}'
var redisName = '${prefix}-cache-${environment}-${uniqueString(resourceGroup().id)}'
var appInsightsName = '${prefix}-insights-${environment}'
var storageAccountName = take('${prefix}stor${environment}${uniqueString(resourceGroup().id)}', 24)
var hostingPlanName = '${prefix}-plan-${environment}'

// Storage Account for Function App
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Hosting Plan (Consumption)
resource hostingPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: hostingPlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet'
        }
        {
          name: 'CosmosDbConnectionString'
          value: cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
        }
        {
          name: 'EventGridEndpoint'
          value: eventGridTopic.properties.endpoint
        }
        {
          name: 'EventGridKey'
          value: eventGridTopic.listKeys().key1
        }
      ]
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
    }
    httpsOnly: true
  }
}

// Event Grid Topic
resource eventGridTopic 'Microsoft.EventGrid/topics@2023-12-15-preview' = {
  name: eventGridTopicName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    inputSchema: 'EventGridSchema'
    publicNetworkAccess: 'Enabled'
  }
}

// Cosmos DB Account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-09-15' = {
  name: cosmosAccountName
  location: location
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    enableFreeTier: true
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-09-15' = {
  parent: cosmosAccount
  name: 'chat-app'
  properties: {
    resource: {
      id: 'chat-app'
    }
  }
}

// Cosmos DB Containers
resource conversationsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-09-15' = {
  parent: cosmosDatabase
  name: 'conversations'
  properties: {
    resource: {
      id: 'conversations'
      partitionKey: {
        paths: ['/id']
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
      }
    }
  }
}

resource messagesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-09-15' = {
  parent: cosmosDatabase
  name: 'messages'
  properties: {
    resource: {
      id: 'messages'
      partitionKey: {
        paths: ['/conversationId']
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
      }
    }
  }
}

// Redis Cache
resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: redisName
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// Outputs
output functionAppName string = functionApp.name
output eventGridTopicEndpoint string = eventGridTopic.properties.endpoint
output cosmosAccountName string = cosmosAccount.name
output redisHostName string = redis.properties.hostName
output appInsightsKey string = appInsights.properties.InstrumentationKey
