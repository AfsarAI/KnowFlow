import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ConversationItem } from '../../types';
import {
  Plus,
  MessageSquare,
  Search,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Trash2,
} from 'lucide-react';

interface SidebarProps {
  conversations: ConversationItem[];
  onNewChat: () => void;
  onDeleteConversation?: (id: number) => void;
  documentCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  onNewChat,
  onDeleteConversation,
  documentCount = 0,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    if (onDeleteConversation) {
      onDeleteConversation(convId);
    }
  };

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo" onClick={() => navigate('/dashboard')} role="button">
            <div className="logo-symbol">KF</div>
            <span className="logo-text">KnowFlow</span>
          </div>
        )}
        <button
          className="collapse-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="sidebar-actions">
            <button className="new-chat-button" onClick={onNewChat}>
              <Plus size={18} />
              <span>New Conversation</span>
            </button>
          </div>

          <div className="sidebar-search">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="sidebar-nav-links">
            <div
              className="sidebar-nav-item"
              onClick={() => navigate('/dashboard')}
              role="button"
            >
              <FileText size={16} />
              <span>Document Library ({documentCount})</span>
            </div>
          </div>

          <div className="sidebar-conversations-list">
            <div className="conversations-group-title">Conversations</div>
            {filteredConversations.length === 0 ? (
              <div className="empty-conversations-hint">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-tab ${Number(id) === conv.id ? 'active' : ''}`}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                >
                  <MessageSquare size={16} className="conv-icon" />
                  <span className="conv-title" title={conv.title}>
                    {conv.title}
                  </span>
                  {onDeleteConversation && (
                    <button
                      className="conv-delete-btn"
                      onClick={(e) => handleDelete(e, conv.id)}
                      title="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <div className="user-profile-badge">
              <div className="user-avatar-circle">
                {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-info-text">
                <span className="user-display-name">{user?.full_name || 'KnowFlow User'}</span>
                <span className="user-email-text">{user?.email}</span>
              </div>
            </div>

            <div className="sidebar-footer-controls">
              <button
                className="footer-icon-btn"
                onClick={() => navigate('/settings')}
                title="Settings"
              >
                <Settings size={17} />
              </button>
              <button
                className="footer-icon-btn"
                onClick={() => signOut()}
                title="Sign Out"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
