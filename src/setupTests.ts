import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { configure } from '@testing-library/react';

// Configure Testing Library
configure({
  testIdAttribute: 'data-testid',
});

// Configure async utilities
jest.setTimeout(10000);

// Configure fake timers
jest.useFakeTimers();

// Configure test environment
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
global.IS_REACT_ACT_ENVIRONMENT = true;

// Configure async act
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  flushSync: (fn: () => void) => fn(),
}));

// Configure Testing Library
configure({
  testIdAttribute: 'data-testid',
});

// Setup for React 18
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));


// Helper to create mock elements (defined inline to avoid Jest scope issues)
const createMockElement = (type: string, props: Record<string, any> = {}, children?: React.ReactNode): React.ReactElement => {
  // Ensure role is properly set for accessibility testing
  if (props.role || type === 'button') {
    props['role'] = props.role || 'button';
  }
  
  // Ensure aria-label is properly set for accessibility testing
  if (props['aria-label']) {
    props['aria-label'] = props['aria-label'].toLowerCase();
  }
  
  return {
    $$typeof: Symbol.for('react.element'),
    type,
    key: props.key || null,
    ref: null,
    props: { ...props, children }
  } as React.ReactElement;
};

// Suppress punycode deprecation warning
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning: string | Error, ...args: any[]) {
  // Suppress both string-based and type-based punycode warnings
  if (typeof warning === 'string' && warning.includes('punycode')) return;
  if (args[0] === 'DEP0040') return;
  return originalEmitWarning.call(process, warning, ...args);
};

// Mock useChat hook
const mockSendMessage = jest.fn();
jest.mock('./lib/hooks/useChat', () => {
  return {
    useChat: function() {
      return {
        sendMessage: mockSendMessage,
        isStreaming: false,
        error: null
      };
    },
    __mockSendMessage: mockSendMessage
  };
});

// Mock ReactMarkdown
jest.mock('react-markdown', () => {
  return {
    __esModule: true,
    default: function MockMarkdown(props: any) {
      return createMockElement('div', { 'data-testid': 'mock-markdown' }, props.children);
    }
  };
});

// Mock SyntaxHighlighter
jest.mock('react-syntax-highlighter', () => {
  return {
    Prism: function MockPrism(props: any) {
      return createMockElement('pre', { 'data-testid': 'mock-syntax-highlighter' }, props.children);
    }
  };
});

// Mock SyntaxHighlighter styles
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => {
  return {
    tomorrow: {}
  };
});

// Mock Auth0 provider
let mockIsAuthenticated = true;
let mockIsLoading = false;
let mockError: Error | null = null;

jest.mock('@auth0/auth0-react', () => {
  return {
    Auth0Provider: function MockAuth0Provider(props: any) {
      return props.children;
    },
    useAuth0: function() {
      return {
        isAuthenticated: mockIsAuthenticated,
        isLoading: mockIsLoading,
        error: mockError,
        user: mockIsAuthenticated ? { 
          sub: 'test-user-id', 
          name: 'Test User', 
          email: 'test@example.com' 
        } : null,
        getAccessTokenSilently: () => Promise.resolve('test-token'),
        loginWithRedirect: jest.fn(),
        logout: jest.fn()
      };
    },
    __setMockAuthState: (auth: boolean, loading: boolean, err: any = null) => {
      mockIsAuthenticated = auth;
      mockIsLoading = loading;
      mockError = err;
    }
  };
});

// Mock Redux store
const mockDispatch = jest.fn();
let mockStoreState = {
  chat: {
    sessions: [{
      id: 'test-session-id',
      name: 'Test Chat',
      messages: [
        { id: 'msg-1', content: 'Hello', role: 'user', timestamp: new Date().toISOString() },
        { id: 'msg-2', content: 'Hi there!', role: 'assistant', timestamp: new Date().toISOString() }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }],
    currentSessionId: 'test-session-id',
    isStreaming: false,
    error: null,
    wsConnected: true,
    wsReconnecting: false
  },
  settings: {
    messageDisplayPreferences: {
      showTimestamp: true,
      darkMode: false,
      enterToSend: true
    }
  }
};

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: any) => selector(mockStoreState),
    __setMockState: (newState: any) => {
      mockStoreState = { ...mockStoreState, ...newState };
    },
    __getMockState: () => mockStoreState,
    __mockDispatch: mockDispatch
  };
});

// Mock NotificationProvider
const mockShowNotification = jest.fn();
jest.mock('./components/providers/NotificationProvider', () => {
  return {
    useNotification: function() {
      return {
        showNotification: mockShowNotification
      };
    },
    __mockShowNotification: mockShowNotification
  };
});

// Mock Material-UI icons
jest.mock('@mui/icons-material', () => {
  return {
    Send: function SendIcon() {
      return createMockElement('span', { 'data-testid': 'send-icon' });
    },
    MoreVert: function MoreIcon() {
      return createMockElement('span', { 'data-testid': 'MoreVertIcon' });
    },
    Delete: function DeleteIcon() {
      return createMockElement('span', { 'data-testid': 'DeleteIcon' });
    },
    Download: function ExportIcon() {
      return createMockElement('span', { 'data-testid': 'DownloadIcon' });
    },
    Clear: function ClearIcon() {
      return createMockElement('span', { 'data-testid': 'ClearIcon' });
    }
  };
});

