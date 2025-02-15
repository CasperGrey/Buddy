using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Azure.Messaging.EventGrid;
using ChatFunctions.Schema;
using ChatFunctions.Services;
using HotChocolate.Types;
using HotChocolate.AzureFunctions;
using HotChocolate.Execution.Configuration;
using HotChocolate.Validation;
using Microsoft.Azure.Functions.Worker;
using GreenDonut;
using HotChocolate.Transport;
using HotChocolate.Execution;

[assembly: GreenDonut.DataLoaderModule("ChatDataLoader")]

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((context, services) =>
    {
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
        services.AddSingleton<ICosmosService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<CosmosService>>();
            var config = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var cosmosConnectionString = config["CosmosDbConnectionString"];
            if (string.IsNullOrEmpty(cosmosConnectionString))
            {
                throw new InvalidOperationException("CosmosDbConnectionString configuration is required");
            }
            return new CosmosService(cosmosConnectionString, logger);
        });

        // Add Event Grid client
        services.AddSingleton(sp =>
        {
            var config = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var eventGridEndpoint = config["EventGridEndpoint"];
            var eventGridKey = config["EventGridKey"];
            if (string.IsNullOrEmpty(eventGridEndpoint) || string.IsNullOrEmpty(eventGridKey))
            {
                throw new InvalidOperationException("EventGrid configuration is required");
            }
            return new EventGridPublisherClient(
                new Uri(eventGridEndpoint),
                new Azure.AzureKeyCredential(eventGridKey));
        });

        // Add Model Service
        services.AddSingleton<IModelService, ModelService>();

        // Configure GraphQL
        services
            .AddGraphQLFunction()
            .AddType<QueryNode>()
            .AddType<MutationNode>()
            .AddQueryConventions()
            .AddInMemorySubscriptions()
            .ModifyOptions(opt =>
            {
                opt.StrictValidation = false;
                opt.DefaultQueryDependencyInjectionScope = DependencyInjectionScope.Resolver;
                opt.DefaultMutationDependencyInjectionScope = DependencyInjectionScope.Request;
            })
            .ModifyRequestOptions(opt =>
            {
                opt.Tool = new() { ServeMode = GraphQLToolServeMode.Embedded };  // Add this
                opt.IncludeExceptionDetails = context.HostingEnvironment.IsDevelopment();
            })
            .UseDefaultPipeline() 
            .AddErrorFilter<GraphQLErrorFilter>();
    });

await host.Build().RunAsync();
