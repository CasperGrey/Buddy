import { render, screen } from '../../../test-utils';
// Force using actual component instead of mock
jest.unmock('../Chat');
import Chat from '../Chat';
import { mockChat, mockSettings, mockUser, RootState } from '../../../test-utils';
import { Auth0ContextInterface, User } from '@auth0/auth0-react';
import * as Auth0 from '@auth0/auth0-react';
import * as AuthHook from '../../../lib/hooks/useAuth';
import { setCurrentSession } from '../../../lib/store/slices/chatSlice';
import { selectCurrentSession } from '../../../lib/store/selectors';

// Mock Redux hooks
const mockDispatch = jest.fn();
const mockUseAppSelector = jest.fn();
jest.mock('../../../lib/store/hooks', () => ({
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
  useAppDispatch: () => mockDispatch
}));

// Mock MUI components
jest.mock('@mui/material', () => ({
  Box: function Box(props: any) {
    const { children, sx, ...rest } = props;
    return <div style={sx} {...rest}>{children}</div>;
  },
  Typography: function Typography(props: any) {
    const { children, variant, color, sx, ...rest } = props;
    return <div style={sx} {...rest}>{children}</div>;
  },
  Button: function Button(props: any) {
    const { children, onClick, variant, ...rest } = props;
    return (
      <button onClick={onClick} {...rest}>
        {children}
      </button>
    );
  },
  CircularProgress: function CircularProgress() {
    return <div role="progressbar" data-testid="loading-indicator" />;
  }
}));

// Mock child components
jest.mock('../SessionHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="session-header">Session Header</div>
}));

jest.mock('../MessageList', () => ({
  __esModule: true,
  default: () => <div data-testid="message-list">Message List</div>
}));

jest.mock('../MessageInput', () => ({
  __esModule: true,
  default: () => <div data-testid="message-input">Message Input</div>
}));

jest.mock('../../sidebar/Sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

describe('Chat Component', () => {
  const mockLogin = jest.fn().mockResolvedValue(undefined);
  const mockLogout = jest.fn().mockResolvedValue(undefined);
  const mockGetToken = jest.fn().mockResolvedValue('test-token');

  const initialState: RootState = {
    chat: {
      sessions: [{
        id: 'test-session-id',
        name: 'Test Chat',
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          { id: '2', role: 'assistant', content: 'Hi there!', timestamp: new Date().toISOString() }
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
    settings: mockSettings,
    user: mockUser
  };

  const mockAuthUser: User = {
    name: 'Test User',
    sub: 'test-user-id',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth hook
    jest.spyOn(AuthHook, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockAuthUser,
      error: undefined,
      login: mockLogin,
      logout: mockLogout,
      getToken: mockGetToken
    });

    // Setup default useAppSelector mock
    mockUseAppSelector.mockImplementation((selector) => selector(initialState));

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/test-session-id' },
      writable: true
    });
  });

  afterEach(() => {
    // Reset window.location mock
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true
    });
  });

  it('renders loading state while authenticating', () => {
    // Override auth state for this test
    jest.spyOn(AuthHook, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: undefined,
      error: undefined,
      login: mockLogin,
      logout: mockLogout,
      getToken: mockGetToken
    });

    render(<Chat />, { preloadedState: initialState });
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('renders login prompt when not authenticated', () => {
    // Override auth state for this test
    jest.spyOn(AuthHook, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: undefined,
      error: undefined,
      login: mockLogin,
      logout: mockLogout,
      getToken: mockGetToken
    });

    render(<Chat />, { preloadedState: initialState });
    
    expect(screen.getByText('Please log in to continue')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders welcome screen when authenticated but no session selected', () => {
    const noSessionState = {
      ...initialState,
      chat: {
        ...initialState.chat,
        currentSessionId: null
      }
    };

    // Mock useAppSelector for this specific test
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectCurrentSession) {
        return undefined;
      }
      return selector(noSessionState);
    });

    render(<Chat />, { preloadedState: noSessionState });
    
    // Use a more flexible text matcher
    expect(screen.getByText((content) => content.includes('Welcome') && content.includes('Test User'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Buddy Chat is your AI companion'))).toBeInTheDocument();
  });

  it('renders chat interface when authenticated with selected session', () => {
    // Mock useAppSelector for this specific test
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectCurrentSession) {
        return initialState.chat.sessions[0];
      }
      return selector(initialState);
    });

    render(<Chat />, { preloadedState: initialState });
    
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('session-header')).toBeInTheDocument();
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('updates session from URL on mount and URL changes', () => {
    // Update window.location mock
    Object.defineProperty(window, 'location', {
      value: { pathname: '/new-session-id' },
      writable: true
    });

    render(<Chat />, { preloadedState: initialState });

    // Should dispatch setCurrentSession with URL path
    expect(mockDispatch).toHaveBeenCalledWith(setCurrentSession('new-session-id'));
  });
});
