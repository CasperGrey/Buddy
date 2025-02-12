using HotChocolate;
using HotChocolate.Types;

namespace ChatFunctions.Schema;

[ObjectType<ModelCapability>]
public static partial class ModelCapabilityNode
{
    static partial void Configure(IObjectTypeDescriptor<ModelCapability> descriptor);

    static partial void Configure(IObjectTypeDescriptor<ModelCapability> descriptor)
    {
        descriptor.Name("ModelCapability")
            .Description("Capabilities of an AI model");

        descriptor.Field(f => f.Name)
            .Description("The name of the model");
        
        descriptor.Field(f => f.Capabilities)
            .Description("List of capabilities supported by this model");
        
        descriptor.Field(f => f.MaxTokens)
            .Description("Maximum number of tokens supported by this model");
    }
}

[UnionType]
public interface IModelCapabilityResult
{
    string? __typename => GetType().Name;
}

public sealed class ModelCapabilitySuccess : IModelCapabilityResult
{
    public ModelCapability Model { get; init; } = default!;
}

public sealed class ModelCapabilityNotFound : IModelCapabilityResult
{
    public string ModelName { get; init; } = default!;
    public string Message { get; init; } = default!;
}

public sealed class ModelCapabilityFailure : IModelCapabilityResult
{
    public ChatError Error { get; init; } = default!;
}
