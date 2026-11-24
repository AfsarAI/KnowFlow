import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { DocumentUploader } from '../components/upload/DocumentUploader';
import { ConversationItem, DocumentItem } from '../types';
import { documentService } from '../services/documentService';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles,
  Plus,
  Clock,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  Loader2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([
    {
      id: 1,
      user_id: 'default',
      title: 'Project Overview & Research Notes',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    setLoadingDocs(true);
    try {
      const data = await documentService.getDocuments(token);
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDeleteDocument = async (id: number) => {
    if (!token || deletingId !== null) return;
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    setDeletingId(id);
    try {
      await documentService.deleteDocument(id, token);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Could not delete document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleNewChat = () => {
    const newId = Date.now();
    const newConv: ConversationItem = {
      id: newId,
      user_id: 'default',
      title: documents.length > 0
        ? `Chat: ${documents[0].filename.replace(/\.[^/.]+$/, '')}`
        : 'New Document Chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setConversations([newConv, ...conversations]);
    navigate(`/chat/${newId}`);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="product-shell">
      <Sidebar
        conversations={conversations}
        onNewChat={handleNewChat}
        documentCount={documents.length}
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
              onUploadSuccess={() => fetchDocuments()}
            />
          </div>

          {/* User's Uploaded Documents Section */}
          <div className="documents-library-section">
            <div className="library-header-row">
              <div className="library-title-group">
                <h2>Your Document Library</h2>
                <span className="library-count-pill">{documents.length}</span>
              </div>
              {documents.length > 0 && (
                <button className="chat-with-docs-btn" onClick={handleNewChat}>
                  <span>Start Conversation</span>
                  <Plus size={16} />
                </button>
              )}
            </div>

            {loadingDocs ? (
              <div className="docs-loading-placeholder">
                <Loader2 size={24} className="spin-icon" />
                <span>Loading your documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="docs-empty-state">
                <FileQuestion size={36} className="empty-docs-icon" />
                <p>No documents uploaded yet. Upload PDF or TXT files above to begin.</p>
              </div>
            ) : (
              <div className="library-docs-grid">
                {documents.map((doc) => (
                  <div key={doc.id} className="library-doc-card">
                    <div className="doc-card-top">
                      <div className="doc-card-icon-wrapper">
                        <FileText size={22} className="doc-icon-blue" />
                      </div>
                      <div className="doc-card-meta">
                        <span className="doc-card-filename" title={doc.filename}>
                          {doc.filename}
                        </span>
                        <div className="doc-meta-sub">
                          <span>{formatFileSize(doc.file_size)}</span>
                          {doc.page_count !== null && (
                            <span>• {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}</span>
                          )}
                          <span>• {doc.file_type.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="doc-card-bottom">
                      <div className="doc-status-badge-container">
                        {doc.processing_status === 'completed' && (
                          <span className="status-badge-completed">
                            <CheckCircle2 size={13} /> Indexed & Ready
                          </span>
                        )}
                        {doc.processing_status === 'processing' && (
                          <span className="status-badge-processing">
                            <Loader2 size={13} className="spin-icon" /> Processing
                          </span>
                        )}
                        {doc.processing_status === 'failed' && (
                          <span className="status-badge-failed" title={doc.error_message || 'Processing failed'}>
                            <AlertCircle size={13} /> Extraction Failed
                          </span>
                        )}
                        {doc.processing_status === 'uploaded' && (
                          <span className="status-badge-uploaded">Uploaded</span>
                        )}
                      </div>

                      <button
                        className="doc-delete-action-btn"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deletingId === doc.id}
                        title="Delete document"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 size={16} className="spin-icon" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
