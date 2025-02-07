using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Azure.Messaging.EventGrid;
using HotChocolate;
using HotChocolate.Types;
using HotChocolate.Subscriptions;
using HotChocolate.AspNetCore;
using ChatFunctions.Schema;
using ChatFunctions.Services;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using Microsoft.Azure.Functions.Extensions.DependencyInjection;

[assembly: FunctionsStartup(typeof(ChatFunctions.Startup))]

namespace ChatFunctions;

public class Startup : FunctionsStartup
{
    public override void Configure(IFunctionsHostBuilder builder)
    {
        // Add logging
        builder.Services.AddLogging(logging =>
        {
            logging.AddConsole();
            if (builder.GetContext().EnvironmentName == "Development")
            {
                logging.SetMinimumLevel(LogLevel.Debug);
            }
        });

        // Add GraphQL services
        builder.Services.AddSingleton<ChatQueries>();
        builder.Services.AddSingleton<ChatMutations>();
        builder.Services.AddSingleton<ChatSubscriptions>();
        builder.Services.AddSingleton<ChatResolvers>();
        builder.Services.AddSingleton<ITopicEventSender, InMemoryEventSender>();

        // Add Cosmos DB service
        var cosmosConnectionString = builder.GetContext().Configuration["CosmosDbConnectionString"];
        if (!string.IsNullOrEmpty(cosmosConnectionString))
        {
            builder.Services.AddSingleton<ICosmosService>(sp =>
            {
                var logger = sp.GetRequiredService<ILogger<CosmosService>>();
                return new CosmosService(cosmosConnectionString, logger);
            });
        }

        // Add Event Grid client
        var eventGridEndpoint = builder.GetContext().Configuration["EventGridEndpoint"];
        var eventGridKey = builder.GetContext().Configuration["EventGridKey"];
        if (!string.IsNullOrEmpty(eventGridEndpoint) && !string.IsNullOrEmpty(eventGridKey))
        {
            builder.Services.AddSingleton(sp => new EventGridPublisherClient(
                new Uri(eventGridEndpoint),
                new Azure.AzureKeyCredential(eventGridKey)));
        }

        // Configure GraphQL
        builder.Services
            .AddGraphQLServer()
            .AddQueryType<ChatQueries>()
            .AddMutationType<ChatMutations>()
            .AddSubscriptionType<ChatSubscriptions>()
            .AddType<MessageType>()
            .AddType<ConversationType>()
            .AddType<ObjectType<AIModel>>()
            .AddType<MessageInputType>()
            .AddType<ChatError>()
            .AddInMemorySubscriptions()
            .ModifyRequestOptions(opt =>
            {
                opt.ExecutionTimeout = TimeSpan.FromMinutes(5);
            });
    }
}
