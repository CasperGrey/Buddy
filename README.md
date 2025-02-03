# Chat Application

A real-time chat application using GraphQL, Azure Functions, and React.

## Architecture

### Backend
- **Azure Functions** (.NET 8.0 Isolated Worker)
- **HotChocolate** for GraphQL implementation
- **Cosmos DB** for storage
- **Event Grid** for messaging
- **Redis** (optional) for production-grade subscriptions

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

### Backend Configuration

1. Local Settings (`local.settings.json`)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "CosmosDbConnectionString": "<your-cosmos-connection-string>",
    "EventGridEndpoint": "<your-eventgrid-endpoint>",
    "EventGridKey": "<your-eventgrid-key>",
    "RedisConnectionString": "<optional-redis-connection-string>",
    "ASPNETCORE_ENVIRONMENT": "Development"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": true
  }
}
```

2. Database Setup
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
3. Run code generation:
```bash
npm run generate
```

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

The application uses a hybrid approach for real-time updates:

1. **WebSocket** (GraphQL Subscriptions)
   - Real-time message delivery
   - Connection status monitoring
   - Automatic reconnection
   - Error notifications

2. **Event Grid** (Backend Events)
   - System events
   - Integration events
   - Message processing status

## Production Considerations

1. **Subscription Handling**
   - Development: In-memory subscriptions
   - Production: Redis-backed subscriptions (configure via `RedisConnectionString`)

2. **Error Handling**
   - Development: Detailed error information
   - Production: Sanitized error messages

3. **Performance**
   - Cosmos DB connection pooling
   - Event Grid retry policies
   - GraphQL request timeout (30 seconds)
   - Apollo Client caching

## Known Limitations

1. Local development requires:
   - Azure Cosmos DB Emulator or actual Cosmos DB instance
   - Event Grid connection (no local emulator available)

2. WebSocket connections require:
   - Client support for the `graphql-ws` protocol
   - Proper CORS configuration in production
   - Stable network connection for real-time updates

## Future Improvements

1. **Backend**
   - Implement cursor-based pagination for messages
   - Add message batching support
   - Enhance subscription filtering
   - Add Redis cluster support

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
