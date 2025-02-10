namespace ChatFunctions.Services;

public interface ICosmosService
{
    Task<Message[]> GetMessagesAsync(string conversationId);
    Task<Conversation[]> GetConversationsAsync();
    Task<Conversation?> GetConversationAsync(string id);
    Task SaveMessageAsync(Message message);
    Task SaveConversationAsync(Conversation conversation);
}
