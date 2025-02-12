using HotChocolate;
using HotChocolate.Types;
using ChatFunctions.Services;

namespace ChatFunctions.Schema;

[MutationType]
public static partial class MutationNode
{
    [Error<ConversationNotFoundException>]
    public static async Task<SendMessagePayload> SendMessageAsync(
        SendMessageInput input,
        [Service] ICosmosService cosmosService,
        [Service] IModelService modelService,
        CancellationToken cancellationToken)
    {
        // Verify conversation exists
        var conversation = await cosmosService.GetConversationAsync(input.ConversationId, cancellationToken);
        if (conversation == null)
        {
            throw new ConversationNotFoundException(input.ConversationId);
        }

        // Create user message
        var userMessage = new Message
        {
            Id = Guid.NewGuid().ToString(),
            Content = input.Content,
            Role = "user",
            ConversationId = input.ConversationId,
            Timestamp = DateTime.UtcNow
        };

        // Save user message
        await cosmosService.SaveMessageAsync(userMessage, cancellationToken);

        // Get AI response
        var capabilities = await modelService.GetModelCapabilitiesAsync(cancellationToken);
        var model = capabilities.First(c => c.Name == conversation.Model);
        var aiResponse = await modelService.GetCompletionAsync(conversation, userMessage, model, cancellationToken);

        // Create AI message
        var aiMessage = new Message
        {
            Id = Guid.NewGuid().ToString(),
            Content = aiResponse,
            Role = "assistant",
            ConversationId = input.ConversationId,
            Timestamp = DateTime.UtcNow
        };

        // Save AI message
        await cosmosService.SaveMessageAsync(aiMessage, cancellationToken);

        return new SendMessagePayload(aiMessage);
    }

    [Error<ModelNotSupportedException>]
    public static async Task<CreateConversationPayload> CreateConversationAsync(
        CreateConversationInput input,
        [Service] ICosmosService cosmosService,
        [Service] IModelService modelService,
        CancellationToken cancellationToken)
    {
        // Verify model exists
        var capabilities = await modelService.GetModelCapabilitiesAsync(cancellationToken);
        if (!capabilities.Any(c => c.Name == input.Model))
        {
            throw new ModelNotSupportedException(input.Model);
        }

        // Create conversation
        var conversation = new Conversation
        {
            Id = Guid.NewGuid().ToString(),
            Model = input.Model,
            CreatedAt = DateTime.UtcNow,
            Messages = Array.Empty<Message>()
        };

        // Save conversation
        await cosmosService.SaveConversationAsync(conversation, cancellationToken);

        return new CreateConversationPayload(conversation);
    }
}
