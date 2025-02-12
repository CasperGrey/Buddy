using HotChocolate;

namespace ChatFunctions.Schema;

public sealed class GraphQLErrorFilter : IErrorFilter
{
    public IError OnError(IError error)
    {
        if (error.Exception is ConversationNotFoundException ex)
        {
            return error.WithCode("CONVERSATION_NOT_FOUND")
                .WithMessage(ex.Message)
                .SetExtension("conversationId", ex.ConversationId);
        }

        if (error.Exception is ModelNotSupportedException modelEx)
        {
            return error.WithCode("MODEL_NOT_SUPPORTED")
                .WithMessage(modelEx.Message)
                .SetExtension("model", modelEx.Model);
        }

        if (error.Exception is InvalidRequestException invalidEx)
        {
            return error.WithCode(invalidEx.Code)
                .WithMessage(invalidEx.Message);
        }

        if (error.Exception is AuthenticationException)
        {
            return error.WithCode("UNAUTHENTICATED")
                .WithMessage("Authentication required");
        }

        if (error.Exception is AuthorizationException)
        {
            return error.WithCode("UNAUTHORIZED")
                .WithMessage("Not authorized");
        }

        return error.WithCode("INTERNAL_SERVER_ERROR")
            .WithMessage("An unexpected error occurred.");
    }
}
