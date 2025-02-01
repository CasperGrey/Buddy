import { render, screen, fireEvent } from '../../../test-utils';
// Force using actual component instead of mock
jest.unmock('../MessageActions');
import MessageActions from '../MessageActions';
import { mockChat, mockSettings, mockUser, RootState } from '../../../test-utils';
import * as NotificationProvider from '../../providers/NotificationProvider';
import * as ReduxHooks from '../../../lib/store/hooks';
import { retryMessage } from '../../../lib/store/slices/chatSlice';

// Mock Redux hooks
const mockDispatch = jest.fn();
jest.mock('../../../lib/store/hooks', () => ({
  useAppSelector: jest.fn((selector) => selector),
  useAppDispatch: () => mockDispatch
}));

// Mock MUI components
jest.mock('@mui/material', () => ({
  Box: function Box(props: any) {
    const { children, sx, ...rest } = props;
    return <div style={sx} {...rest}>{children}</div>;
  },
  IconButton: function IconButton(props: any) {
    const { children, onClick, size, 'aria-label': ariaLabel, sx, ...rest } = props;
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        {...rest}
      >
        {children}
      </button>
    );
  },
  Tooltip: function Tooltip(props: any) {
    const { children, title, ...rest } = props;
    return (
      <div title={title} {...rest}>
        {children}
      </div>
    );
  }
}));

// Mock icons
jest.mock('@mui/icons-material', () => ({
  ContentCopy: function CopyIcon() { 
    return <div data-testid="copy-icon">Copy</div>; 
  },
  Refresh: function RetryIcon() { 
    return <div data-testid="retry-icon">Retry</div>; 
  }
}));

describe('MessageActions Component', () => {
  const mockShowNotification = jest.fn();

  const mockMessage = {
    id: 'test-message-id',
    content: 'Test message content',
    role: 'assistant' as const,
    timestamp: new Date().toISOString()
  };

  const initialState: RootState = {
    chat: {
      sessions: [{
        id: 'test-session-id',
        name: 'Test Chat',
        messages: [mockMessage],
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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup notification hook mock
    jest.spyOn(NotificationProvider, 'useNotification').mockReturnValue({
      showNotification: mockShowNotification
    });
  });

  it('renders action buttons for assistant messages when visible', () => {
    render(
      <MessageActions
        message={mockMessage}
        visible={true}
      />,
      { preloadedState: initialState }
    );

    expect(screen.getByLabelText(/copy message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/retry response/i)).toBeInTheDocument();
  });

  it('hides all buttons when visible prop is false', () => {
    const { container } = render(
      <MessageActions
        message={mockMessage}
        visible={false}
      />,
      { preloadedState: initialState }
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows only copy button for user messages', () => {
    const userMessage = {
      ...mockMessage,
      role: 'user' as const
    };

    render(
      <MessageActions
        message={userMessage}
        visible={true}
      />,
      { preloadedState: initialState }
    );

    expect(screen.getByLabelText(/copy message/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/retry response/i)).not.toBeInTheDocument();
  });

  it('dispatches retry action when retry button is clicked', () => {
    render(
      <MessageActions
        message={mockMessage}
        visible={true}
      />,
      { preloadedState: initialState }
    );

    fireEvent.click(screen.getByLabelText(/retry response/i));
    expect(mockDispatch).toHaveBeenCalledWith(retryMessage('test-message-id'));
  });
});
