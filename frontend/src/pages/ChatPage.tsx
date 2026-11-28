import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { ConversationItem, MessageItem, DocumentItem } from '../types';
import { chatService } from '../services/chatService';
import { documentService } from '../services/documentService';
import { isValidToken } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

export const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeId = id && id !== 'new' ? Number(id) : null;

  // 1. Fetch conversations and documents on mount or token change
  const loadSidebarData = useCallback(async () => {
    if (!token || !isValidToken(token)) return;
    try {
      const [convList, docList] = await Promise.all([
        chatService.getConversations(token),
        documentService.getDocuments(token),
      ]);
      setConversations(convList);
      setDocuments(docList);
    } catch (err) {
      console.error('Failed to load sidebar data:', err);
    }
  }, [token]);

  useEffect(() => {
    loadSidebarData();
  }, [loadSidebarData]);

  // 2. Load active conversation messages when activeId changes
  useEffect(() => {
    let mounted = true;
    if (!token || !isValidToken(token)) return;

    if (!activeId) {
      // New Chat state
      setMessages([]);
      setActiveConversation(null);
      setSelectedDocIds([]);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);
    chatService.getConversation(activeId, token).then((conv) => {
      if (!mounted) return;
      if (conv) {
        setActiveConversation({
          id: conv.id,
          user_id: '',
          title: conv.title,
          selected_document_ids: conv.selected_document_ids,
          created_at: '',
          updated_at: '',
        });
        setMessages(conv.messages);
        if (conv.selected_document_ids && conv.selected_document_ids.length > 0) {
          setSelectedDocIds(conv.selected_document_ids);
        }
      } else {
        // Conversation not found or unauthorized
        navigate('/chat');
      }
    });

    return () => {
      mounted = false;
    };
  }, [activeId, token, navigate]);

  // 3. Send message handler
  const handleSendMessage = async (text: string, documentIds?: number[]) => {
    if (!token || !isValidToken(token) || isProcessing) return;

    setErrorMessage(null);

    // Optimistic user message rendering
    const optimisticUserMsg: MessageItem = {
      id: `opt-${Date.now()}`,
      conversation_id: activeId || 0,
      role: 'user',
      content: text,
      sources: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setIsProcessing(true);

    try {
      const response = await chatService.sendMessage(
        text,
        token,
        activeId || undefined,
        documentIds
      );

      // Replace optimistic message and append real assistant message
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUserMsg.id),
        response.user_message,
        response.assistant_message,
      ]);

      // If this was a new conversation, update route and conversation list
      if (!activeId || activeId !== response.conversation_id) {
        navigate(`/chat/${response.conversation_id}`, { replace: true });
      }

      // Refresh conversations list to update titles/timestamps
      loadSidebarData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate answer. Please try again.';
      setErrorMessage(msg);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id));
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Start new conversation
  const handleNewChat = () => {
    navigate('/chat');
  };

  // 5. Delete conversation handler
  const handleDeleteConversation = async (convId: number) => {
    if (!token || !isValidToken(token)) return;
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await chatService.deleteConversation(convId, token);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeId === convId) {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      alert('Could not delete conversation. Please try again.');
    }
  };

  return (
    <div className="product-shell">
      <Sidebar
        conversations={conversations}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        documentCount={documents.length}
      />
      <main className="product-main-view">
        <ChatArea
          conversation={activeConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          documents={documents}
          selectedDocIds={selectedDocIds}
          onSelectDocIds={setSelectedDocIds}
          loading={isProcessing}
          errorMessage={errorMessage}
        />
      </main>
    </div>
  );
};
