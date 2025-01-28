import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addMessage,
  setError,
  setStreaming,
  Message,
} from '../store/slices/chatSlice';
import { chatService } from '../services/chatService';
import { selectModelPreferences, selectApiKeys } from '../store/selectors';

export function useChat() {
  const dispatch = useAppDispatch();
  const modelPrefs = useAppSelector(selectModelPreferences);
  const apiKeys = useAppSelector(selectApiKeys);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        const model = modelPrefs.defaultModel;
        const requiredKey = chatService.getRequiredApiKey(model);
        const apiKey = apiKeys[requiredKey];

        if (!apiKey) {
          throw new Error(`Please provide a valid ${requiredKey === 'anthropicKey' ? 'Anthropic' : 'Deepseek'} API key in settings`);
        }

        // Add user message
        dispatch(
          addMessage({
            content,
            role: 'user',
          })
        );

        // Set streaming state
        dispatch(setStreaming(true));
        dispatch(setError(null));

        // Initialize clients with current API keys
        await chatService.initializeClients({ settings: { apiKeys } } as any);

        // Get all messages for context
        const messages = [{ role: 'user', content }];

        // Send message to the selected model
        const response = await chatService.sendMessage(
          messages,
          model,
          modelPrefs.systemPrompt
        );

        // Add assistant's response
        dispatch(
          addMessage({
            content: response.content,
            role: 'assistant',
          })
        );
      } catch (error) {
        console.error('Error sending message:', error);
        dispatch(setError((error as Error).message));
      } finally {
        dispatch(setStreaming(false));
      }
    },
    [dispatch, modelPrefs, apiKeys]
  );

  return {
    sendMessage,
  };
}
