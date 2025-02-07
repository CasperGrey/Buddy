using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Azure.Messaging.EventGrid;
using Microsoft.Azure.Functions.Worker;
using HotChocolate.AspNetCore;
using HotChocolate.Types;
using HotChocolate.Subscriptions;
using HotChocolate.Execution.Configuration;
using ChatFunctions.Schema;
using ChatFunctions.Services;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using HotChocolate.Execution;
using HotChocolate;
var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((context, services) =>
    {
        // Add logging with enhanced configuration
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

        // Configure GraphQL
        services
            .AddGraphQL()
            .AddQueryType<ChatQueries>()
            .AddMutationType<ChatMutations>()
            .AddSubscriptionType<ChatSubscriptions>()
            .AddType<MessageType>()
            .AddType<ConversationType>()
            .AddType<ObjectType<AIModel>>()
            .AddType<MessageInputType>()
            .AddType<ChatError>()
            .AddFiltering()
            .AddSorting()
            .AddInMemorySubscriptions()
            .ModifyOptions(opt =>
            {
                opt.UseXmlDocumentation = true;
                opt.SortFieldsByName = true;
                opt.RemoveUnreachableTypes = true;
                opt.StrictValidation = true;
            })
            .ModifyRequestOptions(opt =>
            {
                opt.ExecutionTimeout = TimeSpan.FromMinutes(5);
            });

        // Register request executor
        services.AddSingleton(sp => 
            sp.GetRequiredService<IRequestExecutorBuilder>().BuildAsync().Result);

        // Add Cosmos DB service with retry policy
        var cosmosConnectionString = context.Configuration["CosmosDbConnectionString"];
        if (!string.IsNullOrEmpty(cosmosConnectionString))
        {
            services.AddSingleton<ICosmosService>(sp =>
            {
                var logger = sp.GetRequiredService<ILogger<CosmosService>>();
                return new CosmosService(cosmosConnectionString, logger);
            });
        }
        else
        {
            var logger = services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();
            logger.LogWarning("CosmosDbConnectionString not found in configuration");
        }

        // Add Event Grid client with enhanced configuration
        var eventGridEndpoint = context.Configuration["EventGridEndpoint"];
        var eventGridKey = context.Configuration["EventGridKey"];
        
        if (!string.IsNullOrEmpty(eventGridEndpoint) && !string.IsNullOrEmpty(eventGridKey))
        {
            services.AddSingleton(sp =>
            {
                var options = new EventGridPublisherClientOptions
                {
                    Retry =
                    {
                        MaxRetries = 3,
                        Mode = Azure.Core.RetryMode.Exponential
                    }
                };
                
                return new EventGridPublisherClient(
                    new Uri(eventGridEndpoint),
                    new Azure.AzureKeyCredential(eventGridKey),
                    options);
            });
        }
        else
        {
            var logger = services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();
            logger.LogWarning("EventGrid configuration not found");
        }
    })
    .Build();

host.Run();
