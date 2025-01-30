# Buddy Chat

A real-time chat application with Azure backend integration.

## Project Structure

```
buddy-chat/
├── src/                  # Frontend code
│   ├── components/       # React components
│   ├── lib/             # Core functionality
│   │   ├── services/    # Service layer
│   │   ├── store/       # Redux store
│   │   └── hooks/       # Custom hooks
└── server/              # Backend code
    ├── config/          # Azure configuration
    ├── websocket/       # WebSocket handlers
    └── middleware/      # Auth middleware
```

## Features

- Real-time chat using WebSocket
- Azure services integration (Cosmos DB, Redis)
- Auth0 authentication
- Redux state management
- Message persistence and caching

## Setup

### Development

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:

Create a `.env` file with:
```
# Auth0
AUTH0_DOMAIN=your-auth0-domain
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_AUDIENCE=your-auth0-audience

# Azure
KEY_VAULT_URL=your-key-vault-url
COSMOS_DB_CONNECTION_STRING=your-cosmos-connection
REDIS_CONNECTION_STRING=your-redis-connection

# Server
PORT=3001
```

3. Start the development server:
```bash
npm start
```

This will concurrently run:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Production Deployment

The application automatically deploys to Azure App Service using GitHub Actions when you push to the main branch.

1. Configure GitHub Secrets:
   Add the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

   ```
   AZURE_CREDENTIALS - Service principal credentials for Azure authentication
   Important: Add this as a single line JSON string without any line breaks:
   {"clientId":"<your-client-id>","clientSecret":"<your-client-secret>","subscriptionId":"<your-subscription-id>","tenantId":"<your-tenant-id>","activeDirectoryEndpointUrl":"https://login.microsoftonline.com","resourceManagerEndpointUrl":"https://management.azure.com/","activeDirectoryGraphResourceId":"https://graph.windows.net/","sqlManagementEndpointUrl":"https://management.core.windows.net:8443/","galleryEndpointUrl":"https://gallery.azure.com/","managementEndpointUrl":"https://management.core.windows.net/"}

   AZURE_WEBAPP_NAME - Name of your Azure Web App
   Example: buddy-chat-app

   AZURE_WEBAPP_PUBLISH_PROFILE - Web App publish profile
   Get this from: Azure Portal → Web App → Overview → Get publish profile

   COSMOS_DB_CONNECTION_STRING - MongoDB connection string for Cosmos DB
   Get this from: Azure Portal → Cosmos DB → Connection Strings

   REDIS_CONNECTION_STRING - Connection string for Azure Cache for Redis
   Format: hostname:port,password=xxx,ssl=True,abortConnect=False
   Get this from: Azure Portal → Redis Cache → Access keys
   ```

2. Deploy:
   - Push to the main branch to trigger automatic deployment
   - Or manually trigger the workflow in GitHub Actions

The GitHub Actions workflow will:
- Login to Azure using service principal
- Build the application
- Deploy to Azure App Service
- Configure environment variables

Your application will be available at `https://your-app-name.azurewebsites.net`

Note: Azure App Service Free tier includes:
- 1GB storage
- Shared CPU
- 60 minutes/day compute
- Free SSL certificate
- WebSocket support
- Automatic deployments from GitHub

## Development

### Frontend

The frontend uses React with TypeScript and includes:
- WebSocket-based chat service
- Redux for state management
- Material-UI components
- Auth0 integration

### Backend

The backend includes:
- Express server with WebSocket support
- Azure services integration
- Auth0 validation middleware
- Message persistence in Cosmos DB
- Message caching in Redis

## API

### WebSocket Events

#### Client -> Server
- `SEND_MESSAGE`: Send a new chat message
  ```typescript
  {
    type: 'SEND_MESSAGE',
    payload: {
      messages: Array<{role: string, content: string}>,
      model: string,
      systemPrompt?: string
    }
  }
  ```

#### Server -> Client
- `MESSAGE_RESPONSE`: Successful message response
  ```typescript
  {
    type: 'MESSAGE_RESPONSE',
    content: string,
    conversationId: string
  }
  ```
- `ERROR`: Error response
  ```typescript
  {
    type: 'ERROR',
    error: string
  }
  ```

## Architecture Changes

Recent updates include:
- Migrated to WebSocket-based communication
- Added Azure services integration
- Implemented real-time message handling
- Added server-side persistence
- Enhanced error handling and reconnection logic
