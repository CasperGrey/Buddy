using GraphQL.Types;
using Microsoft.Extensions.DependencyInjection;
using ChatFunctions.Schema.Types;

namespace ChatFunctions.Schema;

public class ChatSchema : GraphQL.Types.Schema
{
    public ChatSchema(IServiceProvider services) : base(services)
    {
        Query = services.GetRequiredService<QueryType>();
        Mutation = services.GetRequiredService<MutationType>();
        Subscription = services.GetRequiredService<SubscriptionType>();
    }
}
