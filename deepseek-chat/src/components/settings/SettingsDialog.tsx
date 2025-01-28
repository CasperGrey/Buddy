'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import type { ModelPreferences, MessageDisplayPreferences } from '@/lib/store/slices/settingsSlice';
import {
  updateSettings,
  selectMessageDisplayPreferences,
  selectModelPreferences,
} from '@/lib/store/slices/settingsSlice';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const MODELS = [
  { id: 'deepseek-chat-7b', name: 'DeepSeek Chat 7B' },
  { id: 'deepseek-chat-67b', name: 'DeepSeek Chat 67B' },
  { id: 'deepseek-coder-6.7b', name: 'DeepSeek Coder 6.7B' },
  { id: 'deepseek-coder-33b', name: 'DeepSeek Coder 33B' },
];

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const dispatch = useAppDispatch();
  const messagePrefs = useAppSelector(selectMessageDisplayPreferences);
  const modelPrefs = useAppSelector(selectModelPreferences);

  const [localSettings, setLocalSettings] = useState<
    ModelPreferences & MessageDisplayPreferences
  >({
    defaultModel: modelPrefs.defaultModel,
    temperature: modelPrefs.temperature,
    systemPrompt: modelPrefs.systemPrompt,
    showTimestamp: messagePrefs.showTimestamp,
    darkMode: messagePrefs.darkMode,
  });

  const handleSave = () => {
    dispatch(updateSettings(localSettings));
    onClose();
  };

  const handleChange = (
    key: keyof (ModelPreferences & MessageDisplayPreferences),
    value: string | number | boolean
  ) => {
    setLocalSettings((prev: ModelPreferences & MessageDisplayPreferences) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Model Preferences
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Default Model</InputLabel>
            <Select
              value={localSettings.defaultModel}
              label="Default Model"
              onChange={(e) => handleChange('defaultModel', e.target.value)}
            >
              {MODELS.map((model) => (
                <MenuItem key={model.id} value={model.id}>
                  {model.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Temperature</InputLabel>
            <Select
              value={localSettings.temperature}
              label="Temperature"
              onChange={(e) => handleChange('temperature', e.target.value)}
            >
              <MenuItem value={0}>0 - Deterministic</MenuItem>
              <MenuItem value={0.3}>0.3 - Focused</MenuItem>
              <MenuItem value={0.7}>0.7 - Balanced</MenuItem>
              <MenuItem value={1}>1.0 - Creative</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Display Preferences
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Show Timestamps"
              secondary="Display message timestamps in chat"
            />
            <Switch
              edge="end"
              checked={localSettings.showTimestamp}
              onChange={(e) => handleChange('showTimestamp', e.target.checked)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Dark Mode"
              secondary="Use dark color theme"
            />
            <Switch
              edge="end"
              checked={localSettings.darkMode}
              onChange={(e) => handleChange('darkMode', e.target.checked)}
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
