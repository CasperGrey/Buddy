using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using GraphQL;
using GraphQL.Transport;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using GraphQL.Server.Transports.AspNetCore.WebSockets;

namespace ChatFunctions.Functions;

public class GraphQLFunction
{
    private readonly IDocumentExecuter _documentExecuter;
    private readonly ISchema _schema;
    private readonly ILogger<GraphQLFunction> _logger;
    private readonly GraphQLWebSocketOptions _webSocketOptions;

    public GraphQLFunction(
        IDocumentExecuter documentExecuter,
        ISchema schema,
        ILogger<GraphQLFunction> logger)
    {
        _documentExecuter = documentExecuter;
        _schema = schema;
        _logger = logger;
        _webSocketOptions = new GraphQLWebSocketOptions
        {
            ConnectionInitWaitTimeout = TimeSpan.FromSeconds(30),
            KeepAliveTimeout = TimeSpan.FromSeconds(30)
        };
    }

    [Function("GraphQL")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = "graphql")] HttpRequestData req)
    {
        if (req.Headers.TryGetValues("Upgrade", out var upgradeValues) && 
            upgradeValues.Any(v => v.Equals("websocket", StringComparison.OrdinalIgnoreCase)))
        {
            return await HandleWebSocket(req);
        }

        return await HandleHttp(req);
    }

    private async Task<HttpResponseData> HandleHttp(HttpRequestData req)
    {
        try
        {
            var request = await JsonSerializer.DeserializeAsync<GraphQLRequest>(
                req.Body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (request == null)
            {
                var badResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResponse.WriteStringAsync("Invalid GraphQL request");
                return badResponse;
            }

            var result = await _documentExecuter.ExecuteAsync(new ExecutionOptions
            {
                Schema = _schema,
                Query = request.Query,
                Variables = request.Variables?.ToInputs(),
                OperationName = request.OperationName,
                RequestServices = req.FunctionContext.InstanceServices,
                CancellationToken = req.FunctionContext.CancellationToken
            });

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(result);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing GraphQL query");
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync("Internal server error");
            return errorResponse;
        }
    }

    private async Task<HttpResponseData> HandleWebSocket(HttpRequestData req)
    {
        try
        {
            var response = req.CreateResponse(HttpStatusCode.SwitchingProtocols);
            response.Headers.Add("Upgrade", "websocket");
            response.Headers.Add("Connection", "Upgrade");

            // Get WebSocket from response
            var webSocket = await response.WebSocket.AcceptWebSocketAsync();

            // Create WebSocket connection
            var connection = new WebSocketConnection(
                webSocket,
                _documentExecuter,
                _schema,
                _webSocketOptions,
                req.FunctionContext.InstanceServices,
                _logger);

            // Start processing messages
            _ = connection.ExecuteAsync(req.FunctionContext.CancellationToken);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling WebSocket connection");
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync("Internal server error");
            return errorResponse;
        }
    }
}
