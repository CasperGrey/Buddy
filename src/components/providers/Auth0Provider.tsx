import { Auth0Provider as BaseAuth0Provider } from '@auth0/auth0-react';
import { auth0Config } from '../../lib/auth/auth0-config';

interface Auth0ProviderProps {
  children: React.ReactNode;
}

export default function Auth0Provider({ children }: Auth0ProviderProps) {
  if (!auth0Config.domain || !auth0Config.clientId) {
    console.error('Auth0 configuration missing required values:', {
      domain: auth0Config.domain ? 'set' : 'missing',
      clientId: auth0Config.clientId ? 'set' : 'missing'
    });
    return null;
  }

  console.log('Initializing Auth0Provider with config:', {
    domain: auth0Config.domain,
    redirectUri: window.location.origin,
    useRefreshTokens: auth0Config.useRefreshTokens,
    cacheLocation: auth0Config.cacheLocation
  });

  const redirectUri = 'http://localhost:3000';
  console.log('Setting up Auth0 with redirect URI:', redirectUri);

  return (
    <BaseAuth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        scope: 'openid profile email'
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      onRedirectCallback={(appState) => {
        try {
          console.log('Auth0 redirect callback triggered');
          console.log('AppState:', appState);
          const returnTo = appState?.returnTo || '/';
          console.log('Redirecting to:', returnTo);
          window.history.replaceState({}, document.title, returnTo);
        } catch (error) {
          console.error('Error in redirect callback:', error);
        }
      }}
    >
      {children}
    </BaseAuth0Provider>
  );
}
