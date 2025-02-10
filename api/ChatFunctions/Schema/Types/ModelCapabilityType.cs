using GraphQL.Types;

namespace ChatFunctions.Schema.Types;

public class ModelCapability
{
    public string Name { get; set; } = string.Empty;
    public List<string> Capabilities { get; set; } = new();
    public int MaxTokens { get; set; }
}

public class ModelCapabilityType : ObjectGraphType<ModelCapability>
{
    public ModelCapabilityType()
    {
        Name = "ModelCapability";
        Description = "Capabilities and constraints of a language model";

        Field(m => m.Name).Description("The name of the model");
        Field(m => m.Capabilities, type: typeof(ListGraphType<StringGraphType>))
            .Description("List of capabilities supported by this model");
        Field(m => m.MaxTokens).Description("Maximum number of tokens supported by the model");
    }
}
