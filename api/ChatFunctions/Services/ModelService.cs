using Microsoft.Extensions.Logging;
using ChatFunctions.Schema;

namespace ChatFunctions.Services;

public class ModelService : IModelService
{
    private readonly ILogger<ModelService> _logger;
    private static readonly IReadOnlyList<ModelCapability> _models = new[]
    {
        new ModelCapability
        {
            Name = "gpt-4",
            Capabilities = new[] { "chat", "function-calling", "system-messages" },
            MaxTokens = 8192
        },
        new ModelCapability
        {
            Name = "claude-2",
            Capabilities = new[] { "chat", "system-messages", "code-generation" },
            MaxTokens = 100000
        }
    };

    public ModelService(ILogger<ModelService> logger)
    {
        _logger = logger;
    }

    public Task<IEnumerable<ModelCapability>> GetModelCapabilitiesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving model capabilities");
            return Task.FromResult<IEnumerable<ModelCapability>>(_models);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving model capabilities");
            throw;
        }
    }

    public Task<bool> IsModelSupportedAsync(string model, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Checking if model {Model} is supported", model);
            return Task.FromResult(_models.Any(m => m.Name == model));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if model {Model} is supported", model);
            throw;
        }
    }

    public async Task<string> GetCompletionAsync(
        Conversation conversation, 
        Message message, 
        ModelCapability model, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Getting completion for message in conversation {ConversationId} using model {Model}", 
                conversation.Id, model.Name);
            
            // Implement your completion logic here
            await Task.Delay(100, cancellationToken); // Simulate async work
            
            return "Sample response";  // Replace with actual implementation
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting completion for message in conversation {ConversationId}", 
                conversation.Id);
            throw;
        }
    }
}
