using GraphQL.Types;
using Microsoft.Extensions.DependencyInjection;
using ChatFunctions.Schema.Types;

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

        Field(c => c.Id).Description("The unique identifier of the conversation");
        Field(c => c.Model).Description("The model used for this conversation");
        Field(c => c.CreatedAt).Description("When the conversation was created");
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

        Field(x => x.Content).Description("The content of the message");
        Field(x => x.ConversationId).Description("The conversation to send the message to");
    }
}

public class ChatError
{
    public ChatError(string message, string code, string? conversationId = null)
    {
        Message = message;
        Code = code;
        ConversationId = conversationId ?? string.Empty;
    }

    public string Message { get; }
    public string Code { get; }
    public string ConversationId { get; }
}

public class ChatErrorType : ObjectGraphType<ChatError>
{
    public ChatErrorType()
    {
        Name = "ChatError";
        Description = "Represents an error that occurred during chat operations";

        Field(e => e.Message).Description("The error message");
        Field(e => e.Code).Description("The error code");
        Field(e => e.ConversationId).Description("The conversation ID if applicable");
    }
}
