import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, FileText } from 'lucide-react';

interface ChatComposerProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  documentCount?: number;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  disabled = false,
  documentCount = 0,
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!content.trim() || disabled) return;
    onSendMessage(content.trim());
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="chat-composer-container">
      {documentCount > 0 ? (
        <div className="composer-context-badge">
          <FileText size={13} />
          <span>Active Context: {documentCount} {documentCount === 1 ? 'document' : 'documents'} selected</span>
        </div>
      ) : (
        <div className="composer-context-badge no-doc">
          <span>No documents selected for this chat yet</span>
        </div>
      )}

      <div className="composer-input-box">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your documents... (Shift+Enter for new line)"
          rows={1}
          disabled={disabled}
          className="composer-textarea"
        />

        <button
          className="composer-send-button"
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          title="Send message"
        >
          <Send size={18} />
        </button>
      </div>

      <div className="composer-disclaimer">
        KnowFlow uses document-grounded retrieval. Full vector embeddings & RAG synthesis pipeline will activate in Days 3–5.
      </div>
    </div>
  );
};
