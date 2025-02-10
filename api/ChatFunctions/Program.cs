using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Azure.Messaging.EventGrid;
using GraphQL;
using GraphQL.DI;
using GraphQL.MicrosoftDI;
using GraphQL.Types;
using ChatFunctions.Schema;
using ChatFunctions.Schema.Types;
using ChatFunctions.Services;
using Microsoft.Extensions.Logging;
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

        // Add Event Aggregator for subscriptions
        builder.Services.AddSingleton<IEventAggregator, EventAggregator>();

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

        // Register GraphQL types
        builder.Services.AddSingleton<ISchema, ChatSchema>();
        builder.Services.AddSingleton<QueryType>();
        builder.Services.AddSingleton<MutationType>();
        builder.Services.AddSingleton<SubscriptionType>();
        builder.Services.AddSingleton<MessageType>();
        builder.Services.AddSingleton<MessageInputType>();
        builder.Services.AddSingleton<ConversationType>();
        builder.Services.AddSingleton<ChatErrorType>();

        // Configure GraphQL
        builder.Services.AddGraphQL(b => b
            .AddSchema<ChatSchema>()
            .AddSystemTextJson()
            .AddErrorInfoProvider(opt => opt.ExposeExceptionDetails = true)
            .AddWebSockets()
            .AddDataLoader()
            .AddGraphTypes(typeof(ChatSchema).Assembly));
    }
}

public class ChatSchema : Schema
{
    public ChatSchema(IServiceProvider serviceProvider) 
        : base(serviceProvider)
    {
        Query = serviceProvider.GetRequiredService<QueryType>();
        Mutation = serviceProvider.GetRequiredService<MutationType>();
        Subscription = serviceProvider.GetRequiredService<SubscriptionType>();
    }
}
