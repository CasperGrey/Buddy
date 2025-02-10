using GraphQL;
using GraphQL.Types;
using ChatFunctions.Services;

namespace ChatFunctions.Schema.Types;

public class QueryType : ObjectGraphType
{
    public QueryType(ICosmosService cosmosService)
    {
        Name = "Query";
        Description = "The query type for all read operations";

        Field<NonNullGraphType<ListGraphType<NonNullGraphType<MessageType>>>>("messages")
            .Description("Get messages for a conversation")
            .Argument<NonNullGraphType<StringGraphType>>("conversationId", "The ID of the conversation")
            .ResolveAsync(async context =>
            {
                var conversationId = context.GetArgument<string>("conversationId");
                return await cosmosService.GetMessagesAsync(conversationId);
            });

        Field<NonNullGraphType<ListGraphType<NonNullGraphType<ConversationType>>>>("conversations")
            .Description("Get all conversations")
            .ResolveAsync(async context =>
            {
                return await cosmosService.GetConversationsAsync();
            });

        Field<ConversationType>("conversation")
            .Description("Get a specific conversation")
            .Argument<NonNullGraphType<StringGraphType>>("id", "The ID of the conversation")
            .ResolveAsync(async context =>
            {
                var id = context.GetArgument<string>("id");
                return await cosmosService.GetConversationAsync(id);
            });
    }
}
