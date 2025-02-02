import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { validateAccessToken } from './middleware/auth';
import { initCosmosClient, initRedisClient } from './config/azure';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Parse JSON payloads
app.use(express.json());

// Auth middleware (skip in development)
if (process.env.NODE_ENV === 'production') {
  app.use(validateAccessToken);
} else {
  console.log('Running in development mode - skipping Auth0 validation');
}

// Initialize Azure services
let cosmosClient: any;
let redisClient: any;

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'SEND_MESSAGE':
          try {
            const { messages, model, systemPrompt } = data.payload;
            
            // Store conversation in Cosmos DB
            const conversation = {
              id: messages[0]?.id || Date.now().toString(),
              messages,
              model,
              systemPrompt,
              timestamp: new Date().toISOString()
            };
            
            const database = cosmosClient.database('buddy-chat');
            const container = database.container('conversations');
            
            // Ensure container exists
            try {
              await container.read();
            } catch (e) {
              await database.containers.createIfNotExists({
                id: 'conversations',
                partitionKey: { paths: ['/id'] }
              });
            }
            
            await container.items.create(conversation);
            console.log('Conversation saved to Cosmos DB:', conversation.id);
            
            // Cache recent messages in Redis
            const messageKey = `chat:${conversation.id}:latest`;
            await redisClient.set(
              messageKey,
              JSON.stringify(messages[messages.length - 1]),
              'EX',
              3600 // 1 hour expiration
            );
            console.log('Message cached in Redis:', messageKey);
            
            // Send response back to client
            ws.send(JSON.stringify({
              type: 'MESSAGE_RESPONSE',
              content: 'Message processed successfully',
              conversationId: conversation.id
            }));
          } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: 'Failed to process message'
            }));
          }
          break;
          
        case 'START_CHAT':
          // Handle starting new chat
          break;
          
        default:
          console.warn(`Unknown message type: ${data.type}`);
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ 
        type: 'ERROR',
        error: 'Failed to process message'
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;

// Start server with proper initialization and error handling
const startServer = async () => {
  console.log('Starting server initialization...');
  
  try {
    console.log('Initializing Cosmos DB...');
    cosmosClient = await initCosmosClient();
    console.log('Cosmos DB initialized successfully');

    console.log('Initializing Redis...');
    redisClient = await initRedisClient();
    console.log('Redis initialized successfully');

    console.log('All Azure services initialized successfully');

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // Signal to PM2 that we're ready
      if (process.send) {
        process.send('ready');
      }
    });

    // Handle shutdown gracefully
    const shutdown = async () => {
      console.log('Shutting down server...');
      
      server.close(() => {
        console.log('HTTP server closed');
      });
      
      wss.close(() => {
        console.log('WebSocket server closed');
      });

      try {
        if (redisClient) {
          await redisClient.quit();
          console.log('Redis connection closed');
        }
        if (cosmosClient) {
          await cosmosClient.close();
          console.log('Cosmos DB connection closed');
        }
      } catch (error) {
        console.error('Error during shutdown:', error);
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch(error => {
  console.error('Fatal error during server startup:', error);
  process.exit(1);
});
