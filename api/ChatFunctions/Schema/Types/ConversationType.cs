using GraphQL.Types;
using Microsoft.Extensions.DependencyInjection;
using ChatFunctions.Services;

namespace ChatFunctions.Schema.Types;

public class ConversationType : ObjectGraphType<Schema.Conversation>
{
    public ConversationType()
    {
        Name = "Conversation";
        Description = "A chat conversation";

        Field(c => c.Id, type: typeof(NonNullGraphType<IdGraphType>))
            .Description("The unique identifier of the conversation");
        Field(c => c.Model).Description("The model used for this conversation");
        Field(c => c.CreatedAt).Description("When the conversation was created");
        Field<NonNullGraphType<ListGraphType<NonNullGraphType<MessageType>>>>("messages")
            .Description("Messages in this conversation")
            .ResolveAsync(async context =>
            {
                var cosmosService = context.RequestServices!.GetRequiredService<ICosmosService>();
                return await cosmosService.GetMessagesAsync(context.Source.Id);
            });
    }
}
