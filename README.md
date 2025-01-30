# Buddy Chat

A real-time chat application with Azure backend integration.

## Project Structure

```
buddy-chat/
├── .github/workflows/    # GitHub Actions workflows
│   ├── azure-deploy.yml # Production deployment
│   └── azure-setup.yml  # Azure authentication setup
├── azure-setup/         # Azure setup utilities
├── src/                 # Frontend code
│   ├── components/      # React components
│   ├── lib/            # Core functionality
│   │   ├── services/   # Service layer
│   │   ├── store/      # Redux store
│   │   └── hooks/      # Custom hooks
└── server/             # Backend code
    ├── config/         # Azure configuration
    ├── websocket/      # WebSocket handlers
    └── middleware/     # Auth middleware
```

## Features

- Real-time chat using WebSocket
- Azure services integration (Cosmos DB, Redis)
- Auth0 authentication
- Redux state management
- Message persistence and caching
- Automated Azure setup and deployment

## Setup

### Prerequisites

- Node.js 18.x or later
- Git
- GitHub account with repository access
- Azure subscription with required permissions:
  - Directory.ReadWrite.All
  - Application.ReadWrite.All
- Windows (for automated setup) or manual Azure CLI setup

### Initial Azure Setup

The project includes an automated setup process for Azure authentication and GitHub Actions configuration:

1. Create a GitHub Personal Access Token (GH_PAT):
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate a new token with `repo` and `workflow` permissions
   - Save the token securely - you'll need it during setup

2. Clone the repository and navigate to the project directory

3. Run the automated setup script:
```bash
setup.bat
```

This script will:
- Install Azure CLI if not present
- Create necessary Azure AD applications with required permissions:
  - Directory.ReadWrite.All for Azure AD operations
  - Application.ReadWrite.All for federated credentials
- Configure GitHub Actions OIDC authentication
- Set up required GitHub secrets automatically:
  - GH_PAT: Your GitHub Personal Access Token (encrypted)
  - AZURE_CLIENT_ID: Azure AD application client ID
  - AZURE_TENANT_ID: Azure AD tenant ID
  - AZURE_SUBSCRIPTION_ID: Azure subscription ID

If you're not on Windows, you'll need to manually:
- Install Azure CLI
- Run `az login`
- Create an Azure AD application with required permissions
- Configure OIDC authentication
- Set up GitHub secrets:
  1. Go to your repository's Settings → Secrets and variables → Actions
  2. Add the required secrets listed above

### Development Environment

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

#### Required GitHub Secrets

After running the setup script, these secrets will be automatically configured:
- `AZURE_CLIENT_ID`: Azure AD application client ID
- `AZURE_TENANT_ID`: Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID

You'll need to manually add these additional secrets:
- `COSMOS_DB_CONNECTION_STRING`: MongoDB connection string for Cosmos DB
  - Get from: Azure Portal → Cosmos DB → Connection Strings
- `REDIS_CONNECTION_STRING`: Connection string for Azure Cache for Redis
  - Format: hostname:port,password=xxx,ssl=True,abortConnect=False
  - Get from: Azure Portal → Redis Cache → Access keys

#### Deployment Process

1. Automated deployment:
   - Push to the main branch to trigger automatic deployment
   - Or manually trigger the workflow in GitHub Actions

2. The deployment workflow will:
   - Authenticate with Azure using OIDC
   - Build the application
   - Configure Node.js runtime (18-lts)
   - Install and configure PM2 process manager
   - Deploy frontend to Azure Web App
   - Deploy backend to separate Azure Web App
   - Set up environment variables and app settings
   - Verify deployment status and check logs

Your application will be available at:
- Frontend: `https://buddy-chat-app.azurewebsites.net`
- Backend: `https://chat-app-backend-123.azurewebsites.net`

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

## Recent Changes

### Infrastructure Updates (Latest)
- Fixed Azure AD authorization issues:
  - Added Application.ReadWrite.All permission for federated credentials
  - Implemented retry logic for Azure AD operations
  - Added proper handling of existing federated credentials
- Enhanced deployment configuration:
  - Configured Node.js runtime (18-lts) for both apps
  - Added PM2 process management
  - Improved build output handling
  - Added deployment verification and logging
- Fixed GitHub secret encryption in Azure setup process
- Added automated GH_PAT secret configuration
- Improved error handling in setup script
- Enhanced secret management security using tweetsodium

### Infrastructure Updates
- Implemented automated Azure setup process using setup.bat
- Migrated to OIDC-based Azure authentication
- Added GitHub Actions workflow for Azure setup
- Improved secret management and security
- Separated frontend and backend deployments

### Technical Updates
- WebSocket-based communication
- Azure services integration
- Real-time message handling
- Server-side persistence
- Enhanced error handling and reconnection logic
