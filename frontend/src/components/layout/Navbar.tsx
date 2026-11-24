import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User as UserIcon, Plus } from 'lucide-react';

export const Navbar: React.FC<{ onNewChat?: () => void }> = ({ onNewChat }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="top-navbar">
      <div className="nav-left">
        <div className="nav-brand" onClick={() => navigate('/dashboard')} role="button">
          <div className="brand-icon">
            <span>KF</span>
          </div>
          <span className="brand-title">KnowFlow</span>
        </div>
      </div>

      <div className="nav-right">
        {onNewChat && (
          <button className="nav-new-chat-btn" onClick={onNewChat}>
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        )}

        <div className="nav-user-pill">
          <div className="user-avatar">
            {user?.full_name ? user.full_name[0].toUpperCase() : <UserIcon size={14} />}
          </div>
          <span className="user-email-text">{user?.full_name || user?.email}</span>
        </div>

        <button className="nav-logout-btn" onClick={signOut} title="Sign Out">
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
};
