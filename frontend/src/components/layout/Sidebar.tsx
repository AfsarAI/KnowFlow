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
} from 'lucide-react';

interface SidebarProps {
  conversations: ConversationItem[];
  onNewChat: () => void;
  documentCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  onNewChat,
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

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
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
              <span>Documents ({documentCount})</span>
            </div>
          </div>

          <div className="sidebar-conversations-list">
            <div className="conversations-group-title">Recent Conversations</div>
            {filteredConversations.length === 0 ? (
              <div className="empty-conversations-hint">
                {searchQuery ? 'No matching chats' : 'No conversations yet'}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-tab ${Number(id) === conv.id ? 'active' : ''}`}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                >
                  <MessageSquare size={16} className="conv-icon" />
                  <span className="conv-title">{conv.title}</span>
                </div>
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-user-info">
              <div className="user-avatar-circle">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.full_name || 'User'}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            </div>

            <div className="sidebar-footer-actions">
              <button
                className="footer-action-btn"
                onClick={() => navigate('/settings')}
                title="Settings"
              >
                <Settings size={18} />
              </button>
              <button
                className="footer-action-btn"
                onClick={signOut}
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {collapsed && (
        <div className="collapsed-icon-list">
          <button className="collapsed-action-btn" onClick={onNewChat} title="New Chat">
            <Plus size={20} />
          </button>
          <button
            className="collapsed-action-btn"
            onClick={() => navigate('/dashboard')}
            title="Documents"
          >
            <FileText size={20} />
          </button>
          <button className="collapsed-action-btn" onClick={signOut} title="Sign Out">
            <LogOut size={20} />
          </button>
        </div>
      )}
    </aside>
  );
};
