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

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((context, services) =>
    {
        // Add logging
        services.AddLogging(logging =>
        {
            logging.AddConsole();
            if (context.HostingEnvironment.IsDevelopment())
            {
                logging.SetMinimumLevel(LogLevel.Debug);
            }
        });

        // Add GraphQL services
        services.AddSingleton<ChatQueries>();
        services.AddSingleton<ChatMutations>();
        services.AddSingleton<ChatSubscriptions>();
        services.AddSingleton<ChatResolvers>();
        services.AddSingleton<ITopicEventSender, InMemoryEventSender>();

        // Add Cosmos DB service
        var cosmosConnectionString = context.Configuration["CosmosDbConnectionString"];
        if (!string.IsNullOrEmpty(cosmosConnectionString))
        {
            services.AddSingleton<ICosmosService>(sp =>
            {
                var logger = sp.GetRequiredService<ILogger<CosmosService>>();
                return new CosmosService(cosmosConnectionString, logger);
            });
        }

        // Add Event Grid client
        var eventGridEndpoint = context.Configuration["EventGridEndpoint"];
        var eventGridKey = context.Configuration["EventGridKey"];
        if (!string.IsNullOrEmpty(eventGridEndpoint) && !string.IsNullOrEmpty(eventGridKey))
        {
            services.AddSingleton(sp => new EventGridPublisherClient(
                new Uri(eventGridEndpoint),
                new Azure.AzureKeyCredential(eventGridKey)));
        }

        // Configure GraphQL
        services
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
    })
    .Build();

await host.RunAsync();
