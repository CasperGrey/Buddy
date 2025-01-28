# Buddy Chat

A modern, responsive chat interface for interacting with DeepSeek AI models, built with React and Material-UI.

## Features

- 💬 Real-time chat interface with message streaming
- 🎨 Modern, responsive design with Material-UI
- 🌓 Light/Dark theme support
- 📝 Markdown and code syntax highlighting
- 💾 Multiple chat sessions with persistence
- ⚡ Message retry and editing capabilities
- 🔄 Session management (create, rename, delete)
- ⚙️ Configurable model settings
- 📱 Mobile-responsive layout
- 🔐 User authentication with Auth0
- 🔒 Secure token storage with encryption
- ⌨️ Customizable input settings (Enter to send)

## Tech Stack

- **Frontend Framework**: React 18+ with TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **State Management**: Redux Toolkit with Redux Persist
- **Authentication**: Auth0
- **Styling**: Tailwind CSS & Emotion (MUI's styling solution)
- **Code Formatting**: Markdown support with syntax highlighting
- **Type Safety**: TypeScript
- **Routing**: React Router
- **Deployment**: Vercel

## Environment Variables (Vercel)

Configure the following environment variables in your Vercel project settings:

1. Go to your project in the Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:
   - `REACT_APP_AUTH0_DOMAIN`: Your Auth0 domain
   - `REACT_APP_AUTH0_CLIENT_ID`: Your Auth0 client ID
   - `REACT_APP_STORAGE_KEY`: A secure key for encrypting stored tokens

For local development:
1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Link your project and pull environment variables:
   ```bash
   vercel link
   vercel env pull
   ```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/buddy-chat.git
   cd buddy-chat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Pull environment variables from Vercel:
   ```bash
   vercel env pull
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Auth0 Setup

1. Create a new application in Auth0 Dashboard
2. Configure the following settings:
   - Application Type: Single Page Application
   - Allowed Callback URLs: 
     - Development: http://localhost:3000
     - Production: https://your-vercel-domain.vercel.app
   - Allowed Logout URLs: 
     - Development: http://localhost:3000
     - Production: https://your-vercel-domain.vercel.app
   - Allowed Web Origins: 
     - Development: http://localhost:3000
     - Production: https://your-vercel-domain.vercel.app
3. Add the Domain and Client ID to your Vercel environment variables

## Project Structure

```
buddy-chat/
├── src/
│   ├── components/          # React components
│   │   ├── chat/           # Chat-related components
│   │   ├── providers/      # Context providers
│   │   ├── settings/       # Settings components
│   │   ├── sidebar/        # Sidebar components
│   │   └── user/           # User-related components
│   ├── lib/                # Utilities and configurations
│   │   ├── auth/           # Auth0 configuration
│   │   ├── store/          # Redux store setup
│   │   │   └── slices/     # Redux slices
│   │   ├── hooks/          # Custom hooks
│   │   └── theme/          # MUI theme configuration
│   ├── styles/             # Global styles
│   ├── App.tsx             # Root component
│   └── index.tsx           # Application entry point
└── public/                 # Static assets
```

## Features in Detail

### Authentication & Security
- User authentication via Auth0
- Secure token storage with encryption
- Per-user chat history and settings

### Chat Interface
- Real-time message streaming
- Markdown support with syntax highlighting
- Copy message content
- Retry failed messages
- Message timestamps
- Loading indicators
- Enter to send messages (configurable)

### Session Management
- Create new chat sessions
- Rename existing sessions
- Delete sessions
- Clear chat history
- Export chat history

### Settings
- Model selection (different models)
- Temperature adjustment
- System prompt customization
- UI preferences (timestamps, dark mode, enter to send)
- API key management

### UI/UX
- Responsive design for all screen sizes
- Smooth animations and transitions
- Keyboard shortcuts
- Error notifications
- Loading states and indicators

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
