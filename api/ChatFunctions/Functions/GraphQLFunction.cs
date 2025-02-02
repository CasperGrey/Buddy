using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using HotChocolate.Execution;

namespace ChatFunctions.Functions;

public class GraphQLFunction
{
    private readonly IRequestExecutor _executor;
    private readonly ILogger<GraphQLFunction> _logger;

    public GraphQLFunction(IRequestExecutor executor, ILoggerFactory loggerFactory)
    {
        _executor = executor;
        _logger = loggerFactory.CreateLogger<GraphQLFunction>();
    }

    [Function("graphql")]
    public async Task<HttpResponseData> HandleAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
    {
        _logger.LogInformation("Processing GraphQL request");

        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");

        try
        {
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

            var result = await _executor.ExecuteAsync(builder =>
            {
                builder.SetQuery(request.Query);
                if (request.Variables != null)
                    builder.SetVariableValues(request.Variables);
                if (request.OperationName != null)
                    builder.SetOperation(request.OperationName);
            });

            await response.WriteAsJsonAsync(result);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing GraphQL request");
            response.StatusCode = HttpStatusCode.InternalServerError;
            await response.WriteAsJsonAsync(new { error = ex.Message });
            return response;
        }
    }
}

public class GraphQLRequest
{
    public string? Query { get; set; }
    public string? OperationName { get; set; }
    public Dictionary<string, object?>? Variables { get; set; }
}
