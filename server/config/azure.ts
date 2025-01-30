import { CosmosClient } from '@azure/cosmos';
import { createClient } from 'redis';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Initialize Cosmos DB client
let cosmosClient: CosmosClient | null = null;
const initCosmosClient = async () => {
  if (cosmosClient) return cosmosClient;

  if (isDevelopment) {
    // For local development, return a mock client
    console.log('Running in development mode - using mock Cosmos DB client');
    cosmosClient = {
      database: () => ({
        container: () => ({
          items: {
            create: async (item: any) => {
              console.log('Mock Cosmos DB - Creating item:', item);
              return item;
            }
          }
        })
      })
    } as any;
    return cosmosClient;
  }

  const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('COSMOS_DB_CONNECTION_STRING environment variable is required in production');
  }
  
  cosmosClient = new CosmosClient(connectionString);
  return cosmosClient;
};

// Initialize Redis client
let redisClient: ReturnType<typeof createClient> | null = null;
const initRedisClient = async () => {
  if (redisClient) return redisClient;

  if (isDevelopment) {
    // For local development, return a mock client
    console.log('Running in development mode - using mock Redis client');
    redisClient = {
      set: async (key: string, value: string) => {
        console.log('Mock Redis - Setting key:', key, 'value:', value);
        return 'OK';
      },
      connect: async () => console.log('Mock Redis - Connected'),
      disconnect: async () => console.log('Mock Redis - Disconnected')
    } as any;
    return redisClient;
  }

  const connectionString = process.env.REDIS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('REDIS_CONNECTION_STRING environment variable is required in production');
  }

  redisClient = createClient({
    url: connectionString
  });

  await redisClient.connect();
  return redisClient;
};

export {
  initCosmosClient,
  initRedisClient
};
