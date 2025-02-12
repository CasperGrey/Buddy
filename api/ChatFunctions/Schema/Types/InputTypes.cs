using HotChocolate;
using HotChocolate.Types;

namespace ChatFunctions.Schema;

// Input Records
public record SendMessageInput
{
    public required string Content { get; init; }
    public required string ConversationId { get; init; }
}

[ObjectType<SendMessageInput>]
public static partial class SendMessageInputNode
{
    static partial void Configure(IObjectTypeDescriptor<SendMessageInput> descriptor);

    static partial void Configure(IObjectTypeDescriptor<SendMessageInput> descriptor)
    {
        descriptor.Name("SendMessageInput")
            .Description("Input for sending a message");

        descriptor.Field(f => f.Content)
            .Type<NonNullType<StringType>>()
            .Description("The content of the message to send");

        descriptor.Field(f => f.ConversationId)
            .Type<NonNullType<IdType>>()
            .Description("The ID of the conversation to send the message to");
    }
}

public record CreateConversationInput
{
    public required string Model { get; init; }
}

// Payload Records
public record SendMessagePayload(Message Message);

public record CreateConversationPayload(Conversation Conversation);
