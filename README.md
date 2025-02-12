# Chat Application

A real-time chat application using GraphQL, Azure Functions, and React.

## Architecture

### Backend
- **Azure Functions** (.NET 8.0 Isolated Worker Process)
- **Hot Chocolate v14** for GraphQL implementation
- **Cosmos DB** for storage
- **Event Grid** for messaging
- **Server-Sent Events (SSE)** for real-time communication

### Frontend
- **React** with TypeScript
- **Apollo Client** for GraphQL operations
- **Material-UI** for components
- **Redux** for state management
- **SSE** support for real-time updates

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
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
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
dotnet build
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

### Local Development
- Backend runs on `http://localhost:7071`
- Frontend runs on `http://localhost:3000`
- GraphQL endpoint: `http://localhost:7071/api/graphql`
- SSE subscriptions use the same endpoint with `Accept: text/event-stream` header

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

### Subscriptions (via SSE)
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

- Hot Chocolate v14 error conventions
- Development vs Production error details
- Structured error logging
- Client-friendly error messages
- Real-time error notifications through SSE subscriptions

## Real-time Communication

The application uses Server-Sent Events (SSE) for real-time communication:

1. **SSE Support**
   - Native browser support
   - Automatic reconnection
   - Better compatibility with serverless architecture
   - Works with Azure Functions Consumption plan

2. **Event Grid** (Backend Events)
   - System events
   - Integration events
   - Message processing status

3. **GraphQL Subscriptions**
   - Hot Chocolate v14 subscription system
   - Efficient event delivery
   - Proper cancellation support
   - Full SSE protocol support

## Production Considerations

1. **Subscription Handling**
   - SSE-based real-time updates
   - In-memory event aggregator for efficient pub/sub
   - Works with Azure Functions Consumption plan
   - Minimal external dependencies
   - Type-safe message delivery

2. **Error Handling**
   - Development: Detailed error information
   - Production: Sanitized error messages
   - Hot Chocolate v14 error conventions

3. **Performance**
   - Cosmos DB connection pooling
   - Event Grid retry policies
   - GraphQL request batching
   - Apollo Client caching

## Architecture Changes (February 2025)

### Migration to Isolated Worker Process
We've moved to the isolated worker process model:
1. Better performance and scalability
2. Improved resource isolation
3. Future-proof architecture (in-process support ends November 2026)
4. Simplified SSE implementation
   - Transport configuration handled by builder
   - No manual transport type configuration needed
   - Automatic SSE protocol support
5. Hot Chocolate v14 integration with auto-pilot features
   - Automatic dependency injection
   - Source generation for better performance
   - Built-in subscription support

### Hot Chocolate v14 Implementation
We use Hot Chocolate v14 for several reasons:
1. Better suited for Azure Functions
2. Auto-pilot dependency injection
3. Built-in SSE support
4. Source generators for better performance
5. New error handling conventions

Key Configuration Options:
- maxAllowedRequestSize: Controls maximum request size
- apiRoute: Customizes the GraphQL endpoint path
- Default configuration via AddGraphQLFunction()

Example configuration:
```csharp
builder.AddGraphQLFunction(
    configure: b => b.AddTypes(),
    maxAllowedRequestSize: 1024 * 1024,  // 1MB
    apiRoute: "api/graphql"
);
```

## Hot Chocolate v14 Best Practices

### Subscription Setup
- Let AddInMemorySubscriptions() handle transport configuration
- No manual transport type needed in subscription functions
- Simple ExecuteAsync pattern for handlers

Example subscription function:
```csharp
public sealed class SubscriptionFunction
{
    private readonly IGraphQLRequestExecutor _executor;

    public SubscriptionFunction(IGraphQLRequestExecutor executor) => 
        _executor = executor;

    [Function("Subscriptions")]
    public Task<HttpResponseData> RunSubscription(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "graphql/sse")] 
        HttpRequestData request) =>
        _executor.ExecuteAsync(request);
}
```

### Input Types
- Use source generation with ObjectType<T>
- Leverage auto-pilot dependency injection
- No need for manual service registration

Example input type:
```csharp
public sealed record SendMessageInput(
    string Content,
    string ConversationId,
    string Role);

[ExtendObjectType<SendMessageInput>]
public sealed class SendMessageInputType
{
    // Source generation handles the rest!
}
```

### Error Handling
- Use built-in error conventions
- Centralized error configuration
- Development vs Production error details

### Azure Resource Changes
When deploying to Azure, ensure:
1. Function App is configured for .NET 8.0 runtime
2. FUNCTIONS_WORKER_RUNTIME is set to "dotnet-isolated"
3. WEBSITE_RUN_FROM_PACKAGE is set to "1"

## Known Limitations

1. Local development requires:
   - Azure Cosmos DB Emulator or actual Cosmos DB instance
   - Event Grid connection (no local emulator available)

2. SSE connections require:
   - Client support for EventSource API
   - Proper CORS configuration in production
   - Stable network connection for real-time updates

3. Deployment considerations:
   - GraphQL schema validation required before deployment
   - Backend must be healthy before frontend deployment
   - Deployments only from main branch
   - Federated credentials must match exact format

## Future Improvements

1. **Backend**
   - Implement cursor-based pagination for messages
   - Add message batching support
   - Enhance subscription filtering
   - Add DataLoader patterns for better performance

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
