using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using HotChocolate.AspNetCore;
using HotChocolate.Execution;
using System.Text.Json;
using System.Threading.Tasks;

namespace ChatFunctions.Functions;

public class GraphQLFunction
{
    private readonly ILogger<GraphQLFunction> _logger;
    private readonly IRequestExecutor _executor;

    public GraphQLFunction(
        IRequestExecutor executor,
        ILoggerFactory loggerFactory)
    {
        _executor = executor;
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

        // Parse request
        IQueryRequestBuilder requestBuilder = QueryRequestBuilder.New();
        if (HttpMethods.IsPost(req.Method))
        {
            using var reader = new StreamReader(req.Body);
            var json = await reader.ReadToEndAsync();
            var request = JsonSerializer.Deserialize<GraphQLRequest>(json);
            if (request?.Query != null)
            {
                requestBuilder.SetQuery(request.Query);
                if (request.Variables != null)
                {
                    requestBuilder.SetVariableValues(request.Variables);
                }
            }
        }
        else
        {
            var query = req.Query["query"].ToString();
            if (!string.IsNullOrEmpty(query))
            {
                requestBuilder.SetQuery(query);
                var variablesJson = req.Query["variables"].ToString();
                if (!string.IsNullOrEmpty(variablesJson))
                {
                    var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(variablesJson);
                    if (variables != null)
                    {
                        requestBuilder.SetVariableValues(variables);
                    }
                }
            }
        }

        // Execute request
        var result = await _executor.ExecuteAsync(requestBuilder.Create());
        return new OkObjectResult(result);
    }

    private class GraphQLRequest
    {
        public string? Query { get; set; }
        public Dictionary<string, object?>? Variables { get; set; }
    }
}
