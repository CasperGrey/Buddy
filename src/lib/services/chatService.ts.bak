import { RootState } from '../store/store';
import { store } from '../store/store';
import { setError, Message } from '../store/slices/chatSlice';

// GraphQL Operations
const SEND_MESSAGE_MUTATION = `
  mutation SendMessage($content: String!, $conversationId: String!) {
    sendMessage(input: { content: $content, conversationId: $conversationId }) {
      id
      content
      role
      timestamp
    }
  }
`;

const START_CONVERSATION_MUTATION = `
  mutation StartConversation($model: String!) {
    startConversation(model: $model) {
      id
      model
      createdAt
    }
  }
`;

const MESSAGE_RECEIVED_SUBSCRIPTION = `
  subscription OnMessageReceived($conversationId: String!) {
    messageReceived(conversationId: $conversationId) {
      id
      content
      role
      timestamp
    }
  }
`;

const GET_MODEL_CAPABILITIES_QUERY = `
  query GetModelCapabilities {
    modelCapabilities {
      name
      capabilities
      maxTokens
    }
  }
`;

export interface ModelCapability {
  name: string;
  capabilities: string[];
  maxTokens: number;
}

export class ChatService {
  private graphqlEndpoint: string;
  private wsEndpoint: string;

  constructor() {
    // In production, use the deployed Function App URL
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://chat-functions-prod.azurewebsites.net'
      : 'http://localhost:7071';
    
    this.graphqlEndpoint = `${baseUrl}/api/graphql`;
    this.wsEndpoint = baseUrl.replace('http', 'ws') + '/api/graphql';
  }

  private async graphqlRequest(query: string, variables?: any) {
    try {
      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      return data.data;
    } catch (error) {
      store.dispatch(setError(error instanceof Error ? error.message : 'GraphQL request failed'));
      throw error;
    }
  }

  async initializeClients(state: RootState) {
    // No initialization needed for GraphQL client
  }

  async sendMessage(
    messages: { role: string; content: string }[],
    model: string,
    systemPrompt?: string
  ) {
    // First, ensure we have a conversation
    let conversationId = store.getState().chat.currentSessionId;
    if (!conversationId) {
      const result = await this.graphqlRequest(START_CONVERSATION_MUTATION, { model });
      conversationId = result.startConversation.id;
    }

    // Send the last message in the array
    const lastMessage = messages[messages.length - 1];
    const result = await this.graphqlRequest(SEND_MESSAGE_MUTATION, {
      content: lastMessage.content,
      conversationId,
    });

    return result.sendMessage;
  }

  async subscribeToMessages(conversationId: string, onMessage: (message: Message) => void) {
    const ws = new WebSocket(this.wsEndpoint);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'connection_init',
      }));

      ws.send(JSON.stringify({
        id: '1',
        type: 'subscribe',
        payload: {
          query: MESSAGE_RECEIVED_SUBSCRIPTION,
          variables: { conversationId },
        },
      }));
    };

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.type === 'next' && response.payload.data) {
        onMessage(response.payload.data.messageReceived);
      }
    };

    return () => ws.close();
  }

  async getModelCapabilities(): Promise<ModelCapability[]> {
    const result = await this.graphqlRequest(GET_MODEL_CAPABILITIES_QUERY);
    return result.modelCapabilities;
  }

  isModelSupported(model: string): boolean {
    // Model support is now handled by the server
    return true;
  }

  getRequiredApiKey(model: string): 'anthropicKey' | 'deepseekKey' | 'openAIKey' {
    // API keys are now handled by the server
    return 'anthropicKey'; // Default return to maintain type compatibility
  }
}

export const chatService = new ChatService();
