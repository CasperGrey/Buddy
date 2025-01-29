declare module 'redux-persist-transform-encrypt' {
  import { Transform } from 'redux-persist';

  interface EncryptConfig {
    secretKey: string;
    onError?: (error: Error) => void;
  }

  export function encryptTransform(config: EncryptConfig): Transform;
}
