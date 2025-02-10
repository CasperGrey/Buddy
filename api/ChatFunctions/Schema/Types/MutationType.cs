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
        IEventAggregator eventAggregator,
        EventGridPublisherClient eventGridClient)
    {
        Name = "Mutation";
        Description = "The mutation type for all write operations";

        Field<NonNullGraphType<MessageType>>()
            .Name("sendMessage")
            .Argument<NonNullGraphType<SendMessageInputType>>("input", "The message to send")
            .ResolveAsync(async context =>
            {
                var input = context.GetArgument<SendMessageInput>("input");
                
                // Create and save the message
                var message = new Message
                {
                    Id = Guid.NewGuid().ToString(),
                    Content = input.Content,
                    Role = "user",
                    ConversationId = input.ConversationId,
                    Timestamp = DateTime.UtcNow
                };

                await cosmosService.SaveMessageAsync(message);

                // Publish to subscribers
                eventAggregator.Publish(message.ConversationId, message);

                // Send to Event Grid for processing
                await eventGridClient.SendEventAsync(new EventGridEvent(
                    "ChatFunctions.MessageSent",
                    "Message.Sent",
                    "1.0",
                    JsonSerializer.Serialize(message)
                ));

                return message;
            });

        Field<NonNullGraphType<ConversationType>>()
            .Name("startConversation")
            .Argument<NonNullGraphType<StringGraphType>>("model", "The model to use for this conversation")
            .ResolveAsync(async context =>
            {
                var model = context.GetArgument<string>("model");
                
                var conversation = new Conversation
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
