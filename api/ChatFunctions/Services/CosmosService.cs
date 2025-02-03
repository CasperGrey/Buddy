using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
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
    private readonly ILogger<CosmosService> _logger;
    private readonly CosmosClientOptions _options;

    public CosmosService(string connectionString, ILogger<CosmosService> logger)
    {
        _logger = logger;
        _options = new CosmosClientOptions
        {
            MaxRetryAttemptsOnRateLimitedRequests = 3,
            MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(60),
            SerializerOptions = new CosmosSerializationOptions
            {
                PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
            }
        };

        _client = new CosmosClient(connectionString, _options);
        var database = _client.GetDatabase("ChatDB");
        _messagesContainer = database.GetContainer("Messages");
        _conversationsContainer = database.GetContainer("Conversations");
        
        _logger.LogInformation("CosmosService initialized with database: {Database}", database.Id);
    }

    public async Task<IEnumerable<Message>> GetMessagesAsync(string conversationId)
    {
        try
        {
            _logger.LogInformation("Fetching messages for conversation: {ConversationId}", conversationId);

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

            _logger.LogInformation("Retrieved {Count} messages for conversation {ConversationId}", 
                messages.Count, conversationId);

            return messages;
        }
        catch (CosmosException ex)
        {
            _logger.LogError(ex, "Cosmos DB error fetching messages for conversation {ConversationId}: {Message}", 
                conversationId, ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching messages for conversation {ConversationId}: {Message}", 
                conversationId, ex.Message);
            throw;
        }
    }

    public async Task<IEnumerable<Conversation>> GetConversationsAsync()
    {
        try
        {
            _logger.LogInformation("Fetching all conversations");

            var query = new QueryDefinition("SELECT * FROM c ORDER BY c.createdAt DESC");
            var conversations = new List<Conversation>();
            var iterator = _conversationsContainer.GetItemQueryIterator<Conversation>(query);

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                conversations.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} conversations", conversations.Count);

            return conversations;
        }
        catch (CosmosException ex)
        {
            _logger.LogError(ex, "Cosmos DB error fetching conversations: {Message}", ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching conversations: {Message}", ex.Message);
            throw;
        }
    }

    public async Task SaveMessageAsync(Message message, string conversationId)
    {
        try
        {
            _logger.LogInformation("Saving message for conversation {ConversationId}", conversationId);

            await _messagesContainer.CreateItemAsync(new
            {
                id = message.Id,
                conversationId,
                content = message.Content,
                role = message.Role,
                timestamp = message.Timestamp
            });

            _logger.LogInformation("Successfully saved message {MessageId} for conversation {ConversationId}", 
                message.Id, conversationId);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            _logger.LogWarning("Message {MessageId} already exists for conversation {ConversationId}", 
                message.Id, conversationId);
            // Ignore duplicate message
        }
        catch (CosmosException ex)
        {
            _logger.LogError(ex, "Cosmos DB error saving message {MessageId} for conversation {ConversationId}: {Message}", 
                message.Id, conversationId, ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error saving message {MessageId} for conversation {ConversationId}: {Message}", 
                message.Id, conversationId, ex.Message);
            throw;
        }
    }

    public async Task SaveConversationAsync(Conversation conversation)
    {
        try
        {
            _logger.LogInformation("Saving new conversation with ID {ConversationId}", conversation.Id);

            await _conversationsContainer.CreateItemAsync(new
            {
                id = conversation.Id,
                model = conversation.Model,
                createdAt = conversation.CreatedAt
            });

            _logger.LogInformation("Successfully saved conversation {ConversationId}", conversation.Id);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            _logger.LogWarning("Conversation {ConversationId} already exists", conversation.Id);
            // Ignore duplicate conversation
        }
        catch (CosmosException ex)
        {
            _logger.LogError(ex, "Cosmos DB error saving conversation {ConversationId}: {Message}", 
                conversation.Id, ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error saving conversation {ConversationId}: {Message}", 
                conversation.Id, ex.Message);
            throw;
        }
    }
}
