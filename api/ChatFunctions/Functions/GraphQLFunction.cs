using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using HotChocolate.AzureFunctions;

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
        [HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequestData request)
    {
        return _graphqlExecutor.ExecuteAsync(request);
    }
}
