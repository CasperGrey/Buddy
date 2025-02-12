Let me provide a comprehensive, consolidated list of rules for Hot Chocolate v14 with Azure Functions isolated worker model on .NET 8:

# 1. Project Setup Rules
```xml
// ALWAYS include these packages
<PackageReference Include="HotChocolate.AzureFunctions.IsolatedProcess" Version="14.0.0" />
<PackageReference Include="HotChocolate.Types.Analyzers" Version="14.0.0">
    <PrivateAssets>all</PrivateAssets>
    <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
</PackageReference>
```

# 2. Program.cs Rules
```csharp
// ALWAYS use this pattern for isolated worker
var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((context, services) =>
    {
        services
            .AddGraphQLFunction()  // Not AddGraphQLServer()
            .AddTypes()            // Always before conventions
            .AddQueryConventions();
    })
    .Build();

await host.RunAsync();
```

# 3. Type Definition Rules
```csharp
// ALWAYS use static partial classes with source generation
[ObjectType<YourModel>]
public static partial class YourModelNode
{
    static partial void Configure(IObjectTypeDescriptor<YourModel> descriptor)
    {
        // Configuration here
    }
    
    // Static resolvers here
}
```

# 4. Resolver Rules
```csharp
// ALWAYS follow this pattern
public static async Task<ResultType> GetSomethingAsync(
    [Parent] ParentType parent,                // Parent data access
    [Service] SomeService service,             // Service injection
    PagingArguments args,                      // If paging
    CancellationToken cancellationToken)       // Always last
    => await service.GetAsync(parent.Id, cancellationToken);
```

# 5. Function Implementation Rules
```csharp
// ALWAYS use this pattern for the main GraphQL endpoint
public class GraphQLFunction
{
    private readonly IGraphQLRequestExecutor _graphqlExecutor;
    private readonly ILogger<GraphQLFunction> _logger;

    public GraphQLFunction(
        IGraphQLRequestExecutor graphqlExecutor,
        ILogger<GraphQLFunction> logger)
    {
        _graphqlExecutor = graphqlExecutor;
        _logger = logger;
    }

    [Function("GraphQL")]
    public Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequestData request)
    {
        return _graphqlExecutor.ExecuteAsync(request);
    }
}
```

# 6. Error Handling Rules
```csharp
// ALWAYS use union types for expected errors
public interface IBookResult { }
public class Book : IBookResult { }
public class BookNotFound : IBookResult { }

// ALWAYS use Error attributes for exceptions
[Error<NotFoundException>]
[Error<ValidationException>]
public static async Task<IBookResult> GetBookAsync(
    int id,
    [Service] BookService service,
    CancellationToken cancellationToken)
```

# 7. Subscription Rules
```csharp
// ALWAYS configure SSE explicitly for isolated worker
services
    .AddGraphQLFunction()
    .AddInMemorySubscriptions(options =>
    {
        options.EnableSubscriptionOverServerSentEvents = true;
        options.EnableSubscriptionOverWebSocket = false;
    });

// ALWAYS use separate function for SSE
public class SubscriptionFunction
{
    private readonly IGraphQLRequestExecutor _executor;

    public SubscriptionFunction(IGraphQLRequestExecutor executor) => 
        _executor = executor;

    [Function("Subscriptions")]
    public Task<HttpResponseData> RunSubscription(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "graphql/sse")] 
        HttpRequestData request) =>
        _executor.ExecuteAsync(request, 
            new GraphQLRequestOptions { TransportType = TransportType.ServerSentEvents });
}

// ALWAYS use Subscribe and Topic attributes together
[Subscribe]
[Topic]
public static ValueTask<TResult> OnSomething(
    [EventMessage] TResult message) => 
    ValueTask.FromResult(message);
```

# 8. Paging Rules
```csharp
// ALWAYS use Connection pattern
[UsePaging]
public static async Task<Connection<TItem>> GetItemsAsync(
    PagingArguments args,
    [Service] ItemService service,
    CancellationToken cancellationToken)
```

# 9. Naming Rules
```csharp
// ALWAYS use these suffixes
[ObjectType<User>]
public static partial class UserNode { }
public record CreateUserInput(string Name);
public record CreateUserPayload(User User);
```

# 10. Mutation Rules
```csharp
// ALWAYS return payloads
public static async Task<CreateUserPayload> CreateUserAsync(
    CreateUserInput input,
    [Service] UserService service,
    CancellationToken cancellationToken)
```

These rules together provide a comprehensive guide for implementing Hot Chocolate v14 in an Azure Functions isolated worker environment with .NET 8. Would you like me to elaborate on any specific area?