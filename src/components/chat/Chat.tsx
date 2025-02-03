import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, Typography } from '@mui/material';
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
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No chat session selected
        </Typography>
        <Button
          variant="contained"
          onClick={handleStartNewChat}
          sx={{ borderRadius: 2 }}
        >
          Start New Chat
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden'
    }}>
      <SessionHeader 
        session={currentSession}
        onClearSession={handleClearSession}
        onDeleteSession={handleDeleteSession}
      />
      <Box sx={{ 
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <MessageList
          messages={messages}
          loading={loading}
          isStreaming={isStreaming}
        />
      </Box>
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isStreaming || loading}
      />
    </Box>
  );
}
