# Chat Application

A real-time chat application using GraphQL, Azure Functions, and React.

## Architecture

### Backend
- **Azure Functions** (.NET 8.0 In-Process)
- **GraphQL.NET** for GraphQL implementation
- **Cosmos DB** for storage
- **Event Grid** for messaging
- **Native WebSocket** support for real-time communication

### Frontend
- **React** with TypeScript
- **Apollo Client** for GraphQL operations
- **Material-UI** for components
- **Redux** for state management
- **WebSocket** support for real-time updates

## Setup

### Prerequisites
- .NET 8.0 SDK
- Node.js 18+
- Azure CLI
- Azure Functions Core Tools
- GitHub repository with a "Production" environment (case-sensitive)

### Azure Configuration

1. Run Initial Setup
```bash
# This will:
# - Create Azure resources
# - Set up app registrations
# - Configure GitHub secrets
# - Set up initial Azure configuration
setup.bat
```

2. Set up Federated Credentials
```powershell
# Run the setup script with your values:
./azure-setup/setup-federated-credentials.ps1 `
    -TenantId "<your-tenant-id>" `
    -BackendClientId "<your-backend-client-id>" `
    -FrontendClientId "<your-frontend-client-id>" `
    -RepoOwner "<github-username>" `
    -RepoName "<repository-name>"
```

This script will:
- Create federated credentials for both backend and frontend apps
- Set up authentication for GitHub Actions
- Configure necessary permissions for Azure deployments
- Ensure correct OIDC token validation

The script ensures proper credential format:
```
repo:owner/repo:ref:refs/heads/main
```

Important: The subject format must match exactly for OIDC to work.

3. Backend Configuration

Local Settings (`local.settings.json`)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet",
    "FUNCTIONS_INPROC_NET8_ENABLED": "true",
    "CosmosDbConnectionString": "<your-cosmos-connection-string>",
    "EventGridEndpoint": "<your-eventgrid-endpoint>",
    "EventGridKey": "<your-eventgrid-key>",
    "ASPNETCORE_ENVIRONMENT": "Development"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": true
  }
}
```

4. Database Setup
- Cosmos DB requires two containers:
  - `Messages` container with `/conversationId` partition key
  - `Conversations` container with `/id` partition key

### Frontend Configuration

1. Environment Variables (`.env.local`)
```bash
REACT_APP_GRAPHQL_HTTP_URL=http://localhost:7071/api/graphql
REACT_APP_GRAPHQL_WS_URL=ws://localhost:7071/api/graphql-ws
```

2. GraphQL Code Generation
```bash
npm run generate
```
This will generate type-safe hooks and operations in `src/generated/graphql.ts`

### Running Locally

1. Backend
```bash
cd api/ChatFunctions
func start
```

2. Frontend
```bash
# Install dependencies
npm install

# Generate GraphQL types
npm run generate

# Start development server
npm start
```

## Development Workflow

### GraphQL Schema Changes

1. Update schema in backend (`api/ChatFunctions/schema.graphql`)
2. Update operations in frontend (`src/graphql/*.graphql`)
3. Run code generation and validate schema:
```bash
# Generate types
npm run generate

# Test schema against production (requires Node.js 18+)
npm install -g get-graphql-schema
./test-graphql-schema.ps1
```

The schema validation process:
1. Downloads schema from production endpoint using introspection
2. Authenticates using function key for secure access
3. Validates JSON response format and structure
4. Compares with local schema for compatibility
5. Validates presence of required types (Query, Mutation)
6. Runs automatically in CI/CD pipeline before deployment
7. Prevents deployment if schemas are incompatible

Required environment variables:
- `FUNCTION_KEY`: Azure Function authentication key

### Deployment Process

The application uses a unified deployment workflow that ensures proper sequencing:

1. Backend Build & Deploy
   - Builds and packages Azure Functions
   - Authenticates using OIDC token
   - Deploys to Azure Functions
   - Includes health checks with retries

2. Schema Validation
   - Verifies endpoint accessibility
   - Downloads and validates schema
   - Ensures schema compatibility
   - Prevents deployment if schema mismatch

3. Frontend Build
   - Builds React application
   - Optimizes for production
   - Removes development artifacts
   - Creates deployment package

