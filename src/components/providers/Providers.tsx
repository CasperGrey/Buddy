import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../../lib/store/store';
import { useEffect, useState } from 'react';
import ThemeRegistry from './ThemeRegistry';
import { NotificationProvider } from './NotificationProvider';
import Auth0Provider from './Auth0Provider';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Auth0Provider>
          <ThemeRegistry>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </ThemeRegistry>
        </Auth0Provider>
      </PersistGate>
    </ReduxProvider>
  );
}