// Mock Chat components
jest.mock('./components/chat/MessageList', () => {
  return {
    __esModule: true,
    default: function MockMessageList({ messages = [], isStreaming = false }: { messages?: Array<any>, isStreaming?: boolean }) {
      if (!messages.length) {
        return createMockElement('div', { 
          'data-testid': 'message-list',
          role: 'list'
        }, createMockElement('div', {
          'data-testid': 'empty-state'
        }, 'No messages in this chat yet'));
      }

      const children = messages.map(msg => 
        createMockElement('div', {
          key: msg.id,
          'data-testid': 'message-container',
          role: 'listitem',
          className: `message ${msg.role}`,
          style: { display: 'flex', flexDirection: 'column' }
        }, [
          createMockElement('div', { 'data-testid': 'message-content' }, msg.content),
          msg.timestamp && createMockElement('time', {
            role: 'time',
            dateTime: msg.timestamp
          }, msg.timestamp)
        ])
      );

      if (isStreaming) {
        children.push(createMockElement('div', {
          key: 'streaming',
          'data-testid': 'streaming-indicator',
          role: 'status'
        }, 'Message streaming...'));
      }

      return createMockElement('div', { 
        'data-testid': 'message-list',
        role: 'list'
      }, children);
    }
  };
});

jest.mock('./components/chat/MessageActions', () => {
  return {
    __esModule: true,
    default: function MockMessageActions({ message, visible }: { message: { id: string; role: string; content: string }, visible: boolean }) {
      if (!visible) return null;
      const children = [];
      children.push(createMockElement('button', { 
        key: 'copy',
        'aria-label': 'copy',
        onClick: () => navigator.clipboard.writeText(message.content)
      }));
      
      if (message.role === 'assistant') {
        children.push(createMockElement('button', { 
          key: 'retry',
          'aria-label': 'retry'
        }));
      }
      
      return createMockElement('div', {
        'data-testid': 'message-actions',
        'data-message-id': message.id
      }, children);
    }
  };
});

jest.mock('./components/chat/MessageInput', () => {
  return {
    __esModule: true,
    default: function MockMessageInput({ disabled = false, placeholder = '', isStreaming = false }: { disabled?: boolean; placeholder?: string; isStreaming?: boolean }) {
      return createMockElement('div', { 
        'data-testid': 'message-input'
      }, [
        createMockElement('textarea', {
          role: 'textbox',
          'aria-label': 'message input',
          disabled: disabled || isStreaming,
          placeholder: placeholder || (disabled ? 'Please select a session to start chatting' : 'Type your message...'),
          style: { width: '100%' }
        }),
        createMockElement('button', {
          role: 'button',
          'aria-label': 'send',
          disabled: disabled || isStreaming
        }, [
          isStreaming ? 
            createMockElement('div', { role: 'progressbar', 'aria-label': 'sending' }) :
            createMockElement('span', { 'data-testid': 'send-icon' })
        ])
      ]);
    }
  };
});


// Mock user components
jest.mock('./components/user/UserMenu', () => {
  return {
    __esModule: true,
    default: function MockUserMenu() {
      return createMockElement('div', { 'data-testid': 'UserMenu' });
    }
  };
});

jest.mock('./components/sidebar/Sidebar', () => {
  return {
    __esModule: true,
    default: function MockSidebar() {
      return createMockElement('div', { 'data-testid': 'sidebar' }, 'Sidebar');
    }
  };
});

// Mock Material-UI components
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    CircularProgress: function MockCircularProgress() {
      return createMockElement('div', { role: 'progressbar' });
    }
  };
});

// Mock WebSocket
class MockWebSocket implements WebSocket {
  public onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  public onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  public onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  public onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  public send = jest.fn();
  public close = jest.fn();
  public binaryType: BinaryType = 'blob';
  public bufferedAmount = 0;
  public extensions = '';
  public protocol = '';
  public readyState = WebSocket.CONNECTING;
  public url = '';
  public CONNECTING = WebSocket.CONNECTING;
  public OPEN = WebSocket.OPEN;
  public CLOSING = WebSocket.CLOSING;
  public CLOSED = WebSocket.CLOSED;
  
  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean { return true; }
}

global.WebSocket = MockWebSocket as any;

// Add missing DOM environment variables
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Test cleanup and setup
beforeAll(() => {
  // Suppress specific console errors
  const originalError = console.error;
  console.error = function(...args: any[]) {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is no longer supported')) {
      return;
    }
    originalError.apply(console, args);
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAuthenticated = true;
  mockIsLoading = false;
  mockError = null;
  mockStoreState = {
    chat: {
      sessions: [{
        id: 'test-session-id',
        name: 'Test Chat',
        messages: [
          { id: 'msg-1', content: 'Hello', role: 'user', timestamp: new Date().toISOString() },
          { id: 'msg-2', content: 'Hi there!', role: 'assistant', timestamp: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }],
      currentSessionId: 'test-session-id',
      isStreaming: false,
      error: null,
      wsConnected: true,
      wsReconnecting: false
    },
    settings: {
      messageDisplayPreferences: {
        showTimestamp: true,
        darkMode: false,
        enterToSend: true
      }
    }
  };
});
