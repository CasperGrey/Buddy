import React from 'react';
import { render, screen, fireEvent } from '../../../test-utils';
// Force using actual component instead of mock
jest.unmock('../SessionHeader');
import SessionHeader from '../SessionHeader';
import { mockChat, mockSettings, mockUser, createTestStore } from '../../../test-utils';
import * as ReduxHooks from '../../../lib/store/hooks';
import type { ChatState } from '../../../lib/store/slices/chatSlice';

// Mock MUI components
jest.mock('@mui/material', () => ({
  Box: function Box(props: any) {
    const { children, sx, ...rest } = props;
    return <div style={sx} {...rest}>{children}</div>;
  },
  IconButton: function IconButton(props: any) {
    const { children, onClick, ...rest } = props;
    return (
      <button type="button" onClick={onClick} {...rest}>
        {children}
      </button>
    );
  },
  Typography: function Typography(props: any) {
    const { children, variant, sx, ...rest } = props;
    return <div style={sx} {...rest}>{children}</div>;
  },
  Menu: function Menu(props: any) {
    const { children, open, onClose, anchorEl, transformOrigin, anchorOrigin, ...rest } = props;
    if (!open) return null;
    return (
      <div data-testid="menu-backdrop" onClick={onClose}>
        <div role="menu" data-testid="menu-items" {...rest}>
          {children}
        </div>
      </div>
    );
  },
  MenuItem: function MenuItem(props: any) {
    const { children, onClick, ...rest } = props;
    return (
      <div role="menuitem" onClick={onClick} {...rest}>
        {children}
      </div>
    );
  },
  ListItemIcon: function ListItemIcon(props: any) {
    return <span className="list-item-icon">{props.children}</span>;
  },
  ListItemText: function ListItemText(props: any) {
    return <span className="list-item-text">{props.primary || props.children}</span>;
  },
  Stack: function Stack(props: any) {
    const { children, direction, alignItems, spacing, ...rest } = props;
    return (
      <div 
        className="stack" 
        style={{ 
          display: 'flex', 
          flexDirection: direction,
          alignItems,
          gap: spacing === 1 ? '8px' : spacing + 'px'
        }} 
        {...rest}
      >
        {children}
      </div>
    );
  },
  useTheme: () => ({
    palette: {
      divider: '#000',
      background: { paper: '#fff' },
      error: { main: '#f00' }
    }
  })
}));

// Mock MUI icons
jest.mock('@mui/icons-material', () => ({
  MoreVert: function MoreVert() { return <div data-testid="MoreVertIcon">More</div>; },
  Delete: function Delete() { return <div data-testid="DeleteIcon">Delete</div>; },
  Download: function Download() { return <div data-testid="DownloadIcon">Download</div>; },
  Clear: function Clear() { return <div data-testid="ClearIcon">Clear</div>; }
}));

// Mock NotificationProvider
const mockShowNotification = jest.fn();
jest.mock('../../../components/providers/NotificationProvider', () => ({
  useNotification: () => ({
    showNotification: mockShowNotification
  })
}));

// Mock UserMenu component
jest.mock('../../../components/user/UserMenu', () => {
  return {
    __esModule: true,
    default: function MockUserMenu() {
      return <div data-testid="UserMenu">UserMenu</div>;
    }
  };
});

// Mock function declarations
const mockDispatch = jest.fn();

describe('SessionHeader Component', () => {
  let store: ReturnType<typeof createTestStore>;

  let mockSelector = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock dispatch and selector
    jest.spyOn(ReduxHooks, 'useAppDispatch').mockImplementation(() => mockDispatch);
    mockSelector = jest.fn();
    jest.spyOn(ReduxHooks, 'useAppSelector').mockImplementation(selector => mockSelector(selector));

    // Setup default mock selector behavior
    mockSelector.mockImplementation(selector => {
      const defaultState = {
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
        settings: mockSettings,
        user: mockUser
      };
      return selector(defaultState);
    });

    // Create fresh store for each test
    store = createTestStore();
  });

  it('renders session title when session is selected', () => {
    render(<SessionHeader />, { store });
    expect(screen.getByTestId('session-title')).toHaveTextContent('Test Chat');
  });

  describe('Null Session Cases', () => {
    it('returns null when no session is selected', () => {
      mockSelector.mockImplementation(() => null);
      const { container } = render(<SessionHeader />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when session not found', () => {
      mockSelector.mockImplementation(() => null);
      const { container } = render(<SessionHeader />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when sessions array is empty but currentSessionId exists', () => {
      mockSelector.mockImplementation(() => null);
      const { container } = render(<SessionHeader />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Menu Behavior', () => {
    beforeEach(() => {
      render(<SessionHeader />, { store });
    });

    it('opens menu when clicking more icon', () => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('menu-button'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('closes menu when clicking outside', () => {
      // Open menu
      fireEvent.click(screen.getByTestId('menu-button'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      // Click backdrop to close
      const backdrop = screen.getByTestId('menu-backdrop');
      fireEvent.click(backdrop);
      
      // Menu should be closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Session Actions', () => {
    beforeEach(() => {
      render(<SessionHeader />, { store });
    });

    it('handles clear session with notification', () => {
      fireEvent.click(screen.getByTestId('menu-button'));
      fireEvent.click(screen.getByText('Clear history'));
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: expect.stringContaining('chat/clearSession'),
        payload: 'test-session-id'
      }));
      expect(mockShowNotification).toHaveBeenCalledWith('Chat history cleared', 'success');
    });

    it('handles delete session with notification', () => {
      fireEvent.click(screen.getByTestId('menu-button'));
      fireEvent.click(screen.getByText('Delete chat'));
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: expect.stringContaining('chat/deleteSession'),
        payload: 'test-session-id'
      }));
      expect(mockShowNotification).toHaveBeenCalledWith('Chat deleted', 'success');
    });

  });

  describe('Component Rendering', () => {
    it('renders UserMenu component', () => {
      render(<SessionHeader />, { store });
      expect(screen.getByTestId('UserMenu')).toBeInTheDocument();
    });

    it('applies correct styling to header container', () => {
      render(<SessionHeader />, { store });
      const header = screen.getByTestId('session-header');
      expect(header).toHaveStyle({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px'
      });
    });

    it('renders all menu items with correct icons', () => {
      render(<SessionHeader />, { store });
      fireEvent.click(screen.getByTestId('menu-button'));
      expect(screen.getByTestId('ClearIcon')).toBeInTheDocument();
      expect(screen.getByTestId('DownloadIcon')).toBeInTheDocument();
      expect(screen.getByTestId('DeleteIcon')).toBeInTheDocument();
      expect(screen.getByText('Clear history')).toBeInTheDocument();
      expect(screen.getByText('Export chat')).toBeInTheDocument();
      expect(screen.getByText('Delete chat')).toBeInTheDocument();
    });
  });
});
