'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { addMessage, setStreaming, setError } from '@/lib/store/slices/chatSlice';

export default function MessageInput() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [message, setMessage] = useState('');
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = useAppSelector((state) => state.chat.isStreaming);
  const currentSessionId = useAppSelector((state) => state.chat.currentSessionId);

  const handleSend = useCallback(async () => {
    if (!message.trim() || !currentSessionId) return;

    try {
      dispatch(setStreaming(true));
      dispatch(
        addMessage({
          content: message.trim(),
          role: 'user',
        })
      );

      // TODO: Implement API call to DeepseekAI
      // For now, just add a mock response
      setTimeout(() => {
        dispatch(
          addMessage({
            content: 'This is a mock response. API integration coming soon!',
            role: 'assistant',
          })
        );
        dispatch(setStreaming(false));
      }, 1000);

      setMessage('');
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'An error occurred'));
      dispatch(setStreaming(false));
    }
  }, [message, currentSessionId, dispatch]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          inputRef={textFieldRef}
          fullWidth
          multiline
          maxRows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Ctrl + Enter to send)"
          disabled={isStreaming || !currentSessionId}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!message.trim() || isStreaming || !currentSessionId}
          sx={{ alignSelf: 'flex-end' }}
        >
          {isStreaming ? (
            <CircularProgress size={24} />
          ) : (
            <SendIcon />
          )}
        </IconButton>
      </Box>
    </Box>
  );
}
