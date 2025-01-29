import { useState } from 'react';
import {
  Avatar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { AccountCircle, Login, Logout } from '@mui/icons-material';
import { useAuth } from '../../lib/hooks/useAuth';
import { useAppSelector } from '../../lib/store/hooks';

export default function UserMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { login, logout, isLoading } = useAuth();
  const profile = useAppSelector((state) => state.user.profile);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const handleLogin = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    login();
  };

  if (isLoading) {
    return <CircularProgress size={24} />;
  }

  if (!profile) {
    return (
      <Button
        startIcon={<Login />}
        onClick={handleLogin}
        color="inherit"
        size="small"
      >
        Login
      </Button>
    );
  }

  return (
    <Box>
      <IconButton
        size="large"
        onClick={handleMenu}
        color="inherit"
      >
        {profile.picture ? (
          <Avatar
            src={profile.picture}
            alt={profile.name}
            sx={{ width: 32, height: 32 }}
          />
        ) : (
          <AccountCircle />
        )}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleClose} disabled>
          <Typography variant="body2">{profile.email}</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} fontSize="small" />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
