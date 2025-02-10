using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Azure.Messaging.EventGrid;
using GraphQL;
using GraphQL.DI;
using GraphQL.MicrosoftDI;
using GraphQL.Types;
using GraphQL.Execution;
using ChatFunctions.Schema;
using ChatFunctions.Schema.Types;
using ChatFunctions.Services;
using Microsoft.Extensions.Logging;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
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

        // Add Message Sender for subscriptions
        services.AddSingleton<IMessageSender, InMemoryEventSender>();

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

        // Register GraphQL types
        services.AddSingleton<ISchema, ChatSchema>();
        services.AddSingleton<QueryType>();
        services.AddSingleton<MutationType>();
        services.AddSingleton<Schema.SubscriptionType>();
        services.AddSingleton<MessageType>();
        services.AddSingleton<ConversationType>();
        services.AddSingleton<ChatErrorType>();
        services.AddSingleton<SendMessageInputType>();
        services.AddSingleton<ModelCapabilityType>();
        services.AddSingleton<IModelService, ModelService>();

        // Register error filter
        services.AddSingleton<IErrorInfoProvider, GraphQLErrorFilter>();

        // Configure GraphQL
        services.AddGraphQL(b => b
            .AddSchema<ChatSchema>()
            .AddSystemTextJson()
            .AddErrorInfoProvider<GraphQLErrorFilter>()
            .AddGraphTypes(typeof(ChatSchema).Assembly));
    })
    .Build();

await host.RunAsync();
