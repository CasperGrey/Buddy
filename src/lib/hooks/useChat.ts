import { useCallback, useEffect, useRef } from 'react';
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
import { selectModelPreferences } from '../store/selectors';

export function useChat() {
  const dispatch = useAppDispatch();
  const modelPrefs = useAppSelector(selectModelPreferences);
  const currentSession = useAppSelector(selectCurrentSession);
  const subscriptionCleanup = useRef<(() => void) | null>(null);

  // Set up subscription for real-time messages
  useEffect(() => {
    if (currentSession?.id) {
      debugLog('useChat', 'Setting up message subscription for session:', currentSession.id);
      
      chatService.subscribeToMessages(currentSession.id, (message: Message) => {
        debugLog('useChat', 'Received real-time message:', message);
        dispatch(addMessage(message));
      }).then(cleanup => {
        subscriptionCleanup.current = cleanup;
      }).catch(error => {
        debugLog('useChat', 'Error setting up subscription:', error);
        dispatch(setError('Failed to set up real-time updates'));
      });

      return () => {
        if (subscriptionCleanup.current) {
          debugLog('useChat', 'Cleaning up message subscription');
          subscriptionCleanup.current();
          subscriptionCleanup.current = null;
        }
      };
    }
  }, [dispatch, currentSession?.id]);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        const model = modelPrefs.defaultModel;
        debugLog('useChat', 'Sending message with model:', model);
        debugLog('useChat', 'Current session:', currentSession);

        if (!currentSession) {
          throw new Error('No active chat session');
        }

        // Add user message immediately
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

        // Send message through GraphQL
        const response = await chatService.sendMessage(
          messages,
          model,
          modelPrefs.systemPrompt
        );

        debugLog('useChat', 'Message sent successfully:', response);

        // The assistant's response will come through the subscription
      } catch (error) {
        debugLog('useChat', 'Error sending message:', error);
        console.error('Error sending message:', error);
        dispatch(setError((error as Error).message));
        dispatch(setStreaming(false));
      }
    },
    [dispatch, modelPrefs, currentSession]
  );

  return {
    sendMessage,
  };
}
