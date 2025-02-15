using HotChocolate;
using HotChocolate.Types;
using HotChocolate.Types.Pagination;
using ChatFunctions.Services;

namespace ChatFunctions.Schema;

[QueryType]
public class QueryNode
{
    [UsePaging]
    [Error<ConversationNotFoundException>]
    public static async Task<IQueryable<Message>> GetMessagesAsync(
        string conversationId,
        [Service] ICosmosService cosmosService,
        CancellationToken cancellationToken)
    {
        var messages = await cosmosService.GetMessagesAsync(conversationId, cancellationToken);
        return messages.AsQueryable();
    }

    [UsePaging]
    public static async Task<IQueryable<Conversation>> GetConversationsAsync(
        [Service] ICosmosService cosmosService,
        CancellationToken cancellationToken)
    {
        var conversations = await cosmosService.GetConversationsAsync(cancellationToken);
        return conversations.AsQueryable();
    }

    [Error<ConversationNotFoundException>]
    public static async Task<Conversation> GetConversationAsync(
        string id,
        [Service] ICosmosService cosmosService,
        CancellationToken cancellationToken)
    {
        var conversation = await cosmosService.GetConversationAsync(id, cancellationToken);
        if (conversation == null)
        {
            throw new ConversationNotFoundException(id);
        }
        return conversation;
    }

    public static async Task<IEnumerable<ModelCapability>> GetModelCapabilitiesAsync(
        [Service] IModelService modelService,
        CancellationToken cancellationToken)
    {
        return await modelService.GetModelCapabilitiesAsync(cancellationToken);
    }
}
