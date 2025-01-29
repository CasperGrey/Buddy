

import { useRef, useEffect, useState } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import MessageActions from './MessageActions';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppSelector } from '../../lib/store/hooks';
import {
  selectCurrentSession,
  selectMessageDisplayPreferences,
} from '../../lib/store/selectors';
import { Message } from '../../lib/store/slices/chatSlice';

export default function MessageList() {
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const currentSession = useAppSelector(selectCurrentSession);
  const messages = currentSession?.messages || [];
  const { showTimestamp } = useAppSelector(selectMessageDisplayPreferences);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!currentSession) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body1">Select or create a chat to get started</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {messages.map((message: Message) => (
        <Box
          key={message.id}
          sx={{
            position: 'relative',
            maxWidth: '85%',
            alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
          }}
          onMouseEnter={() => setHoveredMessageId(message.id)}
          onMouseLeave={() => setHoveredMessageId(null)}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor:
                message.role === 'user'
                  ? theme.palette.chat.userMessage
                  : theme.palette.chat.assistantMessage,
              borderRadius: 2,
            }}
          >
          <Box sx={{ mb: showTimestamp ? 1 : 0 }}>
            <ReactMarkdown
              components={{
                code({ className, children }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const content = String(children).replace(/\n$/, '');
                  
                  if (!language) {
                    return <code>{content}</code>;
                  }

                  return (
                    <SyntaxHighlighter
                      style={tomorrow as any}
                      language={language}
                      PreTag="div"
                    >
                      {content}
                    </SyntaxHighlighter>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </Box>
          {showTimestamp && (
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.chat.timestamp,
                display: 'block',
                textAlign: message.role === 'user' ? 'right' : 'left',
              }}
            >
              {new Date(message.timestamp).toLocaleTimeString()}
            </Typography>
          )}
          <MessageActions
            message={message}
            visible={hoveredMessageId === message.id}
          />
          </Paper>
        </Box>
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
}
