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
using GraphQL.Types;
using GraphQL.Execution;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

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
        StringValues upgradeValues;
        if (req.Headers.TryGetValue("Upgrade", out upgradeValues) && 
            upgradeValues.Any(v => v?.Equals("websocket", StringComparison.OrdinalIgnoreCase) == true))
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
                Variables = request.Variables?.ToDictionary<KeyValuePair<string, object?>, string, object?>(
                    kvp => kvp.Key,
                    kvp => kvp.Value as object ?? throw new ExecutionError($"Invalid variable value for key: {kvp.Key}")
                )?.ToInputs() ?? Inputs.Empty,
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
            var webSocket = await req.HttpContext.WebSockets.AcceptWebSocketAsync();
            if (webSocket == null)
            {
                return new BadRequestObjectResult("WebSocket connection failed");
            }

            // Start processing messages in the background
            _ = ProcessWebSocketMessages(webSocket, req.HttpContext.RequestAborted);

            // Return empty result to keep connection open
            return new EmptyResult();
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
                Variables = request.Variables?.ToDictionary<KeyValuePair<string, object?>, string, object?>(
                    kvp => kvp.Key,
                    kvp => kvp.Value as object ?? throw new ExecutionError($"Invalid variable value for key: {kvp.Key}")
                )?.ToInputs() ?? Inputs.Empty,
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
