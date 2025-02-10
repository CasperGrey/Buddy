using GraphQL.Types;
using ChatFunctions.Schema;

namespace ChatFunctions.Schema.Types;

public class SendMessageInputType : InputObjectGraphType<SendMessageInput>
{
    public SendMessageInputType()
    {
        Name = "SendMessageInput";
        Description = "Input for sending a message";

        Field(x => x.Content).Description("The content of the message");
        Field(x => x.ConversationId, type: typeof(NonNullGraphType<IdGraphType>))
            .Description("The conversation to send the message to");
    }
}
