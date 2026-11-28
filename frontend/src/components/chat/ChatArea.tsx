import React, { useEffect, useRef } from 'react';
import { MessageItem, ConversationItem, DocumentItem } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { Sparkles, FileText, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatAreaProps {
  conversation?: ConversationItem | null;
  messages: MessageItem[];
  onSendMessage: (text: string, documentIds?: number[]) => void;
  documents?: DocumentItem[];
  selectedDocIds?: number[];
  onSelectDocIds?: (ids: number[]) => void;
  loading?: boolean;
  errorMessage?: string | null;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  onSendMessage,
  documents = [],
  selectedDocIds = [],
  onSelectDocIds,
  loading = false,
  errorMessage = null,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const documentCount = documents.length;

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
            {documentCount > 0
              ? `${documentCount} ${documentCount === 1 ? 'document' : 'documents'} in library`
              : 'Upload documents to begin grounded inquiry'}
          </span>
        </div>

        <div className="chat-header-actions">
          <button
            className="manage-docs-btn"
            onClick={() => navigate('/dashboard')}
          >
            <FileText size={16} />
            <span>Document Library</span>
          </button>
        </div>
      </header>

      <div className="chat-messages-scroll-area">
        {errorMessage && (
          <div className="chat-error-banner">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="empty-state-icon">
              <Sparkles size={36} />
            </div>
            <h3>What would you like to explore?</h3>
            <p>
              Ask any question regarding your uploaded documents. KnowFlow retrieves
              relevant passages and generates answers with exact source citations.
            </p>
            {documentCount === 0 && (
              <button
                className="empty-state-upload-cta"
                onClick={() => navigate('/dashboard')}
              >
                <FileText size={16} />
                <span>Upload your first document</span>
              </button>
            )}
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}

        {loading && (
          <div className="assistant-typing-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="typing-text">Retrieving passages & synthesizing answer...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatComposer
        onSendMessage={onSendMessage}
        disabled={loading}
        documents={documents}
        selectedDocIds={selectedDocIds}
        onSelectDocIds={onSelectDocIds}
      />
    </div>
  );
};
