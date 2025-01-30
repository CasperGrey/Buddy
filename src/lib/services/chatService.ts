import { RootState } from '../store/store';
import { store } from '../store/store';
import { setWsConnected, setWsReconnecting, setError } from '../store/slices/chatSlice';

export class ChatService {
  private ws: WebSocket | null = null;
  private messageQueue: { resolve: (value: any) => void; reject: (error: any) => void }[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.setupWebSocket();
  }

  private setupWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket('ws://localhost:3001');

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      store.dispatch(setWsConnected(true));
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      store.dispatch(setWsConnected(false));
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      store.dispatch(setError('WebSocket connection error'));
    };

    this.ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.type === 'ERROR') {
        const pendingMessage = this.messageQueue.shift();
        if (pendingMessage) {
          pendingMessage.reject(new Error(response.error));
        }
      } else {
        const pendingMessage = this.messageQueue.shift();
        if (pendingMessage) {
          pendingMessage.resolve(response);
        }
      }
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      store.dispatch(setWsReconnecting(true));
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.setupWebSocket(), delay);
    } else {
      store.dispatch(setWsReconnecting(false));
      store.dispatch(setError('Failed to reconnect to WebSocket server'));
    }
  }

  async initializeClients(state: RootState) {
    // No longer need to initialize individual clients
    // WebSocket connection is handled in constructor
  }

  async sendMessage(
    messages: { role: string; content: string }[],
    model: string,
    systemPrompt?: string
  ) {
    if (!this.ws || !store.getState().chat.wsConnected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      this.messageQueue.push({ resolve, reject });
      this.ws!.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        payload: {
          messages,
          model,
          systemPrompt
        }
      }));
    });
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
