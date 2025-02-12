using HotChocolate;
using HotChocolate.Types;

namespace ChatFunctions.Schema;

[ObjectType<ChatError>]
public static partial class ChatErrorNode
{
    static partial void Configure(IObjectTypeDescriptor<ChatError> descriptor);

    static partial void Configure(IObjectTypeDescriptor<ChatError> descriptor)
    {
        descriptor.Name("ChatError")
            .Description("An error that occurred during a chat operation");

        descriptor.Field(f => f.Message)
            .Description("A human-readable error message");

        descriptor.Field(f => f.Code)
            .Description("A machine-readable error code");

        descriptor.Field(f => f.ConversationId)
            .Type<IdType>()
            .Description("The conversation ID related to this error, if any");
    }
}

[UnionType]
public interface IChatResult
{
    string? __typename => GetType().Name;
}

public sealed class ChatSuccess : IChatResult
{
    public object Data { get; init; } = default!;
}

public sealed class ChatFailure : IChatResult
{
    public ChatError Error { get; init; } = default!;
}
