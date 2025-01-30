import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { validateAccessToken } from './middleware/auth';
import { initCosmosClient, initRedisClient } from './config/azure';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

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

(async () => {
  try {
    cosmosClient = await initCosmosClient();
    redisClient = await initRedisClient();
    console.log('Azure services initialized');
  } catch (error) {
    console.error('Failed to initialize Azure services:', error);
    process.exit(1);
  }
})();

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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
