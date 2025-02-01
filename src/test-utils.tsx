import React from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { configureStore, type Action, type ThunkAction, type Reducer, combineReducers } from '@reduxjs/toolkit';
import type { Store } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Auth0Provider } from '@auth0/auth0-react';
import { lightTheme as theme } from './lib/theme/theme';
import chatReducer from './lib/store/slices/chatSlice';
import settingsReducer, { type OpenAIModel } from './lib/store/slices/settingsSlice';
import userReducer from './lib/store/slices/userSlice';

// State interfaces
interface ChatState {
  sessions: Array<{
    id: string;
    name: string;
    messages: Array<{
      id: string;
      content: string;
      role: 'user' | 'assistant';
      timestamp: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
  currentSessionId: string | null;
  isStreaming: boolean;
  error: string | null;
  wsConnected: boolean;
  wsReconnecting: boolean;
}

interface SettingsState {
  apiKeys: {
    anthropicKey: string;
    deepseekKey: string;
    openAIKey: string;
  };
  modelPreferences: {
    defaultModel: string;
    openAIModel: OpenAIModel;
    temperature: number;
    systemPrompt: string;
  };
  messageDisplayPreferences: {
    showTimestamp: boolean;
    darkMode: boolean;
    enterToSend: boolean;
  };
}

interface UserState {
  isAuthenticated: boolean;
  profile: {
    email: string;
    name: string;
    picture?: string;
  } | null;
  loading: boolean;
  error: string | null;
}

export interface RootState {
  chat: ChatState;
  settings: SettingsState;
  user: UserState;
}

const rootReducer = combineReducers({
  chat: chatReducer as Reducer<ChatState>,
  settings: settingsReducer as Reducer<SettingsState>,
  user: userReducer as Reducer<UserState>,
});

export type AppStore = ReturnType<typeof createTestStore>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  store?: Store;
}

export function createTestStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
    preloadedState,
  });
}

const customRender = (
  ui: React.ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) => {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Auth0Provider
        domain="test.auth0.com"
        clientId="test-client-id"
        authorizationParams={{
          redirect_uri: window.location.origin,
        }}
      >
        <Provider store={store}>
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              {children}
            </ThemeProvider>
          </BrowserRouter>
        </Provider>
      </Auth0Provider>
    );
  }

  return {
    ...render(ui, {
      wrapper: Wrapper,
      ...renderOptions
    }),
    store,
  };
};

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Mock data
export const mockChat: ChatState = {
  sessions: [{
    id: 'test-session-id',
    name: 'Test Chat',
    messages: [
      { id: 'msg-1', content: 'Hello', role: 'user', timestamp: new Date().toISOString() },
      { id: 'msg-2', content: 'Hi there!', role: 'assistant', timestamp: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }],
  currentSessionId: 'test-session-id',
  isStreaming: false,
  error: null,
  wsConnected: true,
  wsReconnecting: false,
};

export const mockSettings: SettingsState = {
  apiKeys: {
    anthropicKey: 'test-anthropic-key',
    deepseekKey: 'test-deepseek-key',
    openAIKey: 'test-openai-key',
  },
  modelPreferences: {
    defaultModel: 'deepseek-chat-7b',
    openAIModel: 'gpt-4',
    temperature: 0.7,
    systemPrompt: 'You are a helpful AI assistant.',
  },
  messageDisplayPreferences: {
    showTimestamp: true,
    darkMode: false,
    enterToSend: true,
  },
};

export const mockUser: UserState = {
  isAuthenticated: true,
  profile: {
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
  },
  loading: false,
  error: null,
};

// Helper to create mock elements for testing
export function createMockElement(type: string, props: Record<string, any> = {}, children?: React.ReactNode): React.ReactElement {
  return {
    $$typeof: Symbol.for('react.element'),
    type,
    key: null,
    ref: null,
    props: { ...props, children }
  } as React.ReactElement;
}

export const createMockStore = (preloadedState: Partial<RootState> = {}) => {
  return createTestStore(preloadedState);
};
