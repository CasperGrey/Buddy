import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
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
  } = useAuth0();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setLoading(isLoading));
  }, [isLoading, dispatch]);

  useEffect(() => {
    dispatch(setAuthenticated(isAuthenticated));
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (user) {
      dispatch(
        setProfile({
          email: user.email || '',
          name: user.name || '',
          picture: user.picture,
        })
      );
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (error) {
      dispatch(setError(error.message));
    }
  }, [error, dispatch]);

  const handleLogout = () => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    login: loginWithRedirect,
    logout: handleLogout,
  };
}
