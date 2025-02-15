using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using HotChocolate.AzureFunctions;

namespace ChatFunctions.Functions;

public sealed class SubscriptionFunction
{
    private readonly IGraphQLRequestExecutor _executor;

    public SubscriptionFunction(IGraphQLRequestExecutor executor) => 
        _executor = executor;

    [Function("Subscriptions")]
    public Task<HttpResponseData> RunSubscription(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "graphql/sse")] 
        HttpRequestData request) =>
        _executor.ExecuteAsync(request);
}
