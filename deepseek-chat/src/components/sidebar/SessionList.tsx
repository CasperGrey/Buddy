'use client';

import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import { Message as MessageIcon } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { setCurrentSession } from '@/lib/store/slices/chatSlice';

export default function SessionList() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const sessions = useAppSelector((state) => state.chat.sessions);
  const currentSessionId = useAppSelector((state) => state.chat.currentSessionId);

  const handleSessionClick = (sessionId: string) => {
    dispatch(setCurrentSession(sessionId));
  };

  if (sessions.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 3,
          color: 'text.secondary',
          textAlign: 'center',
        }}
      >
        <MessageIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="body1" sx={{ mb: 1 }}>
          No chats yet
        </Typography>
        <Typography variant="body2">
          Create a new chat to get started
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ px: 1 }}>
      {sessions.map((session) => (
        <ListItem
          key={session.id}
          disablePadding
          secondaryAction={
            <IconButton edge="end" sx={{ visibility: 'hidden' }}>
              <MessageIcon />
            </IconButton>
          }
          sx={{
            mb: 0.5,
            '&:hover .MuiIconButton-root': {
              visibility: 'visible',
            },
          }}
        >
          <ListItemButton
            selected={session.id === currentSessionId}
            onClick={() => handleSessionClick(session.id)}
            sx={{
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: theme.palette.action.selected,
              },
            }}
          >
            <ListItemText
              primary={session.name}
              secondary={new Date(session.updatedAt).toLocaleDateString()}
              primaryTypographyProps={{
                noWrap: true,
                sx: { fontWeight: session.id === currentSessionId ? 500 : 400 },
              }}
              secondaryTypographyProps={{
                noWrap: true,
                sx: { fontSize: '0.75rem' },
              }}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
