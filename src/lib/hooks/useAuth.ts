import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setAuthenticated, setProfile, setLoading, setError } from '../store/slices/userSlice';

export function useAuth() {
  const {
    isAuthenticated,
    user,
    isLoading,
    error,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently
  } = useAuth0();
  const dispatch = useAppDispatch();

  // Handle loading state
  useEffect(() => {
    dispatch(setLoading(isLoading));
  }, [isLoading, dispatch]);

  // Handle authentication state
  useEffect(() => {
    if (!isLoading) {
      console.log('Authentication status:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
      dispatch(setAuthenticated(isAuthenticated));
    }
  }, [isAuthenticated, isLoading, dispatch]);

  // Handle user profile
  useEffect(() => {
    if (user) {
      console.log('User profile loaded:', user);
      dispatch(
        setProfile({
          email: user.email || '',
          name: user.name || '',
          picture: user.picture,
        })
      );
    }
  }, [user, dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Auth error:', error);
      dispatch(setError(error.message));
    }
  }, [error, dispatch]);

  // Memoized login handler
  const handleLogin = useCallback(async (options?: any) => {
    try {
      console.log('Initiating login redirect with options:', options);
      await loginWithRedirect({
        ...options,
        // Ensure we have the correct redirect URI
        authorizationParams: {
          ...options?.authorizationParams,
          redirect_uri: window.location.origin,
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      dispatch(setError(err instanceof Error ? err.message : 'Login failed'));
    }
  }, [loginWithRedirect, dispatch]);

  // Memoized logout handler
  const handleLogout = useCallback(async () => {
    try {
      console.log('Logging out...');
      await auth0Logout({
        logoutParams: {
          returnTo: window.location.origin,
        }
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [auth0Logout]);

  // Memoized token getter
  const getToken = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
          scope: 'openid profile email offline_access'
        },
        detailedResponse: true
      });
      console.log('Access token retrieved successfully');
      return token;
    } catch (err) {
      console.error('Error getting access token:', err);
      if (err instanceof Error) {
        // Handle token errors specifically
        if (err.message.includes('login_required')) {
          console.log('Session expired, redirecting to login...');
          await handleLogin();
        }
      }
      return null;
    }
  }, [getAccessTokenSilently, handleLogin]);

  // Check authentication status on mount
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated, checking session...');
      getToken().catch(console.error);
    }
  }, [isLoading, isAuthenticated, getToken]);

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    login: handleLogin,
    logout: handleLogout,
    getToken
  };
}
