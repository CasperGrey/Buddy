using HotChocolate;
using HotChocolate.Types;

namespace ChatFunctions.Schema;

[ObjectType<CreateConversationInput>]
public static partial class CreateConversationInputNode
{
    static partial void Configure(IObjectTypeDescriptor<CreateConversationInput> descriptor);

    static partial void Configure(IObjectTypeDescriptor<CreateConversationInput> descriptor)
    {
        descriptor.Name("CreateConversationInput")
            .Description("Input for creating a new conversation");

        descriptor.Field(f => f.Model)
            .Type<NonNullType<StringType>>()
            .Description("The AI model to use for this conversation");
    }
}
