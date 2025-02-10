using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using GraphQL;
using GraphQL.Transport;
using GraphQL.Types;
using System.Text.Json;
using System.Net.WebSockets;
using System.Threading;
using System.Text;

namespace ChatFunctions.Functions;

public class GraphQLFunction
{
    private readonly ILogger<GraphQLFunction> _logger;
    private readonly ISchema _schema;
    private readonly IDocumentExecuter _documentExecuter;

    public GraphQLFunction(
        ISchema schema,
        IDocumentExecuter documentExecuter,
        ILoggerFactory loggerFactory)
    {
        _schema = schema;
        _documentExecuter = documentExecuter;
        _logger = loggerFactory.CreateLogger<GraphQLFunction>();
    }

    [FunctionName("graphql")]
    public async Task<IActionResult> HandleGraphQLAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req)
    {
        _logger.LogInformation("Processing GraphQL request");

        if (!req.Headers.TryGetValue("x-functions-key", out var keys))
        {
            return new UnauthorizedObjectResult(new { error = "Function key required" });
        }

        try
        {
            if (req.HttpContext.WebSockets.IsWebSocketRequest)
            {
                await HandleWebSocketAsync(req.HttpContext);
                return new EmptyResult();
            }

            var request = await JsonSerializer.DeserializeAsync<GraphQLRequest>(
                req.Body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (request == null)
            {
                return new BadRequestObjectResult("Invalid GraphQL request");
            }

            var result = await _documentExecuter.ExecuteAsync(options =>
            {
                options.Schema = _schema;
                options.Query = request.Query;
                options.Variables = request.Variables;
                options.OperationName = request.OperationName;
                options.RequestServices = req.HttpContext.RequestServices;
                options.CancellationToken = req.HttpContext.RequestAborted;
            });

            return new OkObjectResult(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing GraphQL request");
            return new ObjectResult(new { error = "Internal server error" })
            {
                StatusCode = StatusCodes.Status500InternalServerError
            };
        }
    }

    private async Task HandleWebSocketAsync(HttpContext context)
    {
        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        var buffer = new byte[1024 * 4];
        var graphQLWebSocket = new GraphQLWebSocket(_schema, _documentExecuter);

        await graphQLWebSocket.HandleWebSocketAsync(
            webSocket,
            context.RequestServices,
            context.RequestAborted);
    }

    private class GraphQLRequest
    {
        public string Query { get; set; } = string.Empty;
        public string? OperationName { get; set; }
        public Dictionary<string, object?>? Variables { get; set; }
    }
}

public class GraphQLWebSocket
{
    private readonly ISchema _schema;
    private readonly IDocumentExecuter _documentExecuter;

    public GraphQLWebSocket(ISchema schema, IDocumentExecuter documentExecuter)
    {
        _schema = schema;
        _documentExecuter = documentExecuter;
    }

    public async Task HandleWebSocketAsync(
        WebSocket webSocket,
        IServiceProvider serviceProvider,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[1024 * 4];
        var receiveResult = await webSocket.ReceiveAsync(
            new ArraySegment<byte>(buffer), cancellationToken);

        while (!receiveResult.CloseStatus.HasValue)
        {
            if (receiveResult.MessageType == WebSocketMessageType.Text)
            {
                var message = Encoding.UTF8.GetString(buffer, 0, receiveResult.Count);
                var operationMessage = JsonSerializer.Deserialize<OperationMessage>(message);

                if (operationMessage != null)
                {
                    var response = await HandleMessageAsync(operationMessage, serviceProvider);
                    var responseBytes = Encoding.UTF8.GetBytes(
                        JsonSerializer.Serialize(response));

                    await webSocket.SendAsync(
                        new ArraySegment<byte>(responseBytes),
                        WebSocketMessageType.Text,
                        true,
                        cancellationToken);
                }
            }

            receiveResult = await webSocket.ReceiveAsync(
                new ArraySegment<byte>(buffer), cancellationToken);
        }

        if (receiveResult.CloseStatus.HasValue)
        {
            await webSocket.CloseAsync(
                receiveResult.CloseStatus.Value,
                receiveResult.CloseStatusDescription,
                cancellationToken);
        }
    }

    private async Task<OperationMessage> HandleMessageAsync(
        OperationMessage message,
        IServiceProvider serviceProvider)
    {
        switch (message.Type)
        {
            case "connection_init":
                return new OperationMessage { Type = "connection_ack" };

            case "start":
                var payload = JsonSerializer.Deserialize<GraphQLRequest>(
                    message.Payload?.ToString() ?? "{}");

                if (payload == null)
                {
                    return new OperationMessage
                    {
                        Type = "error",
                        Id = message.Id,
                        Payload = new { message = "Invalid request payload" }
                    };
                }

                var result = await _documentExecuter.ExecuteAsync(options =>
                {
                    options.Schema = _schema;
                    options.Query = payload.Query;
                    options.OperationName = payload.OperationName;
                    options.Variables = payload.Variables;
                    options.RequestServices = serviceProvider;
                });

                return new OperationMessage
                {
                    Type = "data",
                    Id = message.Id,
                    Payload = result
                };

            default:
                return new OperationMessage
                {
                    Type = "error",
                    Id = message.Id,
                    Payload = new { message = "Unsupported message type" }
                };
        }
    }
}
