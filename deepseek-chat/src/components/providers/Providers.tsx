'use client';

import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/lib/store/store';
import { useEffect, useState } from 'react';
import ThemeRegistry from './ThemeRegistry';
import { NotificationProvider } from './NotificationProvider';

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
      <ThemeRegistry>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </ThemeRegistry>
    </ReduxProvider>
  );
}
