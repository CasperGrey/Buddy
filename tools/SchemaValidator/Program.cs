using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using HotChocolate.AzureFunctions;
using HotChocolate.Execution;

namespace SchemaValidator;

public class Program
{
    public static async Task<int> Main()
    {
        try
        {
            // Load current schema
            var schema = await File.ReadAllTextAsync("api/ChatFunctions/schema.graphql");
            
            // Validate schema
            var services = new ServiceCollection();
            var executor = await services
                .AddGraphQLFunction()
                .AddTypes()
                .BuildRequestExecutorAsync();

            var result = await executor.ExecuteAsync(schema);
            
            if (result.Errors?.Any() == true)
            {
                foreach (var error in result.Errors)
                {
                    Console.Error.WriteLine(error.Message);
                }
                return 1;
            }

            Console.WriteLine("Schema validation successful");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Schema validation failed: {ex.Message}");
            return 1;
        }
    }
}
