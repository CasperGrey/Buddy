# Buddy Chat

A real-time chat application with Azure backend integration.

## Project Structure

```
buddy-chat/
├── .github/workflows/      # GitHub Actions workflows
│   └── azure-deploy-optimized.yml   # Production deployment
├── public/               # Static assets
├── src/                  # Frontend code
│   ├── components/       # React components
│   │   ├── chat/        # Chat interface components
│   │   ├── providers/   # Context providers
│   │   ├── settings/    # Settings components
│   │   ├── sidebar/     # Sidebar components
│   │   └── user/        # User-related components
│   ├── lib/             # Core functionality
│   │   ├── api/         # API integrations (Anthropic, DeepSeek, OpenAI)
│   │   ├── auth/        # Authentication
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # Service layer
│   │   ├── store/       # Redux store and slices
│   │   ├── theme/       # Theme configuration
│   │   └── utils/       # Utility functions
│   └── styles/          # Global styles
└── server/              # Backend code
    ├── config/          # Azure configuration
    └── middleware/      # Auth middleware
```

## Features

- Real-time chat using WebSocket
- Multiple AI model integrations:
  - Anthropic Claude
  - DeepSeek
  - OpenAI
- Azure services integration (Cosmos DB, Redis)
- Auth0 authentication
- Redux state management with encrypted persistence
- Message persistence and caching
- Automated Azure setup and deployment
- Tailwind CSS for styling

## Setup

### Prerequisites

- Node.js 18.x or later
- Git
- GitHub account with repository access
- Azure subscription with required permissions:
  - Directory.ReadWrite.All
  - Application.ReadWrite.All
- Windows (for automated setup) or manual Azure CLI setup

### Initial Azure Setup

The project includes an automated setup process for Azure authentication and GitHub Actions configuration:

1. Create a GitHub Personal Access Token (GH_PAT):
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate a new token with `repo` and `workflow` permissions
   - Save the token securely - you'll need it during setup

2. Clone the repository and navigate to the project directory

3. Run the automated setup script:
```bash
setup.bat
```

This script will:
- Install Azure CLI if not present
- Create necessary Azure AD applications with required permissions:
  - Directory.ReadWrite.All for Azure AD operations
  - Application.ReadWrite.All for federated credentials
- Configure GitHub Actions OIDC authentication
- Set up required GitHub secrets automatically:
  - GH_PAT: Your GitHub Personal Access Token (encrypted)
  - AZURE_CLIENT_ID: Azure AD application client ID
  - AZURE_TENANT_ID: Azure AD tenant ID
  - AZURE_SUBSCRIPTION_ID: Azure subscription ID

If you're not on Windows, you'll need to manually:
- Install Azure CLI
- Run `az login`
- Create an Azure AD application with required permissions
- Configure OIDC authentication
- Set up GitHub secrets:
  1. Go to your repository's Settings → Secrets and variables → Actions
  2. Add the required secrets listed above

### Development Environment

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:

Create a `.env` file with:
```
# Auth0
AUTH0_DOMAIN=your-auth0-domain
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_AUDIENCE=your-auth0-audience

# Azure
KEY_VAULT_URL=your-key-vault-url
COSMOS_DB_CONNECTION_STRING=your-cosmos-connection
REDIS_CONNECTION_STRING=your-redis-connection

# Server
PORT=3001
```

3. Start the development server:
```bash
npm start
```

This will concurrently run:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Production Deployment

The application automatically deploys to Azure App Service using GitHub Actions when you push to the main branch.

#### Required GitHub Secrets

After running the setup script, these secrets will be automatically configured:
- `AZURE_CLIENT_ID`: Azure AD application client ID
- `AZURE_TENANT_ID`: Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID

You'll need to manually add these additional secrets:
- `COSMOS_DB_CONNECTION_STRING`: MongoDB connection string for Cosmos DB
  - Get from: Azure Portal → Cosmos DB → Connection Strings
- `REDIS_CONNECTION_STRING`: Connection string for Azure Cache for Redis
  - Format: hostname:port,password=xxx,ssl=True,abortConnect=False
  - Get from: Azure Portal → Redis Cache → Access keys

#### Deployment Process

1. Automated deployment:
   - Push to the main branch to trigger automatic deployment
   - Or manually trigger the workflow in GitHub Actions

2. The deployment workflow will:
   - Authenticate with Azure using OIDC
   - Build the application with optimized settings
   - Configure Node.js runtime (18-lts)
   - Install and configure PM2 process manager with resource limits
   - Deploy optimized frontend to Azure Web App
   - Deploy optimized backend to separate Azure Web App
   - Set up environment variables and app settings
   - Run parallel health checks with enhanced logging
   - Monitor deployment status with retry logic

