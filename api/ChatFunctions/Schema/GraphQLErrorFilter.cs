using HotChocolate;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ChatFunctions.Schema;

public class GraphQLErrorFilter : IErrorFilter
{
    private readonly ILogger<GraphQLErrorFilter> _logger;
    private readonly string _environment;

    public GraphQLErrorFilter(
        ILogger<GraphQLErrorFilter> logger)
    {
        _logger = logger;
        _environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
    }

    public IError OnError(IError error)
    {
        var errorCode = error.Code ?? "UNKNOWN_ERROR";
        var errorPath = error.Path?.Print() ?? "unknown_path";
        
        // Log detailed error information
        _logger.LogError(
            error.Exception,
            "GraphQL error occurred. Code: {ErrorCode}, Path: {Path}, Message: {Message}",
            errorCode,
            errorPath,
            error.Message);

        if (error.Exception != null)
        {
            _logger.LogError(
                "Exception details - Type: {Type}, StackTrace: {StackTrace}",
                error.Exception.GetType().Name,
                error.Exception.StackTrace);
        }

        // In development, return detailed error information
        if (_environment == "Development")
        {
            return error
                .WithMessage(error.Message)
                .WithCode(errorCode)
                .WithExtensions(new Dictionary<string, object?>
                {
                    ["timestamp"] = DateTimeOffset.UtcNow,
                    ["path"] = errorPath,
                    ["details"] = error.Exception?.Message ?? "No additional details",
                    ["stackTrace"] = _environment == "Development" ? error.Exception?.StackTrace : null
                }.AsReadOnly());
        }

        // In production, return sanitized error information
        var userMessage = error.Code switch
        {
            "PERSISTED_QUERY_NOT_FOUND" => "Invalid query",
            "VALIDATION_ERROR" => "Invalid request format",
            "AUTH_NOT_AUTHORIZED" => "Not authorized",
            "AUTH_NOT_AUTHENTICATED" => "Authentication required",
            _ => "An unexpected error occurred. Please try again later."
        };

        return error
            .WithMessage(userMessage)
            .WithCode(errorCode)
            .WithExtensions(new Dictionary<string, object?>
            {
                ["timestamp"] = DateTimeOffset.UtcNow,
                ["errorId"] = Guid.NewGuid().ToString()
            }.AsReadOnly());
    }
}
