using HotChocolate.Subscriptions;

namespace ChatFunctions.Schema;

public class InMemoryEventSender : ITopicEventSender
{
    private readonly Dictionary<string, List<object>> _events = new();

    public IReadOnlyList<object> GetEvents(string topic)
    {
        if (_events.TryGetValue(topic, out var events))
        {
            return events.AsReadOnly();
        }
        return Array.Empty<object>();
    }

    public async ValueTask SendAsync(string topic, object message, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(topic);
        ArgumentNullException.ThrowIfNull(message);

        if (!_events.ContainsKey(topic))
        {
            _events[topic] = new List<object>();
        }
        _events[topic].Add(message);
        await Task.CompletedTask;
    }

    ValueTask ITopicEventSender.SendAsync<TMessage>(string topic, TMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(topic);
        ArgumentNullException.ThrowIfNull(message);
        
        return SendAsync(topic, (object)message, cancellationToken);
    }

    public ValueTask CompleteAsync(string topic)
    {
        if (_events.ContainsKey(topic))
        {
            _events.Remove(topic);
        }
        return ValueTask.CompletedTask;
    }
}
