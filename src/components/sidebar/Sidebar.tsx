

import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import SettingsDialog from '../settings/SettingsDialog';
import { useAppDispatch, useAppSelector } from '../../lib/store/hooks';
import { ChatSession, createSession, deleteSession, setCurrentSession } from '../../lib/store/slices/chatSlice';
import { RootState } from '../../lib/store/store';

const DRAWER_WIDTH = 280;

export default function Sidebar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const dispatch = useAppDispatch();
  const sessions = useAppSelector((state: RootState) => state.chat.sessions);
  const currentSessionId = useAppSelector((state: RootState) => state.chat.currentSessionId);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNewChat = () => {
    dispatch(createSession({ name: 'New Chat' }));
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    dispatch(setCurrentSession(sessionId));
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleDeleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(deleteSession(sessionId));
  };

  const drawerContent = (
    <>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div">
          Buddy Chat
        </Typography>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle}>
            <MenuIcon />
          </IconButton>
        )}
      </Box>
      <Box sx={{ px: 2, pb: 2 }}>
        <ListItemButton
          onClick={handleNewChat}
          sx={{
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText primary="New Chat" />
        </ListItemButton>
      </Box>
      <Divider />
      <List sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
        {sessions.map((session: ChatSession) => (
          <ListItem
            key={session.id}
            disablePadding
            secondaryAction={
              sessions.length > 1 && (
                <IconButton
                  edge="end"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  sx={{ opacity: 0.7 }}
                >
                  <DeleteIcon />
                </IconButton>
              )
            }
          >
            <ListItemButton
              selected={session.id === currentSessionId}
              onClick={() => handleSelectSession(session.id)}
              sx={{ borderRadius: 1 }}
            >
              <ListItemIcon>
                <ChatIcon />
              </ListItemIcon>
              <ListItemText
                primary={session.name}
                primaryTypographyProps={{
                  noWrap: true,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => setSettingsOpen(true)}
            sx={{ borderRadius: 1, mx: 1 }}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );

  return (
    <>
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ position: 'absolute', top: 8, left: 8 }}
        >
          <MenuIcon />
        </IconButton>
      )}
      <Box
        component="nav"
        sx={{
          width: { md: DRAWER_WIDTH },
          flexShrink: { md: 0 },
        }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
              },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                borderRight: `1px solid ${theme.palette.divider}`,
              },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>
    </>
  );
}
