using GraphQL.Types;

namespace ChatFunctions.Schema.Types;

public class MessageType : ObjectGraphType<Message>
{
    public MessageType()
    {
        Name = "Message";
        Description = "A chat message";

        Field(m => m.Id).Description("The unique identifier of the message");
        Field(m => m.Content).Description("The content of the message");
        Field(m => m.Role).Description("The role of the message sender (user/assistant)");
        Field(m => m.ConversationId).Description("The conversation this message belongs to");
        Field(m => m.Timestamp).Description("When the message was sent");
    }
}

public class MessageInputType : InputObjectGraphType
{
    public MessageInputType()
    {
        Name = "MessageInput";
        Description = "Input type for sending a message";

        Field<NonNullGraphType<StringGraphType>>("content")
            .Description("The content of the message");
        Field<NonNullGraphType<StringGraphType>>("conversationId")
            .Description("The conversation to send the message to");
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