Your application will be available at:
- Frontend: `https://buddy-chat-app.azurewebsites.net`
- Backend: `https://chat-app-backend-123.azurewebsites.net`

## Development

### Frontend

The frontend uses React with TypeScript and includes:
- WebSocket-based chat service
- Redux for state management
- Material-UI components
- Auth0 integration

### Backend

The backend includes:
- Express server with WebSocket support
- Azure services integration
- Auth0 validation middleware
- Message persistence in Cosmos DB
- Message caching in Redis
- Resource-optimized PM2 configuration
- Memory-managed Node.js runtime

## Testing

The project uses Jest and React Testing Library for testing, with a robust architecture for maintainable and reliable tests.

### Test Suite Architecture

```
src/
├── setupTests.ts           # Global test setup and shared mocks
├── test-utils.tsx         # Custom test utilities and providers
└── components/
    └── chat/
        ├── Component.tsx   # Component implementation
        └── __tests__/     # Component-specific tests
            └── Component.test.tsx
```

### Key Testing Patterns

#### Centralized Mock Management
All common mocks are centralized in `setupTests.ts`:
- Component mocks using `createMockElement` helper
- Hook mocks with proper TypeScript interfaces
- Auth0, Material-UI, and other third-party mocks
- WebSocket and DOM API mocks

Example component mock:
```typescript
jest.mock('./components/chat/MessageInput', () => {
  return {
    __esModule: true,
    default: function MockMessageInput() {
      return createMockElement('div', { 'data-testid': 'message-input' }, 'MessageInput');
    }
  };
});
```

#### Hook Mocking
Hooks are mocked using jest.spyOn for better type safety and control:
```typescript
jest.spyOn(ReduxHooks, 'useAppDispatch').mockImplementation(() => mockDispatch);
jest.spyOn(NotificationProvider, 'useNotification').mockImplementation(() => ({
  showNotification: mockShowNotification
}));
```

#### MUI Component Mocking
Material-UI components require special mocking to ensure proper testing:
```typescript
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
```

#### Test Isolation
Each test file follows these practices:
- Mock setup in beforeEach blocks
- Proper cleanup after tests
- Scoped mock variables
- Typed test utilities

Example test structure:
```typescript
describe('Component', () => {
  const mockFn = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup component-specific mocks
  });

  it('handles specific behavior', () => {
    render(<Component />);
    // Test implementation
  });
});
```

#### Custom Test Utilities
The project includes custom test utilities in `test-utils.tsx`:
- Wrapped render function with providers
- Common test data (mockChat, mockSettings, etc.)
- Type-safe test helpers
- Redux store setup utilities

Example usage:
```typescript
import { render, screen } from '../../../test-utils';

test('component behavior', () => {
  render(<Component />, { 
    preloadedState: {
      chat: mockChat,
      settings: mockSettings
    }
  });
  // Test assertions
});
```

### Best Practices

1. Component Testing:
   - Unmock the component being tested using jest.unmock()
   - Create explicit Material-UI component mocks
   - Use proper TypeScript state typing
   - Test component behavior, not implementation
   - Focus on user interactions and state changes
   - Use data-testid for test-specific selectors
   - Verify proper error handling
   - Match component selectors exactly (data-testid, roles)

2. Redux Integration:
   - Use typed initial state
   - Mock selectors consistently
   - Test state-dependent behavior
   - Verify dispatch calls
   - Mock useAppSelector with proper typing
   - Test different state scenarios

3. Auth Testing:
   - Mock Auth0 interfaces completely
   - Test all auth states (loading, authenticated, unauthenticated)
   - Use proper User type for mock data
   - Test auth-dependent UI states

4. Async Testing:
   - Use waitFor for async operations
   - Test loading states
   - Handle promises properly
   - Test error cases
   - Mock async operations consistently

5. Test Organization:
   - Group related tests logically
   - Use clear test descriptions
   - Keep tests focused and isolated
   - Follow AAA pattern (Arrange, Act, Assert)
   - Maintain consistent mock patterns

### Example Patterns

#### Redux State Testing
```typescript
// Mock Redux hooks
const mockDispatch = jest.fn();
const mockUseAppSelector = jest.fn();
jest.mock('../../lib/store/hooks', () => ({
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
  useAppDispatch: () => mockDispatch
}));

// Setup selector mocks
mockUseAppSelector.mockImplementation((selector) => {
  if (selector === selectCurrentSession) {
    return mockSession;
  }
  return selector(initialState);
});
```

