using ChatFunctions.Services;
using GraphQL;
using GraphQL.Types;

namespace ChatFunctions.Schema.Types;

public class QueryType : ObjectGraphType
{
    public QueryType(ICosmosService cosmosService)
    {
        Name = "Query";

        Field<ListGraphType<MessageType>>("messages")
            .Argument<NonNullGraphType<StringGraphType>>("conversationId", "The ID of the conversation")
            .ResolveAsync(async context =>
            {
                var conversationId = context.GetArgument<string>("conversationId");
                return await cosmosService.GetMessagesAsync(conversationId);
            });

        Field<ListGraphType<ConversationType>>("conversations")
            .ResolveAsync(async context =>
            {
                return await cosmosService.GetConversationsAsync();
            });
    }
}

public class ConversationType : ObjectGraphType<Conversation>
{
    public ConversationType()
    {
        Name = "Conversation";
        Description = "A chat conversation";

        Field(c => c.Id).Description("The unique identifier of the conversation");
        Field(c => c.Title).Description("The title of the conversation");
        Field(c => c.Model).Description("The AI model used in this conversation");
        Field(c => c.CreatedAt).Description("When the conversation was created");
        Field(c => c.UpdatedAt).Description("When the conversation was last updated");
    }
}

public class Conversation
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
