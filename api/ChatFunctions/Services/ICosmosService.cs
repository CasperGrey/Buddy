using ChatFunctions.Schema;

namespace ChatFunctions.Services;

public interface ICosmosService
{
    Task<IEnumerable<Message>> GetMessagesAsync(string conversationId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Conversation>> GetConversationsAsync(CancellationToken cancellationToken = default);
    Task<Conversation?> GetConversationAsync(string id, CancellationToken cancellationToken = default);
    Task<Message> SaveMessageAsync(Message message, CancellationToken cancellationToken = default);
    Task<Conversation> SaveConversationAsync(Conversation conversation, CancellationToken cancellationToken = default);
}
