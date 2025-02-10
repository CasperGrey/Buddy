using GraphQL.Types;
using ChatFunctions.Services;

namespace ChatFunctions.Schema.Types;

public class QueryType : ObjectGraphType
{
    public QueryType(ICosmosService cosmosService)
    {
        Name = "Query";
        Description = "The query type for all read operations";

        Field<NonNullGraphType<ListGraphType<NonNullGraphType<MessageType>>>>()
            .Name("messages")
            .Argument<NonNullGraphType<IdGraphType>>("conversationId", "The ID of the conversation")
            .ResolveAsync(async context =>
            {
                var conversationId = context.GetArgument<string>("conversationId");
                return await cosmosService.GetMessagesAsync(conversationId);
            });

        Field<NonNullGraphType<ListGraphType<NonNullGraphType<ConversationType>>>>()
            .Name("conversations")
            .ResolveAsync(async context =>
            {
                return await cosmosService.GetConversationsAsync();
            });

        Field<ConversationType>()
            .Name("conversation")
            .Argument<NonNullGraphType<IdGraphType>>("id", "The ID of the conversation")
            .ResolveAsync(async context =>
            {
                var id = context.GetArgument<string>("id");
                return await cosmosService.GetConversationAsync(id);
            });
    }
}
