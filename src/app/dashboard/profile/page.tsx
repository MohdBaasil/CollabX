'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function ProfilePage() {
  const { user, updateProfile, updateUserTheme } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const res = await updateProfile(name, avatarUrl);
    if (res.success) {
      addToast('Profile settings saved successfully!', 'success');
    } else {
      addToast(res.error || 'Failed to update profile', 'error');
    }
    
    setIsSubmitting(false);
  };

  const handleAvatarPreset = (seed: string) => {
    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    setAvatarUrl(url);
    addToast(`Selected avatar preset: ${seed}`, 'info');
  };

  if (!user) return null;

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}`;

  return (
    <div className="profile-container animate-fade-in">
      <header className="page-header">
        <h1>Profile Settings</h1>
        <p className="subtitle">Manage your personal workspace identity and dashboard settings.</p>
      </header>

      <div className="profile-grid">
        {/* Settings Form */}
        <div className="profile-card glass">
          <h3 className="card-title">Personal Profile</h3>
          
          <form onSubmit={handleSubmit} className="form">
            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={user.email} 
                disabled 
                className="input-disabled"
              />
              <span className="input-help">Your email address is managed by organization admin controls.</span>
            </div>

            <div className="input-group">
              <label htmlFor="display-name">Display Name</label>
              <input 
                type="text" 
                id="display-name"
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="input-group">
              <label htmlFor="avatar-url">Avatar Image URL</label>
              <input 
                type="text" 
                id="avatar-url"
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                disabled={isSubmitting}
              />
              
              {/* Presets */}
              <div className="avatar-presets">
                <span className="preset-label">Bot Presets:</span>
                {['Alpha', 'Nebula', 'Echo', 'Apex'].map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    className="preset-btn"
                    onClick={() => handleAvatarPreset(seed)}
                  >
                    {seed}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn glow-effect"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving changes...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Theme Settings & Previews */}
        <div className="profile-sidebar-grid">
          <div className="profile-card glass">
            <h3 className="card-title">Theme Customization</h3>
            <p className="card-desc">Select how CollabSpace looks on your device.</p>
            
            <div className="theme-options">
              <button 
                type="button"
                className={`theme-card dark ${user.theme === 'dark' ? 'active' : ''}`}
                onClick={() => {
                  updateUserTheme('dark');
                  addToast('Switched to Dark Mode', 'success');
                }}
              >
                <div className="theme-preview dark">
                  <span className="mock-title"></span>
                  <span className="mock-line"></span>
                  <span className="mock-line half"></span>
                </div>
                <span className="theme-name">Dark Mode</span>
              </button>

              <button 
                type="button"
                className={`theme-card light ${user.theme === 'light' ? 'active' : ''}`}
                onClick={() => {
                  updateUserTheme('light');
                  addToast('Switched to Light Mode', 'success');
                }}
              >
                <div className="theme-preview light">
                  <span className="mock-title"></span>
                  <span className="mock-line"></span>
                  <span className="mock-line half"></span>
                </div>
                <span className="theme-name">Light Mode</span>
              </button>
            </div>
          </div>

          {/* Security Log Card */}
          <div className="profile-card glass">
            <h3 className="card-title">Active Sessions</h3>
            <p className="card-desc">Devices currently logged into your CollabSpace account.</p>

            <div className="sessions-list">
              <div className="session-item">
                <span className="session-icon">💻</span>
                <div className="session-info">
                  <span className="session-device">Windows PC • Chrome browser</span>
                  <span className="session-ip">127.0.0.1 (Current Session)</span>
                </div>
                <span className="session-badge">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-container {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .page-header h1 {
          font-size: 28px;
          font-weight: 800;
          color: var(--fg-primary);
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 14px;
          color: var(--fg-secondary);
        }

        /* Profile Layout Grid */
        .profile-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .profile-sidebar-grid {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .profile-card {
          padding: 24px;
          border-radius: var(--radius-lg);
        }
        .card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--fg-primary);
          margin-bottom: 6px;
        }
        .card-desc {
          font-size: 12px;
          color: var(--fg-secondary);
          margin-bottom: 20px;
        }

        /* Form styling */
        .form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        label {
          font-size: 11px;
          font-weight: 700;
          color: var(--fg-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        input {
          padding: 10px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-primary);
          font-size: 14px;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          width: 100%;
        }
        input:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }
        .input-disabled {
          background: var(--bg-primary);
          border-color: var(--border-color);
          color: var(--fg-tertiary);
          cursor: not-allowed;
        }
        .input-help {
          font-size: 11px;
          color: var(--fg-tertiary);
        }
        .btn {
          padding: 12px;
          background: var(--primary);
          border: none;
          border-radius: var(--radius-md);
          color: #ffffff;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background-color var(--transition-fast);
          align-self: flex-start;
          min-width: 120px;
          margin-top: 8px;
        }
        .btn:hover {
          background: var(--primary-hover);
        }
        .btn:disabled {
          background: var(--border-color);
          color: var(--fg-tertiary);
          cursor: not-allowed;
        }

        .avatar-presets {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .preset-label {
          font-size: 11px;
          color: var(--fg-tertiary);
          font-weight: 600;
        }
        .preset-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--fg-secondary);
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .preset-btn:hover {
          background: var(--bg-tertiary);
          color: var(--fg-primary);
        }

        /* Themes selector */
        .theme-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .theme-card {
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          transition: border-color var(--transition-fast), background var(--transition-fast);
        }
        .theme-card:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-hover);
        }
        .theme-card.active {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-glow);
        }
        .theme-preview {
          width: 100%;
          height: 64px;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px;
          border: 1px solid var(--border-color);
        }
        .theme-preview.dark {
          background: #09090b;
        }
        .theme-preview.light {
          background: #ffffff;
        }
        .theme-preview .mock-title {
          width: 40%;
          height: 6px;
          border-radius: 3px;
        }
        .theme-preview .mock-line {
          width: 80%;
          height: 4px;
          border-radius: 2px;
        }
        .theme-preview.dark .mock-title { background: #27272a; }
        .theme-preview.dark .mock-line { background: #18181b; }
        .theme-preview.light .mock-title { background: #e4e4e7; }
        .theme-preview.light .mock-line { background: #f4f4f5; }
        
        .theme-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--fg-secondary);
        }
        .theme-card.active .theme-name {
          color: var(--primary);
        }

        /* Sessions logging */
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .session-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }
        .session-icon {
          font-size: 20px;
        }
        .session-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .session-device {
          font-size: 12px;
          font-weight: 600;
          color: var(--fg-primary);
        }
        .session-ip {
          font-size: 10px;
          color: var(--fg-tertiary);
        }
        .session-badge {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
          font-size: 9px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
          .profile-container {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
