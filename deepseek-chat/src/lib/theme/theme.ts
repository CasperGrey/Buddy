 import { createTheme, ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    chat: {
      userMessage: string;
      assistantMessage: string;
      timestamp: string;
    };
  }
  interface PaletteOptions {
    chat?: {
      userMessage: string;
      assistantMessage: string;
      timestamp: string;
    };
  }
}

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: 'var(--font-poppins), "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#204B87',
      dark: '#204B87',
      light: '#2383C5',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    chat: {
      userMessage: '#f1f5f9',
      assistantMessage: '#ffffff',
      timestamp: '#64748b',
    },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#2383C5',
      dark: '#204B87',
      light: '#2383C5',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    chat: {
      userMessage: '#1e293b',
      assistantMessage: '#1e293b',
      timestamp: '#94a3b8',
    },
  },
});
