# Buddy Chat

A real-time chat application with Azure backend integration.

## Project Structure

```
buddy-chat/
├── .github/workflows/      # GitHub Actions workflows
│   └── azure-deploy-optimized.yml   # Production deployment
├── api/                  # Backend API
│   ├── ChatFunctions/   # Azure Functions backend
│   │   ├── Functions/   # Function endpoints
│   │   ├── Schema/      # GraphQL schema
│   │   └── Services/    # Backend services
├── azure-setup/         # Azure infrastructure and setup
│   ├── chat-infrastructure.bicep  # Azure resource templates
│   ├── cleanup.ps1      # Migration cleanup script
│   └── split-apps.ps1   # App separation script
├── public/              # Static assets
└── src/                 # Frontend code
    ├── components/      # React components
    │   ├── chat/       # Chat interface components
    │   ├── providers/  # Context providers
    │   ├── settings/   # Settings components
    │   ├── sidebar/    # Sidebar components
    │   └── user/       # User-related components
    ├── lib/            # Core functionality
    │   ├── api/        # API integrations
    │   ├── auth/       # Authentication
    │   ├── hooks/      # Custom hooks
    │   ├── store/      # Redux store and slices
    │   ├── theme/      # Theme configuration
    │   └── utils/      # Utility functions
    └── styles/         # Global styles
```

## Features

- Event-driven architecture using:
  - Azure Functions (Serverless)
  - Event Grid (Event Management)
  - HotChocolate (GraphQL Server)
  - Strawberry Shake (Type-safe Client)
- Multiple AI model integrations:
  - Anthropic Claude
  - DeepSeek
  - OpenAI
- Azure services integration:
  - Cosmos DB (Data Storage)
  - Event Grid (Real-time Events)
- Auth0 authentication
- Redux state management with encrypted persistence
- Message persistence and caching
- Automated Azure setup and deployment
- Tailwind CSS for styling

## Architecture

### Backend Components

1. GraphQL API (Azure Functions):
   - Query and mutation endpoints
   - Type-safe schema
   - Efficient data fetching
   - Optimized resolvers

2. Event Grid Integration:
   - Real-time message delivery
   - Event-driven updates
   - Scalable event handling
   - Reliable message delivery

3. Cosmos DB:
   - Message persistence
   - Conversation storage
   - Efficient querying
   - Scalable data storage

### Frontend Components

1. GraphQL Client:
   - Type-safe queries
   - Optimized data fetching
   - Automatic code generation
   - Real-time updates

2. Event Grid Client:
   - Real-time message reception
   - Event subscription handling
   - Automatic reconnection
   - Event filtering

## Setup

### Prerequisites

- Node.js 18.x or later
- .NET 8.0 SDK
- Azure Functions Core Tools v4
- Git
- GitHub account with repository access
- Azure subscription (F1 Free tier supported)
- Azure AD permissions:
  - Directory.ReadWrite.All
  - Application.ReadWrite.All
- Windows (for automated setup) or manual Azure CLI setup

### Development Environment

1. Install dependencies:
```bash
npm install
cd api/ChatFunctions && dotnet restore
```

2. Configure environment variables:

Frontend (.env.development):
```
# Function App URL for local development
REACT_APP_FUNCTION_APP_URL=http://localhost:7071

# Auth0 settings
REACT_APP_AUTH0_DOMAIN=your-auth0-domain
REACT_APP_AUTH0_CLIENT_ID=your-auth0-client-id
REACT_APP_AUTH0_AUDIENCE=your-auth0-audience

# API settings
REACT_APP_API_URL=http://localhost:7071/api
REACT_APP_GRAPHQL_ENDPOINT=http://localhost:7071/api/graphql
```

Function App (api/ChatFunctions/local.settings.json):
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "CosmosDbConnectionString": "your-cosmos-connection",
    "EventGridEndpoint": "your-eventgrid-endpoint",
    "EventGridKey": "your-eventgrid-key"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

3. Start the development servers:

Terminal 1 (Frontend):
```bash
npm start
```

Terminal 2 (Function App):
```bash
cd api/ChatFunctions
func start
```

This will run:
- Frontend: http://localhost:3000
- Function App: http://localhost:7071

### Production Deployment

The application automatically deploys to Azure using GitHub Actions when you push to the main branch.

#### Required GitHub Secrets

After running the setup script, these secrets will be automatically configured:
- `AZURE_CLIENT_ID`: Azure AD application client ID
- `AZURE_TENANT_ID`: Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID

You'll need to manually add these additional secrets:
- `COSMOS_DB_CONNECTION_STRING`: Cosmos DB connection string
- `EVENT_GRID_ENDPOINT`: Event Grid topic endpoint
- `EVENT_GRID_KEY`: Event Grid access key

## Recent Changes

### Architecture Migration (Latest)
- ✅ Converted to event-driven GraphQL architecture
- ✅ Migrated from WebSocket to Azure Functions
- ✅ Added Event Grid for real-time updates
- ✅ Implemented HotChocolate GraphQL server
- ✅ Separated frontend and backend into distinct apps
- ✅ Improved error handling and logging
- ✅ Enhanced type safety with GraphQL schema
- ✅ Optimized real-time message delivery

### Infrastructure Updates
- Enhanced deployment configuration
- Improved error handling
- Added automated setup scripts
- Updated Azure resource templates
- Enhanced security configuration

### Technical Updates
- Event-driven communication
- GraphQL API implementation
- Azure Functions integration
- Real-time event handling
- Enhanced error handling
- Improved type safety
