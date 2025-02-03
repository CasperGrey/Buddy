import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectCurrentSession, 
  selectIsStreaming 
} from '../../lib/store/selectors';
import { 
  clearSession, 
  deleteSession 
} from '../../lib/store/slices/chatSlice';
import { useGraphQLChat } from '../../lib/hooks/useGraphQLChat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SessionHeader from './SessionHeader';
import { debugLog } from '../../lib/utils/debug';

export default function Chat() {
  const dispatch = useDispatch();
  const currentSession = useSelector(selectCurrentSession);
  const isStreaming = useSelector(selectIsStreaming);

  const {
    messages,
    loading,
    sendMessage,
    startConversation
  } = useGraphQLChat(currentSession?.id);

  const handleSendMessage = useCallback(async (content: string) => {
    try {
      debugLog('Chat', 'Sending message:', content);
      await sendMessage(content);
    } catch (error) {
      debugLog('Chat', 'Error sending message:', error);
      // Error is handled by the hook and stored in Redux
    }
  }, [sendMessage]);

  const handleStartNewChat = useCallback(async () => {
    try {
      debugLog('Chat', 'Starting new chat');
      const conversation = await startConversation('default');
      debugLog('Chat', 'New chat started:', conversation);
    } catch (error) {
      debugLog('Chat', 'Error starting new chat:', error);
      // Error is handled by the hook and stored in Redux
    }
  }, [startConversation]);

  const handleClearSession = useCallback((sessionId: string) => {
    debugLog('Chat', 'Clearing session:', sessionId);
    dispatch(clearSession(sessionId));
  }, [dispatch]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    debugLog('Chat', 'Deleting session:', sessionId);
    dispatch(deleteSession(sessionId));
  }, [dispatch]);

  if (!currentSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500 mb-4">No chat session selected</p>
        <button
          onClick={handleStartNewChat}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Start New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SessionHeader 
        session={currentSession}
        onClearSession={handleClearSession}
        onDeleteSession={handleDeleteSession}
      />
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          loading={loading}
          isStreaming={isStreaming}
        />
      </div>
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isStreaming || loading}
      />
    </div>
  );
}
