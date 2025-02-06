import { RootState } from './store';
import type { ChatSession } from './slices/chatSlice';

// Settings selectors
export const selectModelPreferences = (state: RootState) =>
  state.settings.modelPreferences;

export const selectMessageDisplayPreferences = (state: RootState) =>
  state.settings.messageDisplayPreferences;

export const selectApiKeys = (state: RootState) =>
  state.settings.apiKeys;

export const selectButtonColor = (state: RootState) =>
  state.settings.messageDisplayPreferences.buttonColor;

export const selectTheme = (state: RootState) =>
  state.settings.messageDisplayPreferences.darkMode ? 'dark' : 'light';

// Chat selectors
export const selectCurrentSession = (state: RootState) => {
  const { sessions, currentSessionId } = state.chat;
  return sessions.find((session: ChatSession) => session.id === currentSessionId) || null;
};

export const selectAllSessions = (state: RootState) => state.chat.sessions;

export const selectIsStreaming = (state: RootState) => state.chat.isStreaming;

export const selectChatError = (state: RootState) => state.chat.error;

export const selectCurrentSessionMessages = (state: RootState) => {
  const currentSession = selectCurrentSession(state);
  return currentSession?.messages || [];
};
