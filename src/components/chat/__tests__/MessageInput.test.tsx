import { render, screen, fireEvent } from '../../../test-utils';
// Force using actual component instead of mock
jest.unmock('../MessageInput');
import MessageInput from '../MessageInput';
import { mockChat, mockSettings, mockUser, RootState, createTestStore } from '../../../test-utils';
import * as ReduxHooks from '../../../lib/store/hooks';
import * as useChatModule from '../../../lib/hooks/useChat';
import { selectCurrentSession, selectModelPreferences } from '../../../lib/store/selectors';

// Mock Redux hooks
const mockDispatch = jest.fn();
jest.mock('../../../lib/store/hooks', () => ({
  useAppSelector: jest.fn((selector) => selector),
  useAppDispatch: () => mockDispatch
}));

// Mock useChat hook
const mockSendMessage = jest.fn();
jest.mock('../../../lib/hooks/useChat', () => ({
  useChat: () => ({
    sendMessage: mockSendMessage
  })
}));

// Mock MUI components
jest.mock('@mui/material', () => ({
  Box: function Box(props: any) {
    const { children, sx, ...rest } = props;
    return <div style={sx} {...rest}>{children}</div>;
  },
  TextField: function TextField(props: any) {
    const { value = '', onChange, onKeyDown, placeholder, disabled, InputProps, ...rest } = props;
    return (
      <textarea
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={InputProps?.inputProps?.['aria-label']}
        data-testid={InputProps?.inputProps?.['data-testid']}
        role="textbox"
      />
    );
  },
  IconButton: function IconButton(props: any) {
    const { children, onClick, disabled, 'aria-label': ariaLabel, 'data-testid': dataTestId, ...rest } = props;
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        data-testid={dataTestId}
        {...rest}
      >
        {children}
      </button>
    );
  },
  CircularProgress: function CircularProgress(props: any) {
    return <div role="progressbar" data-testid="loading-indicator" {...props} />;
  },
  useTheme: () => ({
    palette: {
      divider: '#000',
      background: { paper: '#fff' }
    }
  })
}));

// Mock icons
jest.mock('@mui/icons-material', () => ({
  Send: function SendIcon() { 
    return <div data-testid="send-icon">Send</div>; 
  }
}));

describe('MessageInput Component', () => {
  let store: ReturnType<typeof createTestStore>;

  const initialState: RootState = {
    chat: {
      sessions: [{
        id: 'test-session-id',
        name: 'Test Chat',
        messages: [],
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
      modelPreferences: {
        defaultModel: 'test-model',
        openAIModel: 'gpt-4',
        temperature: 0.7,
        systemPrompt: 'You are a helpful assistant.'
      },
      messageDisplayPreferences: {
        showTimestamp: true,
        darkMode: false,
        enterToSend: true
      }
    },
    user: mockUser
  };

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore(initialState);

    // Setup mock selector
    const mockUseAppSelector = ReduxHooks.useAppSelector as jest.Mock;
    mockUseAppSelector.mockImplementation((selector) => {
      // Handle direct state access
      if (selector.toString().includes('state.chat.isStreaming')) return false;
      if (selector.toString().includes('state.chat.currentSessionId')) return 'test-session-id';
      if (selector.toString().includes('state.settings.messageDisplayPreferences.enterToSend')) return true;

      // Handle selector functions
      if (selector === selectCurrentSession) return initialState.chat.sessions[0];
      if (selector === selectModelPreferences) return initialState.settings.modelPreferences;

      return selector(initialState);
    });
  });

  it('sends message when clicking send button', () => {
    render(<MessageInput />, { preloadedState: initialState });
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByTestId('send-button');

    // Type a message
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    // Click send button
    fireEvent.click(sendButton);

    // Verify message was sent
    expect(mockSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('sends message when pressing Enter', () => {
    render(<MessageInput />, { preloadedState: initialState });
    
    const input = screen.getByRole('textbox');

    // Type a message
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    // Verify message was sent
    expect(mockSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('prevents sending empty messages', () => {
    render(<MessageInput />, { preloadedState: initialState });
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByTestId('send-button');

    // Try to send empty message
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(sendButton);

    // Verify no message was sent
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