4. Frontend Deploy
   - Authenticates using OIDC token
   - Deploys to Azure Web App
   - Configures F1 tier settings
   - Verifies deployment health

The workflow includes:
- Branch-based authentication (main only)
- Automated deployment process
- No manual approvals needed
- Comprehensive health checks
- Retry mechanisms for resilience
- Memory optimizations for F1 tier

### Local Development
- Backend runs on `http://localhost:7071`
- Frontend runs on `http://localhost:3000`
- WebSocket endpoint: `ws://localhost:7071/api/graphql-ws`
- GraphQL endpoint: `http://localhost:7071/api/graphql`

## GraphQL Schema

The GraphQL schema is automatically published to `schema.graphql`. Key operations:

### Queries
```graphql
query GetMessages($conversationId: ID!) {
  messages(conversationId: $conversationId) {
    id
    content
    role
    timestamp
    conversationId
  }
}
```

### Mutations
```graphql
mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    id
    content
    role
    timestamp
    conversationId
  }
}

mutation StartConversation($model: String!) {
  startConversation(model: $model) {
    id
    model
    createdAt
  }
}
```

### Subscriptions
```graphql
subscription OnMessageReceived($conversationId: String!) {
  messageReceived(conversationId: $conversationId) {
    id
    content
    role
    timestamp
    conversationId
  }
}

subscription OnError {
  onError {
    message
    code
    conversationId
  }
}
```

## Error Handling

The application implements comprehensive error handling:

- GraphQL-specific error filtering
- Development vs Production error details
- Structured error logging
- Client-friendly error messages
- Real-time error notifications through subscriptions

## Real-time Communication

The application uses WebSocket for real-time communication:

1. **Native WebSocket Support**
   - Built-in WebSocket handling
   - No external dependencies
   - Efficient message delivery
   - Automatic reconnection
   - Error notifications

2. **Event Grid** (Backend Events)
   - System events
   - Integration events
   - Message processing status

## Production Considerations

1. **Subscription Handling**
   - In-memory event aggregator for efficient pub/sub
   - Built-in WebSocket support
   - No external dependencies

2. **Error Handling**
   - Development: Detailed error information
   - Production: Sanitized error messages

3. **Performance**
   - Cosmos DB connection pooling
   - Event Grid retry policies
   - GraphQL request timeout (30 seconds)
   - Apollo Client caching

## Architecture Changes (February 2025)

### Migration to .NET 8.0 In-Process Model
We've migrated to .NET 8.0 In-Process model for several reasons:
1. Better performance and reduced cold starts
2. Native WebSocket support
3. Simplified deployment and configuration
4. Long-term support (LTS) until November 2026

### GraphQL.NET Implementation
We now use GraphQL.NET instead of HotChocolate:
1. Lighter weight and better suited for Function Apps
2. Native .NET implementation
3. Built-in WebSocket support
4. Simpler deployment model

### Azure Resource Changes
When deploying to Azure, ensure:
1. Function App is configured for .NET 8.0 runtime
2. FUNCTIONS_WORKER_RUNTIME is set to "dotnet"
3. FUNCTIONS_INPROC_NET8_ENABLED is set to "true"
4. No Redis dependency (removed)
5. WebSocket support is enabled

## Known Limitations

1. Local development requires:
   - Azure Cosmos DB Emulator or actual Cosmos DB instance
   - Event Grid connection (no local emulator available)

2. WebSocket connections require:
   - Client support for the GraphQL WebSocket protocol
   - Proper CORS configuration in production
   - Stable network connection for real-time updates

3. Deployment considerations:
   - F1 tier memory limitations (128MB)
   - GraphQL schema validation required before deployment
   - Backend must be healthy before frontend deployment
   - Deployments only from main branch
   - Federated credentials must match exact format
   - Function App must be .NET 8.0 In-Process

## Future Improvements

1. **Backend**
   - Implement cursor-based pagination for messages
   - Add message batching support
   - Enhance subscription filtering
   - Add WebSocket connection pooling

2. **Frontend**
   - Implement offline support
   - Add message retry mechanism
   - Enhance error recovery
   - Add progressive loading

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT
