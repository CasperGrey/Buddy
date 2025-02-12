using HotChocolate.AzureFunctions;
using HotChocolate.Execution;
using System.Threading.Tasks;

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
            var executor = await new ServiceCollection()
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
