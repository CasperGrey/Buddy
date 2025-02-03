import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { 
  useGetMessagesQuery,
  useSendMessageMutation,
  useStartConversationMutation,
  useOnMessageReceivedSubscription,
  useOnErrorSubscription
} from '../../generated/graphql';
import { addMessage, setError, setStreaming, Message } from '../store/slices/chatSlice';
import { debugLog } from '../utils/debug';

// Helper to convert GraphQL message to Redux message type
const convertMessage = (message: {
  id: string;
  content: string;
  role: string;
  timestamp: string;
  conversationId: string;
}): Omit<Message, 'id' | 'timestamp'> => ({
  content: message.content,
  role: message.role as 'user' | 'assistant'
});

export function useGraphQLChat(conversationId?: string) {
  const dispatch = useDispatch();

  // Query for messages
  const { data: messagesData, loading } = useGetMessagesQuery({
    variables: { conversationId: conversationId! },
    skip: !conversationId,
    fetchPolicy: 'cache-and-network'
  });

  // Mutations
  const [sendMessageMutation] = useSendMessageMutation();
  const [startConversationMutation] = useStartConversationMutation();

  // Message Subscription
  const { data: messageData } = useOnMessageReceivedSubscription({
    variables: { conversationId: conversationId! },
    skip: !conversationId
  });

  // Error Subscription
  const { data: errorData } = useOnErrorSubscription();

  // Handle incoming messages from subscription
  useEffect(() => {
    if (messageData?.messageReceived) {
      const message = messageData.messageReceived;
      debugLog('useGraphQLChat', 'Received message from subscription:', message);
      dispatch(addMessage(convertMessage(message)));
      dispatch(setStreaming(false));
    }
  }, [messageData, dispatch]);

  // Handle errors from subscription
  useEffect(() => {
    if (errorData?.onError) {
      const error = errorData.onError;
      debugLog('useGraphQLChat', 'Received error from subscription:', error);
      dispatch(setError(error.message));
      dispatch(setStreaming(false));
    }
  }, [errorData, dispatch]);

  // Send message handler
  const handleSendMessage = useCallback(async (content: string) => {
    if (!conversationId) {
      throw new Error('No active conversation');
    }

    try {
      debugLog('useGraphQLChat', 'Sending message:', { content, conversationId });
      dispatch(setStreaming(true));
      dispatch(setError(null));

      // Add user message to store immediately
      dispatch(addMessage({
        content,
        role: 'user'
      }));

      const { data } = await sendMessageMutation({
        variables: {
          input: {
            content,
            conversationId
          }
        }
      });

      debugLog('useGraphQLChat', 'Message sent successfully:', data);
    } catch (error) {
      debugLog('useGraphQLChat', 'Error sending message:', error);
      dispatch(setError((error as Error).message));
      dispatch(setStreaming(false));
      throw error;
    }
  }, [conversationId, sendMessageMutation, dispatch]);

  // Start conversation handler
  const handleStartConversation = useCallback(async (model: string) => {
    try {
      debugLog('useGraphQLChat', 'Starting conversation with model:', model);
      const { data } = await startConversationMutation({
        variables: { model }
      });

      debugLog('useGraphQLChat', 'Conversation started successfully:', data?.startConversation);
      return data?.startConversation;
    } catch (error) {
      debugLog('useGraphQLChat', 'Error starting conversation:', error);
      dispatch(setError((error as Error).message));
      throw error;
    }
  }, [startConversationMutation, dispatch]);

  // Convert messages from GraphQL to Redux format
  const messages = messagesData?.messages?.map(convertMessage) ?? [];

  return {
    messages,
    loading,
    sendMessage: handleSendMessage,
    startConversation: handleStartConversation
  };
}
