using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using HotChocolate.AspNetCore;
using HotChocolate.Execution;
using HotChocolate.Subscriptions;
using System.Text.Json;
using System.Net;
using ChatFunctions.Schema;
using HotChocolate;
using HotChocolate.Types;

namespace ChatFunctions.Functions;

public class GraphQLFunction
{
    private readonly ILogger<GraphQLFunction> _logger;
    private readonly IRequestExecutorResolver _executorResolver;
    private readonly ITopicEventSender _eventSender;

    public GraphQLFunction(
        IRequestExecutorResolver executorResolver,
        ITopicEventSender eventSender,
        ILoggerFactory loggerFactory)
    {
        _executorResolver = executorResolver;
        _eventSender = eventSender;
        _logger = loggerFactory.CreateLogger<GraphQLFunction>();
    }

    [Function("graphql")]
    public async Task<HttpResponseData> HandleAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", "get", Route = null)] HttpRequestData req)
    {
        _logger.LogInformation("Processing GraphQL request");

        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");

        try
        {
            if (!req.Headers.TryGetValues("x-functions-key", out var keys))
            {
                response.StatusCode = HttpStatusCode.Unauthorized;
                await response.WriteAsJsonAsync(new { error = "Function key required" });
                return response;
            }

            var executor = await _executorResolver.GetRequestExecutorAsync();

            // Handle schema requests
            if (req.Method == "GET")
            {
                var schema = executor.Schema.ToString();
                await response.WriteAsJsonAsync(new { schema });
                return response;
            }

            var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<GraphQLRequest>(requestBody, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (request?.Query == null)
            {
                response.StatusCode = HttpStatusCode.BadRequest;
                await response.WriteAsJsonAsync(new { error = "Invalid request format" });
                return response;
            }

            var result = await executor.ExecuteAsync(builder =>
            {
                builder
                    .SetQuery(request.Query)
                    .SetOperation(request.OperationName);

                if (request.Variables != null)
                {
                    builder.SetVariableValues(request.Variables);
                }
            });

            var queryResult = result as IQueryResult;
            if (queryResult?.Errors?.Count > 0)
            {
                // Send error to subscription
                var error = new ChatError(
                    message: queryResult.Errors[0].Message,
                    code: queryResult.Errors[0].Code ?? "UNKNOWN_ERROR",
                    conversationId: request.Variables?.GetValueOrDefault("conversationId")?.ToString()
                );
                await _eventSender.SendAsync("Errors", error);

                response.StatusCode = HttpStatusCode.BadRequest;
            }

            await response.WriteAsJsonAsync(result);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing GraphQL request: {Message}", ex.Message);
            
            if (ex.InnerException != null)
            {
                _logger.LogError(ex.InnerException, "Inner exception: {Message}", ex.InnerException.Message);
            }

            response.StatusCode = HttpStatusCode.InternalServerError;
            var error = new
            {
                error = "Internal Server Error",
                message = ex.Message,
                details = ex.InnerException?.Message,
                code = "INTERNAL_SERVER_ERROR"
            };

            await response.WriteAsJsonAsync(error);
            return response;
        }
    }

    [Function("graphql-ws")]
    public async Task<HttpResponseData> HandleWebSocketAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequestData req)
    {
        _logger.LogInformation("Processing WebSocket request");

        try
        {
            if (!req.Headers.TryGetValues("Upgrade", out var upgradeValues) || 
                !upgradeValues.Any(v => v.Equals("websocket", StringComparison.OrdinalIgnoreCase)))
            {
                var errorResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                await errorResponse.WriteAsJsonAsync(new { error = "WebSocket upgrade required" });
                return errorResponse;
            }

            if (!req.Headers.TryGetValues("Sec-WebSocket-Protocol", out var protocols) ||
                !protocols.Any(p => p.Contains("graphql-ws")))
            {
                var errorResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                await errorResponse.WriteAsJsonAsync(new { error = "GraphQL WebSocket protocol required" });
                return errorResponse;
            }

            if (!req.Headers.TryGetValues("x-functions-key", out var keys))
            {
                var errorResponse = req.CreateResponse(HttpStatusCode.Unauthorized);
                await errorResponse.WriteAsJsonAsync(new { error = "Function key required" });
                return errorResponse;
            }

            var response = req.CreateResponse(HttpStatusCode.SwitchingProtocols);
            response.Headers.Add("Upgrade", "websocket");
            response.Headers.Add("Connection", "Upgrade");
            response.Headers.Add("Sec-WebSocket-Protocol", "graphql-ws");
            
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling WebSocket request: {Message}", ex.Message);
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteAsJsonAsync(new { error = "Internal server error during WebSocket upgrade" });
            return errorResponse;
        }
    }
}

public class GraphQLRequest
{
    public string? Query { get; set; }
    public string? OperationName { get; set; }
    public Dictionary<string, object?>? Variables { get; set; }
}
