import { Box } from '@mui/material';
import Sidebar from '../sidebar/Sidebar';
import SessionHeader from './SessionHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function Chat() {
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
