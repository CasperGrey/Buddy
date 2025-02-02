import { CosmosClient } from '@azure/cosmos';
import { createClient } from 'redis';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Retry configuration
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function for retry logic
const withRetry = async <T>(
  operation: () => Promise<T>,
  name: string,
  attempts = RETRY_ATTEMPTS
): Promise<T> => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Attempt ${i + 1}/${attempts} failed for ${name}:`, error);
      if (i === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error(`All ${attempts} attempts failed for ${name}`);
};

// Initialize Cosmos DB client
let cosmosClient: CosmosClient | null = null;
const initCosmosClient = async () => {
  if (cosmosClient) return cosmosClient;

  if (isDevelopment) {
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
      }),
      close: async () => console.log('Mock Cosmos DB - Closed')
    } as any;
    return cosmosClient;
  }

  const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('COSMOS_DB_CONNECTION_STRING environment variable is required in production');
  }

  return await withRetry(async () => {
    console.log('Initializing Cosmos DB client...');
    const client = new CosmosClient(connectionString);
    
    // Test the connection
    await client.databases.readAll().fetchAll();
    console.log('Cosmos DB connection test successful');
    
    cosmosClient = client;
    return cosmosClient;
  }, 'Cosmos DB initialization');
};

// Initialize Redis client
let redisClient: ReturnType<typeof createClient> | null = null;
const initRedisClient = async () => {
  if (redisClient) return redisClient;

  if (isDevelopment) {
    console.log('Running in development mode - using mock Redis client');
    redisClient = {
      set: async (key: string, value: string) => {
        console.log('Mock Redis - Setting key:', key, 'value:', value);
        return 'OK';
      },
      connect: async () => console.log('Mock Redis - Connected'),
      quit: async () => console.log('Mock Redis - Disconnected')
    } as any;
    return redisClient;
  }

  const connectionString = process.env.REDIS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('REDIS_CONNECTION_STRING environment variable is required in production');
  }

  return await withRetry(async () => {
    console.log('Initializing Redis client...');
    const client = createClient({
      url: connectionString,
      socket: {
        connectTimeout: 5000,
        keepAlive: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error(`Redis connection failed after ${retries} retries`);
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 1000, 3000);
        }
      }
    });

    // Handle Redis events
    client.on('error', (err) => console.error('Redis Client Error:', err));
    client.on('reconnecting', () => console.log('Redis Client Reconnecting...'));
    client.on('connect', () => console.log('Redis Client Connected'));

    await client.connect();
    
    // Test the connection
    await client.ping();
    console.log('Redis connection test successful');
    
    redisClient = client;
    return redisClient;
  }, 'Redis initialization');
};

export {
  initCosmosClient,
  initRedisClient
};
