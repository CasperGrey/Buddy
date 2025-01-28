# DeepSeek Chat

A modern, responsive chat interface for interacting with DeepseekAI models, built with React, Next.js, and Material-UI.

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

## Tech Stack

- **Frontend Framework**: React 18+ with TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **State Management**: Redux Toolkit
- **Routing & SSR**: Next.js 14
- **Styling**: Emotion (MUI's styling solution)
- **Code Formatting**: Markdown support with syntax highlighting
- **Type Safety**: TypeScript

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/deepseek-chat.git
   cd deepseek-chat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your DeepseekAI API key:
   ```
   DEEPSEEK_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
deepseek-chat/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   │   ├── chat/           # Chat-related components
│   │   ├── providers/      # Context providers
│   │   ├── settings/       # Settings components
│   │   └── sidebar/        # Sidebar components
│   └── lib/                # Utilities and configurations
│       ├── store/          # Redux store setup
│       │   └── slices/     # Redux slices
│       └── theme/          # MUI theme configuration
└── public/                 # Static assets
```

## Features in Detail

### Chat Interface
- Real-time message streaming
- Markdown support with syntax highlighting
- Copy message content
- Retry failed messages
- Message timestamps
- Loading indicators

### Session Management
- Create new chat sessions
- Rename existing sessions
- Delete sessions
- Clear chat history
- Export chat history

### Settings
- Model selection (different Deepseek models)
- Temperature adjustment
- System prompt customization
- UI preferences (timestamps, dark mode)

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
