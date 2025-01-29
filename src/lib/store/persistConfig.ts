import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { encryptTransform } from 'redux-persist-transform-encrypt';

const encryptor = encryptTransform({
  secretKey: process.env.REACT_APP_STORAGE_KEY || 'default-secret-key',
  onError: (error: Error) => {
    console.error('Encryption Error:', error);
  },
});

export const persistConfig = {
  key: 'root',
  storage,
  transforms: [encryptor],
  whitelist: ['settings', 'chat'], // Persist both settings and chat sessions
};
