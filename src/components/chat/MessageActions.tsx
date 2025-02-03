import { IconButton, Box, Tooltip } from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Refresh as RetryIcon,
} from '@mui/icons-material';
import { useCallback } from 'react';
import { useNotification } from '../providers/NotificationProvider';
import { Message } from '../../lib/store/slices/chatSlice';

interface MessageActionsProps {
  message: Omit<Message, 'id' | 'timestamp'>;
  visible: boolean;
  onRetry?: () => void;
}

export default function MessageActions({ 
  message, 
  visible, 
  onRetry 
}: MessageActionsProps) {
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
    if (message.role === 'assistant' && onRetry) {
      onRetry();
    }
  }, [message.role, onRetry]);

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
      {isAssistantMessage && onRetry && (
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
