using GraphQL;
using GraphQL.Types;
using Microsoft.Extensions.DependencyInjection;

namespace ChatFunctions.Schema;

public class ChatSchema : GraphQL.Types.Schema
{
    public ChatSchema(IServiceProvider services) : base(services)
    {
        Query = services.GetRequiredService<QueryType>();
        Mutation = services.GetRequiredService<MutationType>();
        Subscription = services.GetRequiredService<SubscriptionType>();
    }
}

public class Message
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class MessageType : ObjectGraphType<Message>
{
    public MessageType()
    {
        Name = "Message";
        Description = "A chat message";

        Field(m => m.Id, nullable: false).Description("The unique identifier of the message");
        Field(m => m.Content, nullable: false).Description("The content of the message");
        Field(m => m.Role, nullable: false).Description("The role of the message sender (user/assistant)");
        Field(m => m.ConversationId, nullable: false).Description("The conversation this message belongs to");
        Field(m => m.Timestamp, nullable: false).Description("When the message was sent");
    }
}

public class Conversation
{
    public string Id { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ConversationType : ObjectGraphType<Conversation>
{
    public ConversationType()
    {
        Name = "Conversation";
        Description = "A chat conversation";

        Field(c => c.Id, nullable: false).Description("The unique identifier of the conversation");
        Field(c => c.Model, nullable: false).Description("The model used for this conversation");
        Field(c => c.CreatedAt, nullable: false).Description("When the conversation was created");
    }
}

public class SendMessageInput
{
    public string Content { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
}

public class SendMessageInputType : InputObjectGraphType<SendMessageInput>
{
    public SendMessageInputType()
    {
        Name = "SendMessageInput";
        Description = "Input for sending a message";

        Field(x => x.Content, nullable: false).Description("The content of the message");
        Field(x => x.ConversationId, nullable: false).Description("The conversation to send the message to");
    }
}
