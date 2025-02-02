using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Azure.Messaging.EventGrid;
using Microsoft.Azure.Functions.Worker;
using HotChocolate.AspNetCore;
using HotChocolate.Execution.Configuration;
using ChatFunctions.Schema;
using ChatFunctions.Services;
using Microsoft.Extensions.Logging;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((context, services) =>
    {
        // Add logging
        services.AddLogging();

        // Configure GraphQL server
        services
            .AddGraphQLServer()
            .AddQueryType<ChatQueries>()
            .AddMutationType<ChatMutations>()
            .AddType<MessageType>()
            .AddType<ConversationType>()
            .ModifyRequestOptions(opt => 
            {
                opt.IncludeExceptionDetails = context.HostingEnvironment.IsDevelopment();
            })
            .InitializeOnStartup();

        // Add Cosmos DB service
        var cosmosConnectionString = context.Configuration["CosmosDbConnectionString"] 
            ?? throw new InvalidOperationException("CosmosDbConnectionString is required");
        services.AddSingleton<ICosmosService>(new CosmosService(cosmosConnectionString));

        // Add Event Grid client
        var eventGridEndpoint = new Uri(context.Configuration["EventGridEndpoint"] 
            ?? throw new InvalidOperationException("EventGridEndpoint is required"));
        var eventGridKey = context.Configuration["EventGridKey"] 
            ?? throw new InvalidOperationException("EventGridKey is required");
        services.AddSingleton(new EventGridPublisherClient(
            eventGridEndpoint,
            new Azure.AzureKeyCredential(eventGridKey)));
    })
    .Build();

host.Run();
