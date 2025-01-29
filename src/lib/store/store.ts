import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import chatReducer from './slices/chatSlice';
import settingsReducer from './slices/settingsSlice';
import userReducer from './slices/userSlice';
import { persistConfig } from './persistConfig';

const rootReducer = combineReducers({
  chat: chatReducer,
  settings: settingsReducer,
  user: userReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => {
    const middlewares = getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    });

    if (process.env.NODE_ENV === 'development') {
      // Using dynamic import for redux-logger to avoid issues with SSR
      import('redux-logger').then((module) => {
        const logger = module.createLogger({ collapsed: true });
        middlewares.push(logger);
      });
    }

    return middlewares;
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
