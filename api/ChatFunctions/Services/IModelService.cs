using ChatFunctions.Schema;

namespace ChatFunctions.Services;

public interface IModelService
{
    Task<IEnumerable<ModelCapability>> GetModelCapabilitiesAsync(CancellationToken cancellationToken = default);
    Task<bool> IsModelSupportedAsync(string model, CancellationToken cancellationToken = default);
    Task<string> GetCompletionAsync(Conversation conversation, Message message, ModelCapability model, CancellationToken cancellationToken = default);
}
