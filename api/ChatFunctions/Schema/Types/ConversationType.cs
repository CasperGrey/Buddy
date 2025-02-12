using HotChocolate;
using HotChocolate.Types;
using HotChocolate.Types.Pagination;

namespace ChatFunctions.Schema;

[ObjectType<Conversation>]
public static partial class ConversationNode
{
    static partial void Configure(IObjectTypeDescriptor<Conversation> descriptor);

    static partial void Configure(IObjectTypeDescriptor<Conversation> descriptor)
    {
        descriptor.Name("Conversation")
            .Description("A chat conversation");

        descriptor.Field(f => f.Id)
            .Type<IdType>()
            .Description("The unique identifier of the conversation");

        descriptor.Field(f => f.Model)
            .Description("The AI model used for this conversation");

        descriptor.Field(f => f.CreatedAt)
            .Description("When the conversation was created");

        descriptor.Field(f => f.Messages)
            .UsePaging()
            .Description("Messages in this conversation");
    }
}

[UnionType]
public interface IConversationResult
{
    string? __typename => GetType().Name;
}

public sealed class ConversationSuccess : IConversationResult
{
    public Conversation Conversation { get; init; } = default!;
}

public sealed class ConversationNotFound : IConversationResult
{
    public string ConversationId { get; init; } = default!;
    public string Message { get; init; } = default!;
}

public sealed class ConversationAccessDenied : IConversationResult
{
    public string Message { get; init; } = default!;
}

public sealed class ConversationError : IConversationResult
{
    public ChatError Error { get; init; } = default!;
}
