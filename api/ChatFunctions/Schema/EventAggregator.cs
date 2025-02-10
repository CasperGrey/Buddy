using System.Collections.Concurrent;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using GraphQL.Types;

namespace ChatFunctions.Schema;

public interface IEventAggregator
{
    IObservable<T> GetStream<T>(string key);
    void Publish<T>(string key, T message);
}

public class EventAggregator : IEventAggregator
{
    private readonly ConcurrentDictionary<string, Subject<object>> _subjects = new();

    public IObservable<T> GetStream<T>(string key)
    {
        var subject = _subjects.GetOrAdd(key, _ => new Subject<object>());
        return subject.OfType<T>();
    }

    public void Publish<T>(string key, T message)
    {
        if (_subjects.TryGetValue(key, out var subject))
        {
            subject.OnNext(message);
        }
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

    public string Message { get; }
    public string Code { get; }
    public string ConversationId { get; }
}

public class ChatErrorType : ObjectGraphType<ChatError>
{
    public ChatErrorType()
    {
        Name = "ChatError";
        Description = "Represents an error that occurred during chat operations";

        Field(e => e.Message, nullable: false).Description("The error message");
        Field(e => e.Code, nullable: false).Description("The error code");
        Field(e => e.ConversationId, nullable: false).Description("The conversation ID if applicable");
    }
}
