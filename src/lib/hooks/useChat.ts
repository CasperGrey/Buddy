import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addMessage,
  setError,
  setStreaming,
} from '../store/slices/chatSlice';
import { debugLog } from '../utils/debug';
import { selectCurrentSession } from '../store/selectors';
import { chatService } from '../services/chatService';
import { selectModelPreferences } from '../store/selectors';

interface WebSocketResponse {
  type: string;
  content: string;
  error?: string;
}

export function useChat() {
  const dispatch = useAppDispatch();
  const modelPrefs = useAppSelector(selectModelPreferences);
  const currentSession = useAppSelector(selectCurrentSession);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        const model = modelPrefs.defaultModel;
        debugLog('useChat', 'Sending message with model:', model);
        debugLog('useChat', 'Current session:', currentSession);

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

        // Send message through WebSocket
        const response = await chatService.sendMessage(
          messages,
          model,
          modelPrefs.systemPrompt
        ) as WebSocketResponse;

        debugLog('useChat', 'Received response:', response);

        if (response.type === 'ERROR') {
          throw new Error(response.error || 'Unknown error occurred');
        }

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
    [dispatch, modelPrefs, currentSession]
  );

  return {
    sendMessage,
  };
}
