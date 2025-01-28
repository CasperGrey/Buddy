import { configureStore, combineReducers } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import settingsReducer from './slices/settingsSlice';

const rootReducer = combineReducers({
  chat: chatReducer,
  settings: settingsReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
