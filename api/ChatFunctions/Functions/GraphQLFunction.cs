using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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

    [FunctionName("GraphQL")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = "graphql")] HttpRequest req)
    {
        if (req.Headers.TryGetValues("Upgrade", out var upgradeValues) && 
            upgradeValues.Any(v => v.Equals("websocket", StringComparison.OrdinalIgnoreCase)))
        {
            return await HandleWebSocket(req);
        }

        return await HandleHttp(req);
    }

    private async Task<IActionResult> HandleHttp(HttpRequest req)
    {
        try
        {
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<GraphQLRequest>(
                requestBody,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (request == null)
            {
                return new BadRequestObjectResult("Invalid GraphQL request");
            }

            var result = await _documentExecuter.ExecuteAsync(new ExecutionOptions
            {
                Schema = _schema,
                Query = request.Query,
                Variables = request.Variables?.ToInputs(),
                OperationName = request.OperationName,
                RequestServices = req.HttpContext.RequestServices,
                CancellationToken = req.HttpContext.RequestAborted
            });

            return new OkObjectResult(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing GraphQL query");
            return new StatusCodeResult(500);
        }
    }

    private async Task<IActionResult> HandleWebSocket(HttpRequest req)
    {
        try
        {
            if (req.HttpContext.WebSockets.IsWebSocketRequest)
            {
                var webSocket = await req.HttpContext.WebSockets.AcceptWebSocketAsync();
                _ = ProcessWebSocketMessages(webSocket, req.HttpContext.RequestAborted);

                // Return a response that keeps the connection open
                return new EmptyResult();
            }

            return new BadRequestObjectResult("Not a WebSocket request");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling WebSocket connection");
            return new StatusCodeResult(500);
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
