'use client';

import { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Download as ExportIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { selectCurrentSession } from '@/lib/store/selectors';
import { clearSession, deleteSession } from '@/lib/store/slices/chatSlice';
import { useNotification } from '../providers/NotificationProvider';

export default function SessionHeader() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentSession = useAppSelector(selectCurrentSession);
  const { showNotification } = useNotification();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleClearSession = () => {
    if (currentSession) {
      dispatch(clearSession(currentSession.id));
      showNotification('Chat history cleared', 'success');
    }
    handleMenuClose();
  };

  const handleDeleteSession = () => {
    if (currentSession) {
      dispatch(deleteSession(currentSession.id));
      showNotification('Chat deleted', 'success');
    }
    handleMenuClose();
  };

  const handleExportSession = () => {
    if (currentSession) {
      const exportData = {
        ...currentSession,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSession.name.toLowerCase().replace(/\s+/g, '-')}-${
        currentSession.id
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('Chat exported successfully', 'success');
    }
    handleMenuClose();
  };

  if (!currentSession) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 500 }}>
        {currentSession.name}
      </Typography>
      <IconButton onClick={handleMenuOpen}>
        <MoreIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleClearSession}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear history</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportSession}>
          <ListItemIcon>
            <ExportIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export chat</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteSession}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: theme.palette.error.main }}>
            Delete chat
          </ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
