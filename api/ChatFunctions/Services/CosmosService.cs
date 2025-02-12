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

    public async Task<IEnumerable<Message>> GetMessagesAsync(string conversationId, CancellationToken cancellationToken = default)
    {
        try
        {
            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.conversationId = @conversationId ORDER BY c.timestamp")
                .WithParameter("@conversationId", conversationId);

            var messages = new List<Message>();
            using var iterator = _messagesContainer.GetItemQueryIterator<Message>(query);

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync(cancellationToken);
                messages.AddRange(response);
            }

            return messages;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("No messages found for conversation {ConversationId}", conversationId);
            return Array.Empty<Message>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting messages for conversation {ConversationId}", conversationId);
            throw;
        }
    }

    public async Task<IEnumerable<Conversation>> GetConversationsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var query = new QueryDefinition("SELECT * FROM c ORDER BY c.createdAt DESC");
            var conversations = new List<Conversation>();
            using var iterator = _conversationsContainer.GetItemQueryIterator<Conversation>(query);

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync(cancellationToken);
                conversations.AddRange(response);
            }

            return conversations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting conversations");
            throw;
        }
    }

    public async Task<Conversation?> GetConversationAsync(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _conversationsContainer.ReadItemAsync<Conversation>(
                id,
                new PartitionKey(id),
                cancellationToken: cancellationToken
            );
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Conversation {ConversationId} not found", id);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting conversation {ConversationId}", id);
            throw;
        }
    }

    public async Task<Message> SaveMessageAsync(Message message, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _messagesContainer.CreateItemAsync(
                message,
                new PartitionKey(message.ConversationId),
                cancellationToken: cancellationToken
            );
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving message {MessageId} for conversation {ConversationId}", 
                message.Id, message.ConversationId);
            throw;
        }
    }

    public async Task<Conversation> SaveConversationAsync(Conversation conversation, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _conversationsContainer.UpsertItemAsync(
                conversation,
                new PartitionKey(conversation.Id),
                cancellationToken: cancellationToken
            );
            return response.Resource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving conversation {ConversationId}", conversation.Id);
            throw;
        }
    }
}
