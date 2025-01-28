import { Auth0Provider as BaseAuth0Provider } from '@auth0/auth0-react';
import { auth0Config } from '../../lib/auth/auth0-config';

interface Auth0ProviderProps {
  children: React.ReactNode;
}

export default function Auth0Provider({ children }: Auth0ProviderProps) {
  return (
    <BaseAuth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={auth0Config.authorizationParams}
      cacheLocation={auth0Config.cacheLocation}
    >
      {children}
    </BaseAuth0Provider>
  );
}
