import { Box, CircularProgress } from '@mui/material';
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
    login();
    return null;
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
          <MessageList />
        </Box>
        <MessageInput />
      </Box>
    </Box>
  );
}
