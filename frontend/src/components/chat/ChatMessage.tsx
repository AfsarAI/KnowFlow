import React, { useState } from 'react';
import { MessageItem } from '../../types';
import { CitationCard } from './CitationCard';
import { Copy, Check, Sparkles, User as UserIcon } from 'lucide-react';

export const ChatMessage: React.FC<{ message: MessageItem }> = ({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';

  return (
    <div className={`chat-message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="user-message-avatar">
            <UserIcon size={16} />
          </div>
        ) : (
          <div className="assistant-message-avatar">
            <Sparkles size={16} />
          </div>
        )}
      </div>

      <div className="message-content-wrapper">
        <div className="message-header-meta">
          <span className="message-sender-name">
            {isUser ? 'You' : 'KnowFlow Assistant'}
          </span>
          <span className="message-timestamp">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="message-bubble">
          <div className="message-text-body">
            {message.content.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph || '\u00A0'}</p>
            ))}
          </div>

          {message.sources && message.sources.length > 0 && (
            <div className="message-citations-block">
              <div className="citations-header-label">Sources Cited:</div>
              <div className="citations-grid">
                {message.sources.map((c, i) => (
                  <CitationCard key={i} citation={c} />
                ))}
              </div>
            </div>
          )}

          {!isUser && (
            <div className="message-footer-actions">
              <button
                className="message-action-btn"
                onClick={handleCopy}
                title="Copy response"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
