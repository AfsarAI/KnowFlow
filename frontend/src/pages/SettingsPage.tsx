import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Key, User, ArrowLeft, LogOut, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, isConfigured, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="settings-page-wrapper">
      <div className="settings-container">
        <header className="settings-header">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
          <h2>Account & Workspace Settings</h2>
        </header>

        <div className="settings-cards-grid">
          <div className="settings-card">
            <div className="settings-card-title">
              <User size={20} className="card-icon" />
              <h3>User Profile</h3>
            </div>
            <div className="settings-row">
              <span className="label">Name:</span>
              <span className="value">{user?.full_name || 'Not provided'}</span>
            </div>
            <div className="settings-row">
              <span className="label">Email:</span>
              <span className="value">{user?.email}</span>
            </div>
            <div className="settings-row">
              <span className="label">Identity ID:</span>
              <code className="value-code">{user?.id}</code>
            </div>
            <div className="settings-row">
              <span className="label">Auth Provider:</span>
              <span className="value capitalize">{user?.auth_provider || 'email'}</span>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-title">
              <Key size={20} className="card-icon" />
              <h3>Authentication Service</h3>
            </div>
            <div className="settings-row">
              <span className="label">Provider Mode:</span>
              <span className="badge-pill">
                {isConfigured ? 'Supabase Hosted Auth' : 'Local Development Mode'}
              </span>
            </div>
            <div className="settings-row">
              <span className="label">JWT Verification:</span>
              <span className="status-indicator-green">
                <CheckCircle2 size={15} /> Active on FastAPI Backend
              </span>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-title">
              <Shield size={20} className="card-icon" />
              <h3>Privacy & Security</h3>
            </div>
            <p className="privacy-card-text">
              All documents uploaded to KnowFlow are isolated at the database level using
              cryptographic user ID scoping. Your document passages are never used to train public models.
            </p>
          </div>
        </div>

        <div className="settings-footer-actions">
          <button className="settings-logout-btn" onClick={signOut}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
