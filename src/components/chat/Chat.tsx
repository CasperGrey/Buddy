import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import Sidebar from '../sidebar/Sidebar';
import SessionHeader from './SessionHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useAuth } from '../../lib/hooks/useAuth';

export default function Chat() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Typography variant="h5">Please log in to continue</Typography>
        <Button
          variant="contained"
          onClick={() => {
            console.log('Login button clicked');
            login({
              appState: { returnTo: window.location.pathname }
            });
          }}
        >
          Log In
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <SessionHeader />
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {!window.location.pathname.slice(1) ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                textAlign: 'center',
                gap: 2
              }}
            >
              <Typography variant="h4">
                Welcome, {useAuth().user?.name}!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                Buddy Chat is your AI companion for intelligent conversations. You can chat with various AI models,
                customize your experience in settings, and manage multiple chat sessions. Your API keys and preferences
                are securely saved for your next visit.
              </Typography>
            </Box>
          ) : (
            <MessageList />
          )}
        </Box>
        <MessageInput />
      </Box>
    </Box>
  );
}
