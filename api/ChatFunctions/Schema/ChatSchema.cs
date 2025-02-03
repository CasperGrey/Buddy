using HotChocolate;
using HotChocolate.Types;
using HotChocolate.Subscriptions;
using ChatFunctions.Services;
using Azure.Messaging.EventGrid;

namespace ChatFunctions.Schema;

public class ChatQueries
{
    public async Task<IEnumerable<Conversation>> GetConversations(
        [Service] ICosmosService cosmosService)
    {
        return await cosmosService.GetConversationsAsync();
    }

    public async Task<IEnumerable<Message>> GetMessages(
        [Service] ICosmosService cosmosService,
        string conversationId)
    {
        return await cosmosService.GetMessagesAsync(conversationId);
    }

    public IEnumerable<AIModel> GetModelCapabilities()
    {
        return new[]
        {
            new AIModel 
            { 
                Name = "claude-3-opus-20240229",
                Capabilities = new[] { "chat", "function-calling", "vision" },
                MaxTokens = 4096
            },
            new AIModel
            {
                Name = "deepseek-coder",
                Capabilities = new[] { "chat", "code-generation", "code-analysis" },
                MaxTokens = 8192
            }
        };
    }
}

public class ChatMutations
{
    public async Task<Message> SendMessage(
        [Service] EventGridPublisherClient eventGridClient,
        [Service] ICosmosService cosmosService,
        [Service] ITopicEventSender eventSender,
        MessageInput input)
    {
        var message = new Message
        {
            Id = Guid.NewGuid().ToString(),
            Content = input.Content,
            Role = "user",
            Timestamp = DateTime.UtcNow,
            ConversationId = input.ConversationId
        };

        await cosmosService.SaveMessageAsync(message, input.ConversationId);
        
        // Publish event to Event Grid
        await eventGridClient.SendEventAsync(new EventGridEvent(
            subject: $"conversation/{input.ConversationId}/message/{message.Id}",
            eventType: "ChatApp.MessageReceived",
            dataVersion: "1.0",
            data: new BinaryData(message)));

        // Publish to GraphQL subscriptions
        await eventSender.SendAsync(input.ConversationId, message);

        return message;
    }

    public async Task<Conversation> StartConversation(
        [Service] ICosmosService cosmosService,
        string model)
    {
        var conversation = new Conversation
        {
            Id = Guid.NewGuid().ToString(),
            Model = model,
            CreatedAt = DateTime.UtcNow
        };

        await cosmosService.SaveConversationAsync(conversation);
        return conversation;
    }
}

public class MessageType : ObjectType<Message>
{
    protected override void Configure(IObjectTypeDescriptor<Message> descriptor)
    {
        descriptor.Field(m => m.Id).Type<NonNullType<IdType>>();
        descriptor.Field(m => m.Content).Type<NonNullType<StringType>>();
        descriptor.Field(m => m.Role).Type<NonNullType<StringType>>();
        descriptor.Field(m => m.Timestamp).Type<NonNullType<DateTimeType>>();
        descriptor.Field(m => m.ConversationId).Type<NonNullType<StringType>>();
    }
}

public class ConversationType : ObjectType<Conversation>
{
    protected override void Configure(IObjectTypeDescriptor<Conversation> descriptor)
    {
        descriptor.Field(c => c.Id).Type<NonNullType<IdType>>();
        descriptor.Field(c => c.Model).Type<NonNullType<StringType>>();
        descriptor.Field(c => c.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor.Field<ChatResolvers>(r => r.GetMessages(default!, default!))
            .Type<NonNullType<ListType<NonNullType<MessageType>>>>();
    }
}

public class ChatResolvers
{
    public async Task<IEnumerable<Message>> GetMessages(
        [Parent] Conversation conversation,
        [Service] ICosmosService cosmosService)
    {
        return await cosmosService.GetMessagesAsync(conversation.Id);
    }
}

public record Message
{
    public string Id { get; init; } = default!;
    public string Content { get; init; } = default!;
    public string Role { get; init; } = default!;
    public DateTime Timestamp { get; init; }
    public string ConversationId { get; init; } = default!;
}

public record Conversation
{
    public string Id { get; init; } = default!;
    public string Model { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}

public class MessageInputType : InputObjectType<MessageInput>
{
    protected override void Configure(IInputObjectTypeDescriptor<MessageInput> descriptor)
    {
        descriptor.Field(f => f.Content).Type<NonNullType<StringType>>();
        descriptor.Field(f => f.ConversationId).Type<NonNullType<StringType>>();
    }
}

public class MessageInput
{
    public string Content { get; init; } = default!;
    public string ConversationId { get; init; } = default!;
}

public record AIModel
{
    public string Name { get; init; } = default!;
    public string[] Capabilities { get; init; } = default!;
    public int MaxTokens { get; init; }
}
