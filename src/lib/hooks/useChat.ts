import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addMessage,
  setError,
  setStreaming,
  Message,
} from '../store/slices/chatSlice';
import { debugLog } from '../utils/debug';
import { selectCurrentSession } from '../store/selectors';
import { chatService } from '../services/chatService';
import { selectModelPreferences, selectApiKeys } from '../store/selectors';

export function useChat() {
  const dispatch = useAppDispatch();
  const modelPrefs = useAppSelector(selectModelPreferences);
  const apiKeys = useAppSelector(selectApiKeys);
  const currentSession = useAppSelector(selectCurrentSession);

  // Initialize clients whenever API keys or model preferences change
  useEffect(() => {
    chatService.initializeClients({
      settings: {
        apiKeys: {
          anthropicKey: apiKeys.anthropicKey,
          deepseekKey: apiKeys.deepseekKey,
          openAIKey: apiKeys.openAIKey
        }
      }
    } as any);
  }, [apiKeys, modelPrefs]);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        const model = modelPrefs.defaultModel;
        const requiredKey = chatService.getRequiredApiKey(model);
        const apiKey = apiKeys[requiredKey];

        debugLog('useChat', 'Sending message with model:', model);
        debugLog('useChat', 'Current session:', currentSession);

        if (!apiKey) {
          throw new Error(`Please provide a valid ${requiredKey === 'anthropicKey' ? 'Anthropic' : 'Deepseek'} API key in settings`);
        }

        if (!currentSession) {
          throw new Error('No active chat session');
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

        // Get full conversation history
        const messages = currentSession.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        messages.push({ role: 'user', content });

        debugLog('useChat', 'Sending messages with context:', messages);

        // Send message to the selected model
        const response = await chatService.sendMessage(
          messages,
          model,
          modelPrefs.systemPrompt
        );

        debugLog('useChat', 'Received response:', response);

        // Add assistant's response
        dispatch(
          addMessage({
            content: response.content,
            role: 'assistant',
          })
        );
      } catch (error) {
        debugLog('useChat', 'Error sending message:', error);
        console.error('Error sending message:', error);
        dispatch(setError((error as Error).message));
      } finally {
        dispatch(setStreaming(false));
      }
    },
    [dispatch, modelPrefs, apiKeys, currentSession]
  );

  return {
    sendMessage,
  };
}
