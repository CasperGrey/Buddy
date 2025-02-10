using ChatFunctions.Schema.Types;

namespace ChatFunctions.Services;

public interface IModelService
{
    Task<ModelCapability[]> GetModelCapabilitiesAsync();
}

public class ModelService : IModelService
{
    public Task<ModelCapability[]> GetModelCapabilitiesAsync()
    {
        // Hardcoded for now, could be moved to configuration or external service
        return Task.FromResult(new[]
        {
            new ModelCapability
            {
                Name = "gpt-4",
                Capabilities = new List<string> { "chat", "function-calling", "system-messages" },
                MaxTokens = 8192
            },
            new ModelCapability
            {
                Name = "claude-2",
                Capabilities = new List<string> { "chat", "system-messages", "code-generation" },
                MaxTokens = 100000
            }
        });
    }
}