#### Auth Testing
```typescript
const mockAuthUser: User = {
  name: 'Test User',
  sub: 'test-user-id',
  email: 'test@example.com'
};

jest.spyOn(AuthHook, 'useAuth').mockReturnValue({
  isAuthenticated: true,
  isLoading: false,
  user: mockAuthUser,
  error: undefined,
  login: mockLogin,
  logout: mockLogout,
  getToken: mockGetToken
});
```

#### Async Testing
```typescript
it('handles async operations', async () => {
  render(<Component />);
  
  // Click trigger
  fireEvent.click(screen.getByRole('button'));
  
  // Wait for async results
  await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

#### Component Testing
```typescript
// Unmock component being tested
jest.unmock('../Component');

// Mock MUI components
jest.mock('@mui/material', () => ({
  IconButton: function IconButton(props: any) {
    const { children, onClick, 'aria-label': ariaLabel } = props;
    return (
      <button
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  }
}));

it('renders and behaves correctly', () => {
  render(<Component />, { preloadedState: initialState });
  expect(screen.getByTestId('component-id')).toBeInTheDocument();
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- MessageInput.test.tsx
```

## API

### WebSocket Events

#### Client -> Server
- `SEND_MESSAGE`: Send a new chat message
  ```typescript
  {
    type: 'SEND_MESSAGE',
    payload: {
      messages: Array<{role: string, content: string}>,
      model: string,      // 'anthropic' | 'deepseek' | 'openai'
      systemPrompt?: string,
      temperature?: number,
      maxTokens?: number
    }
  }
  ```

#### Server -> Client
- `MESSAGE_RESPONSE`: Successful message response
  ```typescript
  {
    type: 'MESSAGE_RESPONSE',
    content: string,
    conversationId: string,
    model: string,
    usage?: {
      promptTokens: number,
      completionTokens: number,
      totalTokens: number
    }
  }
  ```
- `ERROR`: Error response
  ```typescript
  {
    type: 'ERROR',
    error: string,
    code?: string
  }
  ```

## Recent Changes

### DevOps Infrastructure Optimizations (Latest)
- Enhanced Runner Configuration:
  - Implemented matrix-based parallel deployments
  - Optimized cache key generation with dependency tracking
  - Added concurrency controls for deployment jobs
  - Enhanced artifact compression and cleanup
  - Improved error handling and recovery mechanisms

- Infrastructure as Code Updates:
  - Implemented auto-scaling with CPU-based metrics
  - Enhanced monitoring with Application Insights integration
  - Added diagnostic settings for improved observability
  - Configured secure networking and access policies

- Scaling Policy Implementation:
  - Configured dynamic scaling based on CPU utilization (25-75% thresholds)
  - Set resource limits (512MB memory, 2 workers per service)
  - Implemented 5-minute cooldown periods to prevent thrashing
  - Added parallel deployment capabilities
  - Enhanced health check mechanisms with detailed logging

- Resource Management Optimizations:
  - Optimized container size and build artifacts
  - Improved memory and CPU allocation
  - Enhanced build cache efficiency with granular key generation
  - Implemented automated cleanup processes
  - Added resource usage monitoring with Application Insights

- Cleanup Automation:
  - Implemented resource-specific cleanup procedures:
    - Web Apps: Deployment slots and logs cleanup
    - Cosmos DB: Automated backup management
    - Redis Cache: Memory policy optimization
    - Key Vault: Key and secret version cleanup
    - Application Insights: Data retention management
  - Enhanced error handling and logging
  - Automated tag cleanup for better resource management

### Infrastructure Updates (Previous)
- Fixed Azure AD authorization issues:
  - Added Application.ReadWrite.All permission for federated credentials
  - Implemented retry logic for Azure AD operations
  - Added proper handling of existing federated credentials
- Enhanced deployment configuration:
  - Configured Node.js runtime (18-lts) for both apps
  - Added PM2 process management
  - Improved build output handling
  - Added deployment verification and logging
- Fixed GitHub secret encryption in Azure setup process
- Added automated GH_PAT secret configuration
- Improved error handling in setup script
- Enhanced secret management security using tweetsodium

### Earlier Infrastructure Updates
- Implemented automated Azure setup process using setup.bat
- Migrated to OIDC-based Azure authentication
- Added GitHub Actions workflow for Azure setup
- Improved secret management and security
- Separated frontend and backend deployments

### Technical Updates (Previous)
- WebSocket-based communication
- Azure services integration
- Real-time message handling
- Server-side persistence
- Enhanced error handling and reconnection logic
