import { render, screen, fireEvent } from '../../../test-utils';
// Force using actual component instead of mock
jest.unmock('../MessageList');
import MessageList from '../MessageList';
import { mockChat, mockSettings, mockUser, RootState } from '../../../test-utils';
import * as ReduxHooks from '../../../lib/store/hooks';
import { Message } from '../../../lib/store/slices/chatSlice';

// Mock Redux hooks
jest.mock('../../../lib/store/hooks', () => ({
  useAppSelector: jest.fn((selector) => selector),
}));

// Mock MUI components
jest.mock('@mui/material', () => ({
  Box: function Box(props: any) {
    const { children, sx, ...rest } = props;
    return <div style={sx} {...rest}>{children}</div>;
  },
  Paper: function Paper(props: any) {
    const { children, elevation, sx, ...rest } = props;
    return <div style={sx} {...rest}>{children}</div>;
  },
  Typography: function Typography(props: any) {
    const { children, variant, component, sx, ...rest } = props;
    return <div style={sx} {...rest}>{children}</div>;
  },
  useTheme: () => ({
    palette: {
      chat: {
        userMessage: '#e3f2fd',
        assistantMessage: '#f5f5f5',
        timestamp: '#757575'
      }
    }
  })
}));

// Mock MessageActions component
jest.mock('../MessageActions', () => {
  return {
    __esModule: true,
    default: function MockMessageActions({ message, visible }: { message: any, visible: boolean }) {
      if (!visible) return null;
      return (
        <div data-testid="message-actions" data-message-id={message.id}>
          <button 
            aria-label="copy" 
            role="button"
            onClick={() => navigator.clipboard.writeText(message.content)}
          />
          {message.role === 'assistant' && (
            <button aria-label="retry" role="button" />
          )}
        </div>
      );
    }
  };
});

// Mock function declarations
const mockScrollIntoView = jest.fn();
const mockClipboardWrite = jest.fn().mockResolvedValue(undefined);

describe('MessageList Component', () => {
  const initialState: RootState = {
    chat: {
      sessions: [{
        id: 'test-session-id',
        name: 'Test Chat',
        messages: [
          { id: 'msg-1', content: 'Hello', role: 'user' as const, timestamp: new Date().toISOString() },
          { id: 'msg-2', content: 'Hi there!', role: 'assistant' as const, timestamp: new Date().toISOString() }
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
      apiKeys: mockSettings.apiKeys,
      modelPreferences: mockSettings.modelPreferences,
      messageDisplayPreferences: {
        showTimestamp: true,
        darkMode: false,
        enterToSend: true
      }
    },
    user: mockUser
  };

  beforeEach(() => {
    jest.resetAllMocks();
    
    // Setup DOM mocks
    window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;
    Object.assign(navigator, {
      clipboard: {
        writeText: mockClipboardWrite
      }
    });

    // Setup default selector mocks
    const mockUseAppSelector = ReduxHooks.useAppSelector as jest.Mock;
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector.name === 'selectCurrentSession') {
        return initialState.chat.sessions[0];
      }
      if (selector.name === 'selectMessageDisplayPreferences') {
        return initialState.settings.messageDisplayPreferences;
      }
      if (selector.name === 'selectIsStreaming') {
        return initialState.chat.isStreaming;
      }
      return selector(initialState);
    });
  });

  it('renders all messages in the current session', () => {
    render(<MessageList />);

    initialState.chat.sessions[0].messages.forEach((message: Message) => {
      const messageElement = screen.getByText(message.content, { exact: false });
      expect(messageElement).toBeInTheDocument();
    });
  });

  it('displays user and assistant messages differently', () => {
    render(<MessageList />);

    const userMessage = screen.getByText('Hello', { exact: false }).closest('[data-testid="message-container"]');
    const assistantMessage = screen.getByText('Hi there!', { exact: false }).closest('[data-testid="message-container"]');

    expect(userMessage).toHaveAttribute('data-role', 'user');
    expect(assistantMessage).toHaveAttribute('data-role', 'assistant');
  });

  it('shows timestamps when enabled in settings', () => {
    render(<MessageList />);

    const timestamps = screen.getAllByRole('time');
    expect(timestamps).toHaveLength(initialState.chat.sessions[0].messages.length);
  });

  it('hides timestamps when disabled in settings', () => {
    const mockUseAppSelector = ReduxHooks.useAppSelector as jest.Mock;
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector.name === 'selectCurrentSession') {
        return initialState.chat.sessions[0];
      }
      if (selector.name === 'selectMessageDisplayPreferences') {
        return { ...initialState.settings.messageDisplayPreferences, showTimestamp: false };
      }
      if (selector.name === 'selectIsStreaming') {
        return initialState.chat.isStreaming;
      }
      return selector(initialState);
    });

    render(<MessageList />);
    const timestamps = screen.queryAllByRole('time');
    expect(timestamps).toHaveLength(0);
  });

  it('shows streaming indicator for the last message while streaming', () => {
    const mockUseAppSelector = ReduxHooks.useAppSelector as jest.Mock;
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector.name === 'selectCurrentSession') {
        return initialState.chat.sessions[0];
      }
      if (selector.name === 'selectMessageDisplayPreferences') {
        return initialState.settings.messageDisplayPreferences;
      }
      if (selector.name === 'selectIsStreaming') {
        return true;
      }
      return selector(initialState);
    });

    render(<MessageList />);
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
  });

  it('displays empty state when no messages exist', () => {
    const mockUseAppSelector = ReduxHooks.useAppSelector as jest.Mock;
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector.name === 'selectCurrentSession') {
        return null;
      }
      if (selector.name === 'selectMessageDisplayPreferences') {
        return initialState.settings.messageDisplayPreferences;
      }
      if (selector.name === 'selectIsStreaming') {
        return false;
      }
      return selector(initialState);
    });

    render(<MessageList />);
    expect(screen.getByText('No messages')).toBeInTheDocument();
  });

  it('scrolls to bottom when new messages are added', () => {
    render(<MessageList />);
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('shows message actions on hover', async () => {
    render(<MessageList />);

    // Find an assistant message and hover over it
    const message = screen.getByText('Hi there!', { exact: false });
    fireEvent.mouseEnter(message.closest('[data-testid="message-container"]')!);

    expect(screen.getByLabelText(/copy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/retry/i)).toBeInTheDocument();
  });

  it('copies message content when copy button is clicked', () => {
    render(<MessageList />);

    const message = screen.getByText('Hello', { exact: false });
    fireEvent.mouseEnter(message.closest('[data-testid="message-container"]')!);

    fireEvent.click(screen.getByLabelText(/copy/i));
    expect(mockClipboardWrite).toHaveBeenCalledWith('Hello');
  });
});
