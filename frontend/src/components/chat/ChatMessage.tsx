import React, { useState } from 'react';
import { MessageItem } from '../../types';
import { CitationCard } from './CitationCard';
import { Copy, Check, Sparkles, User as UserIcon, AlertTriangle } from 'lucide-react';

export const ChatMessage: React.FC<{ message: MessageItem }> = ({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';
  const isInsufficient =
    !isUser &&
    (message.content.includes("I cannot find this information in the uploaded documents") ||
      message.content.includes("insufficient evidence"));

  // Lightweight safe Markdown renderer for structured assistant answers
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeBlockKey = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${codeBlockKey++}`} className="markdown-code-block">
              <code>{codeBlockLines.join('\n')}</code>
            </pre>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      if (line.startsWith('### ')) {
        elements.push(<h4 key={i} className="markdown-h4">{renderInlineStyles(line.slice(4))}</h4>);
      } else if (line.startsWith('## ')) {
        elements.push(<h3 key={i} className="markdown-h3">{renderInlineStyles(line.slice(3))}</h3>);
      } else if (line.startsWith('# ')) {
        elements.push(<h2 key={i} className="markdown-h2">{renderInlineStyles(line.slice(2))}</h2>);
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={i} className="markdown-list-item">
            {renderInlineStyles(line.trim().slice(2))}
          </li>
        );
      } else if (/^\d+\.\s/.test(line.trim())) {
        const itemText = line.trim().replace(/^\d+\.\s/, '');
        elements.push(
          <li key={i} className="markdown-list-item-numbered">
            {renderInlineStyles(itemText)}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="markdown-empty-line" />);
      } else {
        elements.push(
          <p key={i} className="markdown-paragraph">
            {renderInlineStyles(line)}
          </p>
        );
      }
    }

    if (inCodeBlock && codeBlockLines.length > 0) {
      elements.push(
        <pre key={`code-${codeBlockKey}`} className="markdown-code-block">
          <code>{codeBlockLines.join('\n')}</code>
        </pre>
      );
    }

    return elements;
  };

  const renderInlineStyles = (text: string): React.ReactNode => {
    // Process bold (**bold**) and inline code (`code`)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="markdown-inline-code">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

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
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="message-bubble">
          {isInsufficient && (
            <div className="insufficient-evidence-banner">
              <AlertTriangle size={15} />
              <span>Insufficient Evidence in Uploaded Documents</span>
            </div>
          )}

          <div className="message-text-body">
            {renderFormattedContent(message.content)}
          </div>

          {message.sources && message.sources.length > 0 && (
            <div className="message-citations-block">
              <div className="citations-header-label">Grounded Source Citations:</div>
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
                <span>{copied ? 'Copied' : 'Copy answer'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
