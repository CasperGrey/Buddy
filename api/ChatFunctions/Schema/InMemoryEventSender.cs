using HotChocolate.Subscriptions;

namespace ChatFunctions.Schema;

public interface IMessageSender
{
    Task SendMessageAsync(Message message);
    Task SendConversationUpdatedAsync(Conversation conversation);
}

public sealed class InMemoryEventSender : IMessageSender
{
    private readonly ITopicEventSender _eventSender;

    public InMemoryEventSender(ITopicEventSender eventSender)
    {
        _eventSender = eventSender;
    }

    public async Task SendMessageAsync(Message message)
    {
        await _eventSender.SendAsync(
            $"Message_{message.ConversationId}",
            message);
    }

    public async Task SendConversationUpdatedAsync(Conversation conversation)
    {
        await _eventSender.SendAsync(
            $"Conversation_{conversation.Id}",
            conversation);
    }
}
