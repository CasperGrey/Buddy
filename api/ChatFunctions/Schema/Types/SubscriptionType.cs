using GraphQL;
using GraphQL.Resolvers;
using GraphQL.Types;

namespace ChatFunctions.Schema.Types;

public class SubscriptionType : ObjectGraphType
{
    public SubscriptionType(IEventAggregator eventAggregator)
    {
        Name = "Subscription";

        AddField(new FieldType
        {
            Name = "messageReceived",
            Type = typeof(MessageType),
            Arguments = new QueryArguments(
                new QueryArgument<NonNullGraphType<StringGraphType>>
                {
                    Name = "conversationId",
                    Description = "The ID of the conversation to subscribe to"
                }
            ),
            Resolver = new FuncFieldResolver<Message>(context =>
            {
                var message = context.Source as Message;
                var conversationId = context.GetArgument<string>("conversationId");
                return message?.ConversationId == conversationId ? message : null;
            }),
            StreamResolver = new SourceStreamResolver<Message>(context =>
            {
                var conversationId = context.GetArgument<string>("conversationId");
                return eventAggregator.GetStream<Message>(conversationId);
            })
        });

        AddField(new FieldType
        {
            Name = "onError",
            Type = typeof(ChatErrorType),
            Resolver = new FuncFieldResolver<ChatError>(context =>
            {
                return context.Source as ChatError;
            }),
            StreamResolver = new SourceStreamResolver<ChatError>(context =>
            {
                return eventAggregator.GetStream<ChatError>("Errors");
            })
        });
    }
}
