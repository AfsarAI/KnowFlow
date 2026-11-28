import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, FileText, Check, ChevronDown, Filter } from 'lucide-react';
import { DocumentItem } from '../../types';

interface ChatComposerProps {
  onSendMessage: (content: string, documentIds?: number[]) => void;
  disabled?: boolean;
  documents?: DocumentItem[];
  selectedDocIds?: number[];
  onSelectDocIds?: (ids: number[]) => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  disabled = false,
  documents = [],
  selectedDocIds = [],
  onSelectDocIds,
}) => {
  const [content, setContent] = useState('');
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setScopeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!content.trim() || disabled) return;
    const docScope = selectedDocIds.length > 0 ? selectedDocIds : undefined;
    onSendMessage(content.trim(), docScope);
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const toggleDocument = (id: number) => {
    if (!onSelectDocIds) return;
    if (selectedDocIds.includes(id)) {
      onSelectDocIds(selectedDocIds.filter((docId) => docId !== id));
    } else {
      onSelectDocIds([...selectedDocIds, id]);
    }
  };

  const selectAll = () => {
    if (!onSelectDocIds) return;
    onSelectDocIds([]);
  };

  const isAllSelected = selectedDocIds.length === 0;

  return (
    <div className="chat-composer-container">
      <div className="composer-toolbar-row">
        <div className="scope-selector-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className="scope-toggle-btn"
            onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
            disabled={disabled || documents.length === 0}
          >
            <Filter size={13} />
            <span>
              {documents.length === 0
                ? 'No documents uploaded'
                : isAllSelected
                ? `All Documents (${documents.length})`
                : `${selectedDocIds.length} of ${documents.length} Selected`}
            </span>
            <ChevronDown size={13} />
          </button>

          {scopeDropdownOpen && documents.length > 0 && (
            <div className="scope-dropdown-menu">
              <div className="dropdown-header-label">Document Retrieval Scope</div>
              <div
                className={`dropdown-item-option ${isAllSelected ? 'selected' : ''}`}
                onClick={() => {
                  selectAll();
                  setScopeDropdownOpen(false);
                }}
              >
                <div className="doc-option-check">
                  {isAllSelected && <Check size={13} />}
                </div>
                <span>All uploaded documents</span>
              </div>

              <div className="dropdown-divider" />

              <div className="dropdown-docs-list">
                {documents.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      className={`dropdown-item-option ${isChecked ? 'selected' : ''}`}
                      onClick={() => toggleDocument(doc.id)}
                    >
                      <div className="doc-option-check">
                        {isChecked && <Check size={13} />}
                      </div>
                      <FileText size={13} className="doc-icon" />
                      <span className="doc-title-text" title={doc.filename}>
                        {doc.filename}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

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
        KnowFlow answers are strictly grounded in your uploaded documents with verifiable citations.
      </div>
    </div>
  );
};
