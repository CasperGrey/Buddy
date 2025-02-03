using HotChocolate;
using HotChocolate.Types;
using HotChocolate.Subscriptions;

namespace ChatFunctions.Schema;

public class ChatSubscriptions : ObjectType
{
    protected override void Configure(IObjectTypeDescriptor descriptor)
    {
        descriptor.Name("Subscription");

        descriptor
            .Field("messageReceived")
            .Type<MessageType>()
            .Argument("conversationId", arg => arg.Type<NonNullType<StringType>>())
            .Resolve(context =>
            {
                var message = context.GetEventMessage<Message>();
                var conversationId = context.ArgumentValue<string>("conversationId");
                return message.ConversationId == conversationId ? message : null;
            })
            .Subscribe(async context =>
            {
                var conversationId = context.ArgumentValue<string>("conversationId");
                var receiver = context.Service<ITopicEventReceiver>();
                return await receiver.SubscribeAsync<Message>(conversationId);
            });

        descriptor
            .Field("onError")
            .Type<NonNullType<ObjectType<ChatError>>>()
            .Resolve(context => context.GetEventMessage<ChatError>())
            .Subscribe(async context =>
            {
                var receiver = context.Service<ITopicEventReceiver>();
                return await receiver.SubscribeAsync<ChatError>("Errors");
            });
    }
}

public class ChatError
{
    public ChatError(string message, string code, string? conversationId = null)
    {
        Message = message;
        Code = code;
        ConversationId = conversationId ?? string.Empty;
    }

    public string Message { get; init; }
    public string Code { get; init; }
    public string ConversationId { get; init; }
}
