using GraphQL;
using GraphQL.Types;
using ChatFunctions.Services;
using Azure.Messaging.EventGrid;
using System.Text.Json;

namespace ChatFunctions.Schema.Types;

public class MutationType : ObjectGraphType
{
    public MutationType(
        ICosmosService cosmosService,
        IMessageSender messageSender,
        EventGridPublisherClient eventGridClient)
    {
        Name = "Mutation";
        Description = "The mutation type for all write operations";

        Field<NonNullGraphType<MessageType>>("sendMessage")
            .Description("Send a new message")
            .Argument<NonNullGraphType<SendMessageInputType>>("input", "The message to send")
            .ResolveAsync(async context =>
            {
                var input = context.GetArgument<SendMessageInput>("input");
                
                // Create and save the message
                var message = new Schema.Message
                {
                    Id = Guid.NewGuid().ToString(),
                    Content = input.Content,
                    Role = "user",
                    ConversationId = input.ConversationId,
                    Timestamp = DateTime.UtcNow
                };

                await cosmosService.SaveMessageAsync(message);

                // Publish to subscribers
                await messageSender.SendAsync(message.ConversationId, message, context.CancellationToken);

                // Send to Event Grid for processing
                await eventGridClient.SendEventAsync(new EventGridEvent(
                    "ChatFunctions.MessageSent",
                    "Message.Sent",
                    "1.0",
                    JsonSerializer.Serialize(message)
                ));

                return message;
            });

        Field<NonNullGraphType<ConversationType>>("startConversation")
            .Description("Start a new conversation")
            .Argument<NonNullGraphType<StringGraphType>>("model", "The model to use for this conversation")
            .ResolveAsync(async context =>
            {
                var model = context.GetArgument<string>("model");
                
                var conversation = new Schema.Conversation
                {
                    Id = Guid.NewGuid().ToString(),
                    Model = model,
                    CreatedAt = DateTime.UtcNow
                };

                await cosmosService.SaveConversationAsync(conversation);
                return conversation;
            });
    }
}
