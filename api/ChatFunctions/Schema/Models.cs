namespace ChatFunctions.Schema;

public class Message
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class Conversation
{
    public string Id { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SendMessageInput
{
    public string Content { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
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
