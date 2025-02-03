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
import { useAppSelector } from '../../lib/store/hooks';
import { selectMessageDisplayPreferences } from '../../lib/store/selectors';

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  disabled: boolean;
}

export default function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const { enterToSend } = useAppSelector(selectMessageDisplayPreferences);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    try {
      await onSendMessage(trimmedMessage);
      setMessage('');
    } catch (error) {
      // Keep message in input field if send fails
      console.error('Failed to send message:', error);
    }
  }, [message, disabled, onSendMessage]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (enterToSend && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      } else if (!enterToSend && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSend();
      }
    }
  }, [enterToSend, handleSend]);

  return (
    <Box
      data-testid="message-input"
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
          placeholder={enterToSend ? "Type a message... (Shift + Enter for new line)" : "Type a message... (Ctrl + Enter to send)"}
          disabled={disabled}
          InputProps={{
            inputProps: {
              'aria-label': 'message input',
              'data-testid': 'message-input-field'
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          aria-label="send"
          data-testid="send-button"
          sx={{ alignSelf: 'flex-end' }}
        >
          {disabled ? (
            <CircularProgress size={24} data-testid="loading-indicator" />
          ) : (
            <SendIcon data-testid="send-icon" />
          )}
        </IconButton>
      </Box>
    </Box>
  );
}
