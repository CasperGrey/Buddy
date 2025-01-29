import { useState, useCallback } from 'react';
import { debugLog } from '../../lib/utils/debug';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../lib/store/hooks';
import { createSession, ChatSession } from '../../lib/store/slices/chatSlice';
import { useNotification } from '../providers/NotificationProvider';

export default function NewChatButton() {
  const dispatch = useAppDispatch();
  const { showNotification } = useNotification();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setName('');
  };

  const handleCreate = useCallback(() => {
    if (name.trim()) {
      debugLog('NewChatButton', 'Creating new session with name:', name.trim());
      
      // Create session and get the action result
      const result = dispatch(createSession({ name: name.trim() }));
      
      // Get the created session from the action payload
      const newSession = result.payload as ChatSession;
      debugLog('NewChatButton', 'Created session:', newSession);
      
      // Update URL and trigger navigation event
      window.history.pushState({}, '', `/${newSession.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      showNotification('New chat created', 'success');
      handleClose();
    }
  }, [dispatch, name, showNotification]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleCreate();
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button
        variant="contained"
        fullWidth
        startIcon={<AddIcon />}
        onClick={handleOpen}
        sx={{
          justifyContent: 'flex-start',
          textAlign: 'left',
          px: 2,
          py: 1,
        }}
      >
        New Chat
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chat Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!name.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
