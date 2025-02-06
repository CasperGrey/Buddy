import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const BUTTON_COLORS = {
  LIGHT_MODE_DEFAULT: '#204B87',
  DARK_MODE_DEFAULT: '#2383C5',
} as const;

export interface ApiKeys {
  anthropicKey: string;
  deepseekKey: string;
  openAIKey: string;
}

export const OPENAI_MODELS = [
  'gpt-4-turbo-preview', // Latest GPT-4 Turbo
  'gpt-4-0125-preview',  // Previous GPT-4 Turbo
  'gpt-4',               // Base GPT-4
  'gpt-3.5-turbo',       // Base GPT-3.5 Turbo
  'gpt-3.5-turbo-0125'   // Latest GPT-3.5 Turbo
] as const;
export type OpenAIModel = typeof OPENAI_MODELS[number];

export interface ModelPreferences {
  defaultModel: string;
  openAIModel: OpenAIModel;
  temperature: number;
  systemPrompt: string;
}

export interface MessageDisplayPreferences {
  showTimestamp: boolean;
  darkMode: boolean;
  enterToSend: boolean;
  buttonColor: string;
}

interface SettingsState {
  apiKeys: ApiKeys;
  modelPreferences: ModelPreferences;
  messageDisplayPreferences: MessageDisplayPreferences;
}

const initialState: SettingsState = {
  apiKeys: {
    anthropicKey: '',
    deepseekKey: '',
    openAIKey: '',
  },
  modelPreferences: {
    defaultModel: 'deepseek-chat-7b',
    openAIModel: 'gpt-4',
    temperature: 0.7,
    systemPrompt: 'You are DeepSeek, a helpful AI assistant.',
  },
  messageDisplayPreferences: {
    showTimestamp: true,
    darkMode: false,
    enterToSend: true,
    buttonColor: BUTTON_COLORS.LIGHT_MODE_DEFAULT,
  }
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (
      state,
      action: PayloadAction<Partial<ModelPreferences & MessageDisplayPreferences & ApiKeys>>
    ) => {
      const { defaultModel, openAIModel, temperature, systemPrompt, showTimestamp, darkMode, enterToSend, buttonColor, anthropicKey, deepseekKey, openAIKey } =
        action.payload;

      if (defaultModel !== undefined) {
        state.modelPreferences.defaultModel = defaultModel;
      }
      if (openAIModel !== undefined && OPENAI_MODELS.includes(openAIModel as OpenAIModel)) {
        state.modelPreferences.openAIModel = openAIModel as OpenAIModel;
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
      }
      if (enterToSend !== undefined) {
        state.messageDisplayPreferences.enterToSend = enterToSend;
      }
      if (buttonColor !== undefined) {
        state.messageDisplayPreferences.buttonColor = buttonColor;
      }
      if (anthropicKey !== undefined) {
        state.apiKeys.anthropicKey = anthropicKey;
      }
      if (deepseekKey !== undefined) {
        state.apiKeys.deepseekKey = deepseekKey;
      }
      if (openAIKey !== undefined) {
        state.apiKeys.openAIKey = openAIKey;
      }
    },
  },
});

export const { updateSettings } = settingsSlice.actions;

export default settingsSlice.reducer;
