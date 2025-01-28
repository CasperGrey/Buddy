.import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

export interface ModelPreferences {
  defaultModel: string;
  temperature: number;
  systemPrompt: string;
}

export interface MessageDisplayPreferences {
  showTimestamp: boolean;
  darkMode: boolean;
}

interface SettingsState {
  modelPreferences: ModelPreferences;
  messageDisplayPreferences: MessageDisplayPreferences;
  theme: 'light' | 'dark';
}

const initialState: SettingsState = {
  modelPreferences: {
    defaultModel: 'deepseek-chat-7b',
    temperature: 0.7,
    systemPrompt: 'You are DeepSeek, a helpful AI assistant.',
  },
  messageDisplayPreferences: {
    showTimestamp: true,
    darkMode: false,
  },
  theme: 'light',
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (
      state,
      action: PayloadAction<Partial<ModelPreferences & MessageDisplayPreferences>>
    ) => {
      const { defaultModel, temperature, systemPrompt, showTimestamp, darkMode } =
        action.payload;

      if (defaultModel !== undefined) {
        state.modelPreferences.defaultModel = defaultModel;
      }
      if (temperature !== undefined) {
        state.modelPreferences.temperature = temperature;
      }
      if (systemPrompt !== undefined) {
        state.modelPreferences.systemPrompt = systemPrompt;
      }
      if (showTimestamp !== undefined) {
        state.messageDisplayPreferences.showTimestamp = showTimestamp;
      }
      if (darkMode !== undefined) {
        state.messageDisplayPreferences.darkMode = darkMode;
        state.theme = darkMode ? 'dark' : 'light';
      }
    },
  },
});

// Selectors
export const selectModelPreferences = (state: RootState) =>
  state.settings.modelPreferences;

export const selectMessageDisplayPreferences = (state: RootState) =>
  state.settings.messageDisplayPreferences;

export const { updateSettings } = settingsSlice.actions;

export default settingsSlice.reducer;
