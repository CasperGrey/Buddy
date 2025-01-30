import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isStreaming: boolean;
  error: string | null;
  wsConnected: boolean;
  wsReconnecting: boolean;
}

const initialState: ChatState = {
  sessions: [],
  currentSessionId: null,
  isStreaming: false,
  error: null,
  wsConnected: false,
  wsReconnecting: false,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    createSession: {
      prepare: (payload: { name: string }) => {
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          name: payload.name,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { payload: newSession };
      },
      reducer: (state, action: PayloadAction<ChatSession>) => {
        state.sessions.push(action.payload);
        state.currentSessionId = action.payload.id;
      },
    },
    setCurrentSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    addMessage: (state, action: PayloadAction<Omit<Message, 'id' | 'timestamp'>>) => {
      const session = state.sessions.find(s => s.id === state.currentSessionId);
      if (session) {
        session.messages.push({
          ...action.payload,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        });
        session.updatedAt = new Date().toISOString();
      }
    },
    updateMessage: (state, action: PayloadAction<{ messageId: string; content: string }>) => {
      const session = state.sessions.find(s => s.id === state.currentSessionId);
      if (session) {
        const message = session.messages.find(m => m.id === action.payload.messageId);
        if (message) {
          message.content = action.payload.content;
          session.updatedAt = new Date().toISOString();
        }
      }
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter(s => s.id !== action.payload);
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = state.sessions[0]?.id || null;
      }
    },
    clearSession: (state, action: PayloadAction<string>) => {
      const session = state.sessions.find(s => s.id === action.payload);
      if (session) {
        session.messages = [];
        session.updatedAt = new Date().toISOString();
      }
    },
    setStreaming: (state, action: PayloadAction<boolean>) => {
      state.isStreaming = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setWsConnected: (state, action: PayloadAction<boolean>) => {
      state.wsConnected = action.payload;
      if (action.payload) {
        state.wsReconnecting = false;
      }
    },
    setWsReconnecting: (state, action: PayloadAction<boolean>) => {
      state.wsReconnecting = action.payload;
    },
    retryMessage: (state, action: PayloadAction<string>) => {
      const session = state.sessions.find(s => s.id === state.currentSessionId);
      if (session) {
        const messageIndex = session.messages.findIndex(m => m.id === action.payload);
        if (messageIndex !== -1) {
          // Remove all messages after the retried message
          session.messages = session.messages.slice(0, messageIndex + 1);
          session.updatedAt = new Date().toISOString();
        }
      }
    },
  },
});

export const {
  createSession,
  setCurrentSession,
  addMessage,
  updateMessage,
  deleteSession,
  clearSession,
  setStreaming,
  setError,
  retryMessage,
  setWsConnected,
  setWsReconnecting,
} = chatSlice.actions;

export default chatSlice.reducer;
