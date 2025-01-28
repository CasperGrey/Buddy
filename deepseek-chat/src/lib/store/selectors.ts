import { RootState } from './store';

export const selectMessageDisplayPreferences = (state: RootState) => state.settings.messageDisplayPreferences;
export const selectTheme = (state: RootState) => state.settings.theme;
export const selectCurrentSession = (state: RootState) => {
  const currentSessionId = state.chat.currentSessionId;
  return state.chat.sessions.find(s => s.id === currentSessionId);
};
export const selectSessions = (state: RootState) => state.chat.sessions;
export const selectCurrentSessionId = (state: RootState) => state.chat.currentSessionId;
