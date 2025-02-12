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
            // Load and validate schema file
            var schemaPath = "api/ChatFunctions/schema.graphql";
            if (!File.Exists(schemaPath))
            {
                Console.Error.WriteLine($"Schema file not found: {schemaPath}");
                return 1;
            }

            var schemaText = await File.ReadAllTextAsync(schemaPath);
            if (string.IsNullOrWhiteSpace(schemaText))
            {
                Console.Error.WriteLine("Schema file is empty");
                return 1;
            }

            // Set up GraphQL executor with subscription support
            var services = new ServiceCollection();
            var executor = await services
                .AddGraphQLFunction()
                .AddTypes()
                .AddInMemorySubscriptions()
                .ModifyOptions(opt => 
                {
                    opt.StrictValidation = true;
                    opt.ValidateFunctions = true;
                })
                .BuildRequestExecutorAsync();

            // Validate schema can be executed
            var result = await executor.ExecuteAsync(@"
                query {
                    __schema {
                        types {
                            name
                            fields {
                                name
                                type {
                                    name
                                }
                            }
                        }
                    }
                }");
            
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
