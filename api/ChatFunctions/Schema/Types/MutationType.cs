using ChatFunctions.Services;
using GraphQL;
using GraphQL.Types;

namespace ChatFunctions.Schema.Types;

public class MutationType : ObjectGraphType
{
    public MutationType(ICosmosService cosmosService, IEventAggregator eventAggregator)
    {
        Field<MessageType>("sendMessage")
            .Argument<NonNullGraphType<MessageInputType>>("input")
            .ResolveAsync(async context =>
            {
                var input = context.GetArgument<MessageInput>("input");
                var message = new Message
                {
                    Id = Guid.NewGuid().ToString(),
                    Content = input.Content,
                    ConversationId = input.ConversationId,
                    Role = "user",
                    Timestamp = DateTime.UtcNow
                };

                await cosmosService.SaveMessageAsync(message);
                eventAggregator.Publish(input.ConversationId, message);
                return message;
            });

        Field<ConversationType>("startConversation")
            .Argument<NonNullGraphType<StringGraphType>>("model")
            .ResolveAsync(async context =>
            {
                var model = context.GetArgument<string>("model");
                var conversation = new Conversation
                {
                    Id = Guid.NewGuid().ToString(),
                    Title = "New Chat",
                    Model = model,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await cosmosService.SaveConversationAsync(conversation);
                return conversation;
            });
    }
}

public class MessageInput
{
    public string Content { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
}
