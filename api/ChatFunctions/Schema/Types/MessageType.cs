using GraphQL.Types;
using ChatFunctions.Schema;

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
