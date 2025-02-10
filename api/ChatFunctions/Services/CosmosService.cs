using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using ChatFunctions.Schema;

namespace ChatFunctions.Services;

public class CosmosService : ICosmosService
{
    private readonly CosmosClient _client;
    private readonly Container _messagesContainer;
    private readonly Container _conversationsContainer;
    private readonly ILogger<CosmosService> _logger;

    public CosmosService(string connectionString, ILogger<CosmosService> logger)
    {
        _client = new CosmosClient(connectionString);
        var database = _client.GetDatabase("ChatDb");
        _messagesContainer = database.GetContainer("Messages");
        _conversationsContainer = database.GetContainer("Conversations");
        _logger = logger;
    }

    public async Task<Message[]> GetMessagesAsync(string conversationId)
    {
        try
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

            return messages.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting messages for conversation {ConversationId}", conversationId);
            throw;
        }
    }

    public async Task<Conversation[]> GetConversationsAsync()
    {
        try
        {
            var query = new QueryDefinition("SELECT * FROM c ORDER BY c.createdAt DESC");
            var conversations = new List<Conversation>();
            var iterator = _conversationsContainer.GetItemQueryIterator<Conversation>(query);

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                conversations.AddRange(response);
            }

            return conversations.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting conversations");
            throw;
        }
    }

    public async Task<Conversation?> GetConversationAsync(string id)
    {
        try
        {
            var response = await _conversationsContainer.ReadItemAsync<Conversation>(
                id,
                new PartitionKey(id)
            );
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting conversation {ConversationId}", id);
            throw;
        }
    }

    public async Task SaveMessageAsync(Message message)
    {
        try
        {
            await _messagesContainer.CreateItemAsync(
                message,
                new PartitionKey(message.ConversationId)
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving message {MessageId}", message.Id);
            throw;
        }
    }

    public async Task SaveConversationAsync(Conversation conversation)
    {
        try
        {
            await _conversationsContainer.UpsertItemAsync(
                conversation,
                new PartitionKey(conversation.Id)
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving conversation {ConversationId}", conversation.Id);
            throw;
        }
    }
}
