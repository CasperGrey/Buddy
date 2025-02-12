using HotChocolate;
using HotChocolate.Types;

namespace ChatFunctions.Schema;

[SubscriptionType]
public static partial class SubscriptionNode
{
    [Subscribe]
    [Topic]
    public static ValueTask<Message> OnMessageSentAsync(
        [EventMessage] Message message) => 
        ValueTask.FromResult(message);

    [Subscribe]
    [Topic]
    public static ValueTask<Conversation> OnConversationCreatedAsync(
        [EventMessage] Conversation conversation) => 
        ValueTask.FromResult(conversation);
}
