using Microsoft.Azure.Cosmos;
using ChatFunctions.Schema;

namespace ChatFunctions.Services;

public interface ICosmosService
{
    Task<IEnumerable<Message>> GetMessagesAsync(string conversationId);
    Task<IEnumerable<Conversation>> GetConversationsAsync();
    Task SaveMessageAsync(Message message, string conversationId);
    Task SaveConversationAsync(Conversation conversation);
}

public class CosmosService : ICosmosService
{
    private readonly CosmosClient _client;
    private readonly Container _messagesContainer;
    private readonly Container _conversationsContainer;

    public CosmosService(string connectionString)
    {
        _client = new CosmosClient(connectionString);
        var database = _client.GetDatabase("ChatDB");
        _messagesContainer = database.GetContainer("Messages");
        _conversationsContainer = database.GetContainer("Conversations");
    }

    public async Task<IEnumerable<Message>> GetMessagesAsync(string conversationId)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.conversationId = @conversationId ORDER BY c.timestamp")
            .WithParameter("@conversationId", conversationId);

        var messages = new List<Message>();
        var iterator = _messagesContainer.GetItemQueryIterator<Message>(query);

        while (iterator.HasMoreResults)
        {
            var response = await iterator.ReadNextAsync();
            messages.AddRange(response);
        }

        return messages;
    }

    public async Task<IEnumerable<Conversation>> GetConversationsAsync()
    {
        var query = new QueryDefinition("SELECT * FROM c ORDER BY c.createdAt DESC");
        var conversations = new List<Conversation>();
        var iterator = _conversationsContainer.GetItemQueryIterator<Conversation>(query);

        while (iterator.HasMoreResults)
        {
            var response = await iterator.ReadNextAsync();
            conversations.AddRange(response);
        }

        return conversations;
    }

    public async Task SaveMessageAsync(Message message, string conversationId)
    {
        await _messagesContainer.CreateItemAsync(new
        {
            id = message.Id,
            conversationId,
            content = message.Content,
            role = message.Role,
            timestamp = message.Timestamp
        });
    }

    public async Task SaveConversationAsync(Conversation conversation)
    {
        await _conversationsContainer.CreateItemAsync(new
        {
            id = conversation.Id,
            model = conversation.Model,
            createdAt = conversation.CreatedAt
        });
    }
}
