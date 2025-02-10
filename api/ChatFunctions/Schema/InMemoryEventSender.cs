using System.Collections.Concurrent;
using System.Threading.Channels;

namespace ChatFunctions.Schema;

public interface IMessageSender
{
    ValueTask SendAsync<T>(string key, T message, CancellationToken cancellationToken = default);
    IAsyncEnumerable<T> SubscribeAsync<T>(string key, CancellationToken cancellationToken = default);
}

public class InMemoryEventSender : IMessageSender
{
    private readonly ConcurrentDictionary<string, Channel<object>> _channels = new();

    public ValueTask SendAsync<T>(string key, T message, CancellationToken cancellationToken = default)
    {
        if (_channels.TryGetValue(key, out var channel))
        {
            return channel.Writer.WriteAsync(message!, cancellationToken);
        }

        return ValueTask.CompletedTask;
    }

    public async IAsyncEnumerable<T> SubscribeAsync<T>(string key, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var channel = _channels.GetOrAdd(key, _ => Channel.CreateUnbounded<object>());

        await foreach (var item in channel.Reader.ReadAllAsync(cancellationToken))
        {
            if (item is T typedItem)
            {
                yield return typedItem;
            }
        }
    }
}
