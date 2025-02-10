using GraphQL;
using GraphQL.Types;
using GraphQL.Resolvers;
using ChatFunctions.Schema.Types;

namespace ChatFunctions.Schema;

public class SubscriptionType : ObjectGraphType
{
    public SubscriptionType(IMessageSender messageSender)
    {
        Name = "Subscription";
        Description = "Subscriptions for real-time updates";

        AddField(new FieldType
        {
            Name = "messageReceived",
            Type = typeof(MessageType),
            Arguments = new QueryArguments(
                new QueryArgument<NonNullGraphType<IdGraphType>>
                {
                    Name = "conversationId",
                    Description = "The ID of the conversation to subscribe to"
                }
            ),
            Resolver = new FuncFieldResolver<Message>(context => context.Source as Message),
            StreamResolver = new SourceStreamResolver<Message>(context =>
            {
                var conversationId = context.GetArgument<string>("conversationId");
                return messageSender.SubscribeAsync<Message>(conversationId).ToObservable();
            })
        });

        AddField(new FieldType
        {
            Name = "onError",
            Type = typeof(ChatErrorType),
            Resolver = new FuncFieldResolver<ChatError>(context => context.Source as ChatError),
            StreamResolver = new SourceStreamResolver<ChatError>(context =>
                messageSender.SubscribeAsync<ChatError>("errors").ToObservable())
        });
    }
}
