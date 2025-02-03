import React from 'react';
import { Box } from '@mui/material';
import Chat from './components/chat/Chat';
import Sidebar from './components/sidebar/Sidebar';
import Providers from './components/providers/Providers';

// Import fonts
import '@fontsource/poppins/500.css';
import '@fontsource/karla/400.css';

function App() {
  return (
    <Providers>
      <Box sx={{ 
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary'
      }}>
        <Sidebar />
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh'
        }}>
          <Chat />
        </Box>
      </Box>
    </Providers>
  );
}

export default App;
