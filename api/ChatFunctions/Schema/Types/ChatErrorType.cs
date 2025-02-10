using GraphQL.Types;
using ChatFunctions.Schema;

namespace ChatFunctions.Schema.Types;

public class ChatErrorType : ObjectGraphType<ChatError>
{
    public ChatErrorType()
    {
        Name = "ChatError";
        Description = "Represents an error that occurred during chat operations";

        Field(e => e.Message).Description("The error message");
        Field(e => e.Code).Description("The error code");
        Field(e => e.ConversationId, type: typeof(NonNullGraphType<IdGraphType>))
            .Description("The conversation ID if applicable");
    }
}
