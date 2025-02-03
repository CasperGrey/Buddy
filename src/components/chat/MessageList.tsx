import { useRef, useEffect, useState, useCallback } from 'react';
import { debugLog } from '../../lib/utils/debug';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import MessageActions from './MessageActions';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppSelector, useAppDispatch } from '../../lib/store/hooks';
import { selectMessageDisplayPreferences } from '../../lib/store/selectors';
import { Message, retryMessage } from '../../lib/store/slices/chatSlice';

interface MessageListProps {
  messages: Omit<Message, 'id' | 'timestamp'>[];
  loading: boolean;
  isStreaming: boolean;
}

export default function MessageList({ messages, loading, isStreaming }: MessageListProps) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const { showTimestamp } = useAppSelector(selectMessageDisplayPreferences);

  const scrollToBottom = useCallback(() => {
    debugLog('MessageList', 'Scrolling to bottom');
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    debugLog('MessageList', 'Messages updated:', messages);
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleRetry = useCallback((index: number) => {
    debugLog('MessageList', 'Retrying message at index:', index);
    dispatch(retryMessage(String(index)));
  }, [dispatch]);

  if (loading) {
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
        <Typography variant="body1">Loading messages...</Typography>
      </Box>
    );
  }

  if (messages.length === 0) {
    debugLog('MessageList', 'Rendering empty state');
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
        <Typography variant="body1">No messages</Typography>
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
      {messages.map((message, index) => (
        <Box
          key={index}
          data-testid="message-container"
          data-role={message.role}
          sx={{
            position: 'relative',
            maxWidth: '85%',
            alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
          }}
          onMouseEnter={() => setHoveredMessageId(String(index))}
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
            {isStreaming && index === messages.length - 1 && (
              <Box data-testid="streaming-indicator" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Typing...
                </Typography>
              </Box>
            )}
            <MessageActions
              message={message}
              visible={hoveredMessageId === String(index)}
              onRetry={() => handleRetry(index)}
            />
          </Paper>
        </Box>
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
}
