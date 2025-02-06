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
  TextField,
  Input,
  IconButton,
  Tooltip,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useAppDispatch, useAppSelector } from '../../lib/store/hooks';
import type { ModelPreferences, MessageDisplayPreferences, ApiKeys } from '../../lib/store/slices/settingsSlice';
import { BUTTON_COLORS } from '../../lib/store/slices/settingsSlice';
import { updateSettings } from '../../lib/store/slices/settingsSlice';
import { selectMessageDisplayPreferences, selectModelPreferences, selectApiKeys } from '../../lib/store/selectors';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const MODELS = [
  // Anthropic Models
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  
  // OpenAI Models
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo (Latest)' },
  { id: 'gpt-4-0125-preview', name: 'GPT-4 Turbo (Previous)' },
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'gpt-3.5-turbo-0125', name: 'GPT-3.5 Turbo (Latest)' },
  
  // Deepseek Models
  { id: 'deepseek-chat-7b', name: 'DeepSeek Chat 7B' },
  { id: 'deepseek-chat-67b', name: 'DeepSeek Chat 67B' },
  { id: 'deepseek-coder-6.7b', name: 'DeepSeek Coder 6.7B' },
  { id: 'deepseek-coder-33b', name: 'DeepSeek Coder 33B' },
];

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const dispatch = useAppDispatch();
  const messagePrefs = useAppSelector(selectMessageDisplayPreferences);
  const modelPrefs = useAppSelector(selectModelPreferences);
  const apiKeys = useAppSelector(selectApiKeys);

  const [localSettings, setLocalSettings] = useState<
    ModelPreferences & MessageDisplayPreferences & ApiKeys
  >({
    defaultModel: modelPrefs.defaultModel,
    openAIModel: modelPrefs.openAIModel,
    temperature: modelPrefs.temperature,
    systemPrompt: modelPrefs.systemPrompt,
    showTimestamp: messagePrefs.showTimestamp,
    darkMode: messagePrefs.darkMode,
    enterToSend: messagePrefs.enterToSend,
    buttonColor: messagePrefs.buttonColor,
    anthropicKey: apiKeys.anthropicKey,
    deepseekKey: apiKeys.deepseekKey,
    openAIKey: apiKeys.openAIKey,
  });

  const handleSave = () => {
    dispatch(updateSettings(localSettings));
    onClose();
  };

  const handleChange = (
    key: keyof (ModelPreferences & MessageDisplayPreferences & ApiKeys),
    value: string | number | boolean
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            API Keys
          </Typography>
          <form>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <TextField
                label="Anthropic API Key"
                value={localSettings.anthropicKey}
                onChange={(e) => handleChange('anthropicKey', e.target.value)}
                placeholder="Enter your Anthropic API key"
                variant="outlined"
                fullWidth
                inputProps={{
                  spellCheck: false,
                  autoComplete: 'off',
                  autoCorrect: 'off'
                }}
              />
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <TextField
                label="Deepseek API Key"
                value={localSettings.deepseekKey}
                onChange={(e) => handleChange('deepseekKey', e.target.value)}
                placeholder="Enter your Deepseek API key"
                variant="outlined"
                fullWidth
                inputProps={{
                  spellCheck: false,
                  autoComplete: 'off',
                  autoCorrect: 'off'
                }}
              />
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <TextField
                label="OpenAI API Key"
                value={localSettings.openAIKey}
                onChange={(e) => handleChange('openAIKey', e.target.value)}
                placeholder="Enter your OpenAI API key"
                variant="outlined"
                fullWidth
                inputProps={{
                  spellCheck: false,
                  autoComplete: 'off',
                  autoCorrect: 'off'
                }}
              />
            </FormControl>
          </form>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Model Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The Default Model selection includes all available models. The separate OpenAI Model dropdown allows you to specify which OpenAI model to use when an OpenAI model is selected as the default.
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
            <InputLabel>OpenAI Model</InputLabel>
            <Select
              value={localSettings.openAIModel}
              label="OpenAI Model"
              onChange={(e) => handleChange('openAIModel', e.target.value)}
            >
              <MenuItem value="gpt-4-turbo-preview">GPT-4 Turbo (Latest)</MenuItem>
              <MenuItem value="gpt-4-0125-preview">GPT-4 Turbo (Previous)</MenuItem>
              <MenuItem value="gpt-4">GPT-4</MenuItem>
              <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
              <MenuItem value="gpt-3.5-turbo-0125">GPT-3.5 Turbo (Latest)</MenuItem>
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

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Display Preferences
          </Typography>
          <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
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
            <ListItem>
              <ListItemText
                primary="Enter to Send"
                secondary="Press Enter to send messages (Ctrl+Enter for new line)"
              />
              <Switch
                edge="end"
                checked={localSettings.enterToSend}
                onChange={(e) => handleChange('enterToSend', e.target.checked)}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Button Color"
                secondary="Customize the color of buttons"
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Reset to default color">
                  <IconButton 
                    onClick={() => handleChange(
                      'buttonColor',
                      localSettings.darkMode ? BUTTON_COLORS.DARK_MODE_DEFAULT : BUTTON_COLORS.LIGHT_MODE_DEFAULT
                    )}
                    size="small"
                  >
                    <RestartAltIcon />
                  </IconButton>
                </Tooltip>
                <Input
                  type="color"
                  value={localSettings.buttonColor}
                  onChange={(e) => handleChange('buttonColor', e.target.value)}
                  sx={{ width: 60 }}
                />
              </Box>
            </ListItem>
          </List>
        </Box>
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
