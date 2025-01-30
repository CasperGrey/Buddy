import { Auth0Provider as BaseAuth0Provider, Auth0Context } from '@auth0/auth0-react';
import { auth0Config } from '../../lib/auth/auth0-config';

interface Auth0ProviderProps {
  children: React.ReactNode;
}

// Mock Auth0 context for development mode
const MockAuth0Context = ({ children }: Auth0ProviderProps) => {
  const mockUser = {
    email: 'test@example.com',
    name: 'Test User',
    sub: 'test-user-id'
  };

  const mockAuth0Context = {
    isAuthenticated: true,
    user: mockUser,
    isLoading: false,
    getAccessTokenSilently: async () => 'mock-token',
    loginWithRedirect: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    getIdTokenClaims: () => Promise.resolve(null),
    handleRedirectCallback: () => Promise.resolve({ appState: {} })
  };

  return (
    <Auth0Context.Provider value={mockAuth0Context as any}>
      {children}
    </Auth0Context.Provider>
  );
};

export default function Auth0Provider({ children }: Auth0ProviderProps) {
  // Use mock provider in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('Using mock Auth0 provider in development mode');
    return <MockAuth0Context>{children}</MockAuth0Context>;
  }

  // Production mode - use real Auth0 provider
  if (!auth0Config.domain || !auth0Config.clientId) {
    console.error('Auth0 configuration missing required values:', {
      domain: auth0Config.domain ? 'set' : 'missing',
      clientId: auth0Config.clientId ? 'set' : 'missing'
    });
    return null;
  }

  return (
    <BaseAuth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        scope: 'openid profile email offline_access',
        audience: process.env.REACT_APP_AUTH0_AUDIENCE
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
    >
      {children}
    </BaseAuth0Provider>
  );
}
