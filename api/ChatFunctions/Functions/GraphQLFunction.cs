using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using GraphQL;
using GraphQL.Transport;
using Microsoft.Extensions.Logging;

namespace ChatFunctions.Functions;

public class GraphQLFunction
{
    private readonly IDocumentExecuter _documentExecuter;
    private readonly ISchema _schema;
    private readonly ILogger<GraphQLFunction> _logger;

    public GraphQLFunction(
        IDocumentExecuter documentExecuter,
        ISchema schema,
        ILogger<GraphQLFunction> logger)
    {
        _documentExecuter = documentExecuter;
        _schema = schema;
        _logger = logger;
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

            var webSocket = await response.WebSocket.AcceptWebSocketAsync();
            _ = ProcessWebSocketMessages(webSocket, req.FunctionContext.CancellationToken);

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

    private async Task ProcessWebSocketMessages(WebSocket webSocket, CancellationToken cancellationToken)
    {
        var buffer = new byte[1024 * 4];
        try
        {
            while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client requested close", cancellationToken);
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    var request = JsonSerializer.Deserialize<GraphQLRequest>(message);

                    if (request != null)
                    {
                        var executionResult = await _documentExecuter.ExecuteAsync(new ExecutionOptions
                        {
                            Schema = _schema,
                            Query = request.Query,
                            Variables = request.Variables?.ToInputs(),
                            OperationName = request.OperationName,
                            CancellationToken = cancellationToken
                        });

                        var responseJson = JsonSerializer.Serialize(executionResult);
                        var responseBytes = Encoding.UTF8.GetBytes(responseJson);
                        await webSocket.SendAsync(
                            new ArraySegment<byte>(responseBytes),
                            WebSocketMessageType.Text,
                            true,
                            cancellationToken);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing WebSocket messages");
            if (webSocket.State == WebSocketState.Open)
            {
                await webSocket.CloseAsync(
                    WebSocketCloseStatus.InternalServerError,
                    "Internal server error",
                    cancellationToken);
            }
        }
    }
}
