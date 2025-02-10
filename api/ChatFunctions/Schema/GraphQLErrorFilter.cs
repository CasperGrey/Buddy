using GraphQL;
using Microsoft.Extensions.Logging;

namespace ChatFunctions.Schema;

public class GraphQLErrorFilter : IErrorInfoProvider
{
    private readonly ILogger<GraphQLErrorFilter> _logger;
    private readonly IEventAggregator _eventAggregator;

    public GraphQLErrorFilter(ILogger<GraphQLErrorFilter> logger, IEventAggregator eventAggregator)
    {
        _logger = logger;
        _eventAggregator = eventAggregator;
    }

    public ErrorInfo GetInfo(ExecutionError error)
    {
        _logger.LogError(error, "GraphQL error: {Message}", error.Message);

        var code = error.Data?.ContainsKey("Code") == true
            ? error.Data["Code"]?.ToString()
            : "INTERNAL_ERROR";

        var conversationId = error.Data?.ContainsKey("ConversationId") == true
            ? error.Data["ConversationId"]?.ToString()
            : null;

        _eventAggregator.Publish("errors", new ChatError(error.Message, code, conversationId));

        return new ErrorInfo(error)
        {
            Message = error.Message,
            Extensions = new Dictionary<string, object?>
            {
                { "code", code },
                { "conversationId", conversationId }
            }
        };
    }
}
