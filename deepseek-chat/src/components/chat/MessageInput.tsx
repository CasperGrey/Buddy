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
import { useAppDispatch, useAppSelector } from '../../lib/store/hooks';
import { useChat } from '../../lib/hooks/useChat';
import { RootState } from '../../lib/store/store';

export default function MessageInput() {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = useAppSelector((state: RootState) => state.chat.isStreaming);
  const currentSessionId = useAppSelector((state: RootState) => state.chat.currentSessionId);
  const enterToSend = useAppSelector((state: RootState) => state.settings.messageDisplayPreferences.enterToSend);
  const { sendMessage } = useChat();

  const handleSend = useCallback(async () => {
    if (!message.trim() || !currentSessionId) return;

    const trimmedMessage = message.trim();
    setMessage('');
    await sendMessage(trimmedMessage);
  }, [message, currentSessionId, sendMessage]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (enterToSend && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      } else if (!enterToSend && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSend();
      }
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
          placeholder={enterToSend ? "Type a message... (Shift + Enter for new line)" : "Type a message... (Ctrl + Enter to send)"}
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
