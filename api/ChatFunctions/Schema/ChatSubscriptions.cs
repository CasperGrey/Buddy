using GraphQL;
using GraphQL.Types;
using GraphQL.Resolvers;
using ChatFunctions.Schema.Types;
using System.Reactive.Linq;

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
                var stream = messageSender.SubscribeAsync<Message>(conversationId);
                return Observable.Create<Message>(observer =>
                {
                    var cts = new CancellationTokenSource();
                    Task.Run(async () =>
                    {
                        try
                        {
                            await foreach (var message in stream.WithCancellation(cts.Token))
                            {
                                observer.OnNext(message);
                            }
                            observer.OnCompleted();
                        }
                        catch (Exception ex)
                        {
                            observer.OnError(ex);
                        }
                    }, cts.Token);
                    return () => cts.Cancel();
                });
            })
        });

        AddField(new FieldType
        {
            Name = "onError",
            Type = typeof(ChatErrorType),
            Resolver = new FuncFieldResolver<ChatError>(context => context.Source as ChatError),
            StreamResolver = new SourceStreamResolver<ChatError>(context =>
            {
                var stream = messageSender.SubscribeAsync<ChatError>("errors");
                return Observable.Create<ChatError>(observer =>
                {
                    var cts = new CancellationTokenSource();
                    Task.Run(async () =>
                    {
                        try
                        {
                            await foreach (var error in stream.WithCancellation(cts.Token))
                            {
                                observer.OnNext(error);
                            }
                            observer.OnCompleted();
                        }
                        catch (Exception ex)
                        {
                            observer.OnError(ex);
                        }
                    }, cts.Token);
                    return () => cts.Cancel();
                });
            })
        });
    }
}
