using HotChocolate;

namespace ChatFunctions.Schema;

public sealed class Message
{
    public required string Id { get; init; }
    public required string Content { get; init; }
    public required string Role { get; init; }
    public required string ConversationId { get; init; }
    public required DateTime Timestamp { get; init; }
}

public sealed class Conversation
{
    public required string Id { get; init; }
    public required string Model { get; init; }
    public required DateTime CreatedAt { get; init; }
    public IEnumerable<Message> Messages { get; init; } = Array.Empty<Message>();
}

public sealed class ChatError
{
    public ChatError(string message, string code, string? conversationId = null)
    {
        Message = message;
        Code = code;
        ConversationId = conversationId;
    }

    public string Message { get; }
    public string Code { get; }
    public string? ConversationId { get; }
}

public sealed class ModelCapability
{
    public required string Name { get; init; }
    public required IReadOnlyList<string> Capabilities { get; init; }
    public required int MaxTokens { get; init; }
}

public sealed class ConversationNotFoundException : Exception
{
    public ConversationNotFoundException(string conversationId)
        : base($"Conversation {conversationId} not found")
    {
        ConversationId = conversationId;
    }

    public string ConversationId { get; }
}

public sealed class ModelNotSupportedException : Exception
{
    public ModelNotSupportedException(string model)
        : base($"Model {model} is not supported")
    {
        Model = model;
    }

    public string Model { get; }
}

public sealed class InvalidRequestException : Exception
{
    public InvalidRequestException(string message, string code = "INVALID_REQUEST")
        : base(message)
    {
        Code = code;
    }

    public string Code { get; }
}

public sealed class AuthenticationException : Exception
{
    public AuthenticationException(string message = "Authentication required")
        : base(message)
    {
    }
}

public sealed class AuthorizationException : Exception
{
    public AuthorizationException(string message = "Not authorized")
        : base(message)
    {
    }
}
