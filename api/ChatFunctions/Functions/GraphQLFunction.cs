using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using HotChocolate.AzureFunctions;
using Microsoft.Extensions.Logging;

namespace ChatFunctions.Functions;

public sealed class GraphQLFunction
{
    private readonly IGraphQLRequestExecutor _graphqlExecutor;

    public GraphQLFunction(IGraphQLRequestExecutor graphqlExecutor)
    {
        _graphqlExecutor = graphqlExecutor;
    }

    [Function("GraphQL")]
    public Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = "graphql")] HttpRequestData request)
    {
        return _graphqlExecutor.ExecuteAsync(request);
    }
}