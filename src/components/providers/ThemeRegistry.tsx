import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from '../../lib/theme/theme';
import { useAppSelector } from '../../lib/store/hooks';
import { selectTheme, selectButtonColor } from '../../lib/store/selectors';
import { useMemo } from 'react';

interface ThemeRegistryProps {
  children: React.ReactNode;
}

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  const themeMode = useAppSelector(selectTheme);
  const buttonColor = useAppSelector(selectButtonColor);

  const theme = useMemo(() => {
    const baseTheme = themeMode === 'light' ? lightTheme : darkTheme;
    baseTheme.components = {
      ...baseTheme.components,
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            backgroundColor: buttonColor,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: buttonColor ? `${buttonColor}dd` : undefined,
            },
          },
          contained: {
            backgroundColor: buttonColor,
            '&:hover': {
              backgroundColor: buttonColor ? `${buttonColor}dd` : undefined,
            },
          },
        },
      },
    };
    return baseTheme;
  }, [themeMode, buttonColor]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
