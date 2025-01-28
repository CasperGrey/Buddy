import React from 'react';
import Chat from './components/chat/Chat';
import Providers from './components/providers/Providers';

// Import fonts
import '@fontsource/poppins/500.css';
import '@fontsource/karla/400.css';

function App() {
  return (
    <div className="font-sans antialiased">
      <Providers>
        <Chat />
      </Providers>
    </div>
  );
}

export default App;
