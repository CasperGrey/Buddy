# Buddy Chat

A real-time chat application with Azure backend integration.

## Project Structure

```
buddy-chat/
├── .github/workflows/      # GitHub Actions workflows
│   └── azure-deploy-optimized.yml   # Production deployment
├── public/               # Static assets
├── src/                  # Frontend code
│   ├── components/       # React components
│   │   ├── chat/        # Chat interface components
│   │   ├── providers/   # Context providers
│   │   ├── settings/    # Settings components
│   │   ├── sidebar/     # Sidebar components
│   │   └── user/        # User-related components
│   ├── lib/             # Core functionality
│   │   ├── api/         # API integrations (Anthropic, DeepSeek, OpenAI)
│   │   ├── auth/        # Authentication
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # Service layer
│   │   ├── store/       # Redux store and slices
│   │   ├── theme/       # Theme configuration
│   │   └── utils/       # Utility functions
│   └── styles/          # Global styles
└── server/              # Backend code
    ├── config/          # Azure configuration
    └── middleware/      # Auth middleware
```

## Features

- Real-time chat using WebSocket
- Multiple AI model integrations:
  - Anthropic Claude
  - DeepSeek
  - OpenAI
- Azure services integration (Cosmos DB, Redis)
- Auth0 authentication
- Redux state management with encrypted persistence
- Message persistence and caching
- Automated Azure setup and deployment
- Tailwind CSS for styling

## Azure F1 Tier Deployment Notes

### Important Limitations

The application is configured to run on Azure's F1 (Free) tier, which has several important limitations:

1. Resource Constraints:
- Memory: Limited to 1GB shared across all apps
- CPU: Limited compute time and throttling
- Storage: 1GB total storage
- No auto-scaling or always-on features
- No custom domains or SSL configuration

2. Performance Considerations:
- Cold starts are common (app may sleep after inactivity)
- Limited concurrent connections
- Higher latency during peak times
- No WebJob or background task support

### Optimizations for F1 Tier

The deployment has been optimized for F1 tier limitations:

1. Memory Management:
- Frontend build: Uses chunked dependency installation
- Backend: Limited to 128MB memory usage
- PM2: Configured with memory limits
- Build process: Optimized for minimal memory usage

2. Deployment Configuration:
- Minimal app settings to reduce overhead
- Simplified health checks
- Basic error handling
- No advanced monitoring features

3. Build Process:
- Reduced build artifacts
- Optimized package sizes
- Minimal runtime dependencies
- Simplified TypeScript configuration

### Known Limitations

1. Health Monitoring:
- Limited health check capabilities
- No advanced monitoring or logging
- Basic error reporting only

2. Performance:
- Slower cold starts
- Potential timeouts during deployment
- Limited concurrent connections
- May experience periodic restarts

3. Scaling:
- No auto-scaling capabilities
- Fixed resource allocation
- Limited to single instance

### Best Practices for F1 Tier

1. Development:
- Keep dependencies minimal
- Avoid resource-intensive operations
- Use efficient caching strategies
- Implement proper error handling

2. Deployment:
- Monitor deployment logs carefully
- Use retry mechanisms for operations
- Keep build artifacts small
- Implement graceful degradation

3. Testing:
- Test with resource constraints in mind
- Verify behavior during cold starts
- Check timeout handling
- Test connection limits

### Upgrading Considerations

Consider upgrading to a higher tier if you need:
- Always-on capability
- Custom domain support
- Auto-scaling
- More reliable performance
- Advanced monitoring
- Background processing
- Higher resource limits

## Setup

### Prerequisites

- Node.js 18.x or later
- Git
- GitHub account with repository access
- Azure subscription (F1 Free tier supported)
- Azure AD permissions:
  - Directory.ReadWrite.All
  - Application.ReadWrite.All
- Windows (for automated setup) or manual Azure CLI setup

### Initial Azure Setup

The project includes an automated setup process for Azure authentication and GitHub Actions configuration. This process creates an Azure AD application named "buddy-chat-github" that handles GitHub Actions authentication.

> **Important**: If you need to create the Azure AD application manually, use exactly this name: "buddy-chat-github"

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
- Create necessary Azure AD applications with required permissions
- Configure GitHub Actions OIDC authentication
- Set up required GitHub secrets automatically

If you're not on Windows, you'll need to manually:
- Install Azure CLI
- Run `az login`
- Create an Azure AD application with required permissions
- Configure OIDC authentication
- Set up GitHub secrets

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

The application automatically deploys to Azure App Service (F1 tier) using GitHub Actions when you push to the main branch.

#### Required GitHub Secrets

After running the setup script, these secrets will be automatically configured:
- `AZURE_CLIENT_ID`: Azure AD application client ID
- `AZURE_TENANT_ID`: Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID

You'll need to manually add these additional secrets:
- `COSMOS_DB_CONNECTION_STRING`: MongoDB connection string for Cosmos DB
- `REDIS_CONNECTION_STRING`: Connection string for Azure Cache for Redis

#### Deployment Process

1. Automated deployment:
   - Push to the main branch to trigger automatic deployment
   - Or manually trigger the workflow in GitHub Actions

2. The deployment workflow will:
   - Build with F1 tier optimizations
   - Deploy frontend and backend separately
   - Configure minimal required settings
   - Run basic health checks

Your application will be available at:
- Frontend: `https://buddy-chat-app.azurewebsites.net`
- Backend: `https://chat-app-backend-123.azurewebsites.net`

## Recent Changes

### F1 Tier Optimizations (Latest)
- Reduced memory usage and optimized builds
- Simplified deployment configuration
- Removed unsupported features
- Added F1 tier documentation
- Improved error handling

### Infrastructure Updates (Previous)
- Fixed Azure AD authorization issues
- Enhanced deployment configuration
- Fixed GitHub secret encryption
- Added automated GH_PAT configuration
- Improved error handling in setup script

### Technical Updates
- WebSocket-based communication
- Azure services integration
- Real-time message handling
- Server-side persistence
- Enhanced error handling and reconnection logic
