import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { ConversationItem, MessageItem } from '../types';

export const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationItem[]>([
    {
      id: 1,
      user_id: 'default',
      title: 'Project Overview & Research Notes',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      user_id: 'default',
      title: 'Financial Statements Analysis',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const activeId = Number(id) || 1;
  const currentConversation = conversations.find((c) => c.id === activeId) || {
    id: activeId,
    user_id: 'default',
    title: 'New Document Chat',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'm1',
      conversation_id: activeId,
      role: 'assistant',
      content:
        'Hello! I am KnowFlow, your document knowledge assistant. Upload your PDF or TXT files, and ask me anything about them. I will provide precise, evidence-based answers with source citations.',
      created_at: new Date().toISOString(),
    },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = (text: string) => {
    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      conversation_id: activeId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    // Simulated responsive feedback until Day 5 RAG pipeline is connected
    setTimeout(() => {
      const assistantMsg: MessageItem = {
        id: `a-${Date.now()}`,
        conversation_id: activeId,
        role: 'assistant',
        content: `I received your inquiry regarding "${text.length > 40 ? text.slice(0, 40) + '...' : text}". Full semantic vector retrieval and context synthesis will be linked in upcoming milestones (Days 3–5). Your conversation session is securely active and persisted.`,
        sources: [
          {
            document_name: 'Document-Context.pdf',
            page_number: 1,
            excerpt: 'Indexed passage reference matching query scope.',
          },
        ],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsProcessing(false);
    }, 800);
  };

  const handleNewChat = () => {
    const newId = Date.now();
    const newConv: ConversationItem = {
      id: newId,
      user_id: 'default',
      title: 'New Document Chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setConversations([newConv, ...conversations]);
    navigate(`/chat/${newId}`);
  };

  return (
    <div className="product-shell">
      <Sidebar
        conversations={conversations}
        onNewChat={handleNewChat}
        documentCount={1}
      />
      <main className="product-main-view">
        <ChatArea
          conversation={currentConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          documentCount={1}
          loading={isProcessing}
        />
      </main>
    </div>
  );
};
