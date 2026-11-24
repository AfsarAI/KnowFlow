import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { DocumentUploader } from '../components/upload/DocumentUploader';
import { ConversationItem } from '../types';
import { Sparkles, Plus, Clock } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([
    {
      id: 1,
      user_id: 'default',
      title: 'Project Overview & Research Notes',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const navigate = useNavigate();

  const handleNewChat = () => {
    const newId = Date.now();
    const newConv: ConversationItem = {
      id: newId,
      user_id: 'default',
      title: selectedDocuments.length > 0
        ? `Chat: ${selectedDocuments[0].name.replace(/\.[^/.]+$/, '')}`
        : 'New Document Chat',
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
        documentCount={selectedDocuments.length}
      />

      <main className="product-main-view">
        <div className="dashboard-scroll-content">
          <div className="dashboard-hero-section">
            <div className="hero-tag-pill">
              <Sparkles size={14} />
              <span>AI Document Intelligence</span>
            </div>
            <h1 className="dashboard-hero-title">Your knowledge is already in your documents.</h1>
            <p className="dashboard-hero-sub">
              Upload your documents, ask questions, and discover insights in seconds with verifiable citations.
            </p>
          </div>

          <div className="uploader-section-wrapper">
            <DocumentUploader
              onFilesSelected={(files) => setSelectedDocuments(files)}
              onProceedToChat={handleNewChat}
            />
          </div>

          <div className="dashboard-quick-actions">
            <div className="quick-action-card" onClick={handleNewChat} role="button">
              <div className="action-card-icon">
                <Plus size={22} />
              </div>
              <div className="action-card-text">
                <h3>Start New Conversation</h3>
                <p>Begin a focused dialogue with your uploaded document context.</p>
              </div>
            </div>

            <div
              className="quick-action-card"
              onClick={() => {
                if (conversations.length > 0) {
                  navigate(`/chat/${conversations[0].id}`);
                }
              }}
              role="button"
            >
              <div className="action-card-icon">
                <Clock size={22} />
              </div>
              <div className="action-card-text">
                <h3>Resume Recent Chat</h3>
                <p>{conversations[0]?.title || 'Continue your last research session.'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
