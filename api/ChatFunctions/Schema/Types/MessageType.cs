using HotChocolate;
using HotChocolate.Types;

namespace ChatFunctions.Schema;

[ObjectType<Message>]
public static partial class MessageNode
{
    static partial void Configure(IObjectTypeDescriptor<Message> descriptor);

    static partial void Configure(IObjectTypeDescriptor<Message> descriptor)
    {
        descriptor.Name("Message")
            .Description("A message in a conversation");

        descriptor.Field(f => f.Id)
            .Type<IdType>()
            .Description("The unique identifier of the message");

        descriptor.Field(f => f.Content)
            .Description("The content of the message");

        descriptor.Field(f => f.Role)
            .Description("The role of the message sender (user/assistant)");

        descriptor.Field(f => f.ConversationId)
            .Type<IdType>()
            .Description("The ID of the conversation this message belongs to");

        descriptor.Field(f => f.Timestamp)
            .Description("When the message was sent");
    }
}

[UnionType]
public interface IMessageResult
{
    string? __typename => GetType().Name;
}

public sealed class MessageSuccess : IMessageResult
{
    public Message Message { get; init; } = default!;
}

public sealed class MessageNotFound : IMessageResult
{
    public string MessageId { get; init; } = default!;
    public string Message { get; init; } = default!;
}

public sealed class MessageAccessDenied : IMessageResult
{
    public string Message { get; init; } = default!;
}

public sealed class MessageError : IMessageResult
{
    public ChatError Error { get; init; } = default!;
}
