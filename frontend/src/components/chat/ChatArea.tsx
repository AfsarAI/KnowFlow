import React, { useEffect, useRef } from 'react';
import { MessageItem, ConversationItem } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { Sparkles, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatAreaProps {
  conversation?: ConversationItem;
  messages: MessageItem[];
  onSendMessage: (text: string) => void;
  documentCount?: number;
  loading?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  onSendMessage,
  documentCount = 0,
  loading = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-area-container">
      <header className="chat-area-header">
        <button
          className="mobile-back-btn"
          onClick={() => navigate('/dashboard')}
          title="Back to Documents"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="chat-header-title-block">
          <h2>{conversation?.title || 'KnowFlow Document Chat'}</h2>
          <span className="chat-header-sub">
            {documentCount > 0 ? `${documentCount} documents indexed` : 'Document Assistant'}
          </span>
        </div>

        <div className="chat-header-actions">
          <button
            className="manage-docs-btn"
            onClick={() => navigate('/dashboard')}
          >
            <FileText size={16} />
            <span>Documents</span>
          </button>
        </div>
      </header>

      <div className="chat-messages-scroll-area">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="empty-state-icon">
              <Sparkles size={36} />
            </div>
            <h3>What would you like to explore?</h3>
            <p>
              Ask any question regarding your uploaded documents. KnowFlow will locate
              relevant sections and generate an answer with verifiable citations.
            </p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}

        {loading && (
          <div className="assistant-typing-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatComposer
        onSendMessage={onSendMessage}
        disabled={loading}
        documentCount={documentCount}
      />
    </div>
  );
};
