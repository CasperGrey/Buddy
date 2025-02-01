

import { IconButton, Box, Tooltip } from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Refresh as RetryIcon,
} from '@mui/icons-material';
import { useCallback } from 'react';
import { useAppDispatch } from '../../lib/store/hooks';
import { Message, retryMessage } from '../../lib/store/slices/chatSlice';
import { useNotification } from '../providers/NotificationProvider';

interface MessageActionsProps {
  message: Message;
  visible: boolean;
}

export default function MessageActions({ message, visible }: MessageActionsProps) {
  const dispatch = useAppDispatch();
  const { showNotification } = useNotification();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      showNotification('Message copied to clipboard', 'success');
    } catch (error) {
      showNotification('Failed to copy message', 'error');
    }
  }, [message.content, showNotification]);

  const handleRetry = useCallback(() => {
    if (message.role === 'assistant') {
      dispatch(retryMessage(message.id));
    }
  }, [dispatch, message.id, message.role]);

  if (!visible) {
    return null;
  }

  const isAssistantMessage = message.role === 'assistant';

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        gap: 0.5,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s',
      }}
    >
      <Tooltip title="Copy message">
        <IconButton
          size="small"
          onClick={handleCopy}
          aria-label="Copy message"
          sx={{ color: 'text.secondary' }}
        >
          <CopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {isAssistantMessage && (
        <Tooltip title="Retry response">
          <IconButton
            size="small"
            onClick={handleRetry}
            aria-label="Retry response"
            sx={{ color: 'text.secondary' }}
          >
            <RetryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
