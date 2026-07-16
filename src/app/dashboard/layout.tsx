'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { RealtimeProvider } from '@/context/RealtimeContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, workspaces, activeWorkspace, setActiveWorkspace, logout, isLoading } = useAuth();
  const { addToast } = useToast();
  const pathname = usePathname();
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  // Listen to custom window updates to keep sidebar projects list synchronized
  useEffect(() => {
    const fetchProjects = async () => {
      if (!activeWorkspace) return;
      try {
        const res = await fetch(`/api/dashboard/projects?workspaceId=${activeWorkspace.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data.filter((p) => p.status !== 'archived'));
        }
      } catch (err) {
        console.error('Failed to load projects for sidebar', err);
      }
    };

    window.addEventListener('collabspace-projects-updated', fetchProjects);
    fetchProjects();

    return () => {
      window.removeEventListener('collabspace-projects-updated', fetchProjects);
    };
  }, [activeWorkspace]);

  const handleLogout = async () => {
    await logout();
    addToast('Logged out successfully', 'success');
  };

  const selectWorkspace = (ws: any) => {
    setActiveWorkspace(ws);
    setIsWsDropdownOpen(false);
    addToast(`Switched workspace to ${ws.name}`, 'success');
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your workspace...</p>
        <style jsx>{`
          .loading-container {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
            gap: 16px;
            color: var(--fg-secondary);
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(99, 102, 241, 0.2);
            border-radius: 50%;
            border-top-color: var(--primary);
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}`;

  const projectId = pathname?.startsWith('/dashboard/projects/') 
    ? pathname.split('/dashboard/projects/')[1]?.split('/')[0] 
    : undefined;

  return (
    <RealtimeProvider projectId={projectId}>
      <div className="layout">
      {/* Mobile Header Bar */}
      <header className="mobile-header glass">
        <button className="menu-btn" onClick={() => setIsMobileOpen(true)}>
          ☰
        </button>
        <div className="mobile-logo">CollabSpace</div>
        <div className="mobile-actions">
          <img src={user.avatarUrl || defaultAvatar} alt="Avatar" className="user-avatar-sm" />
        </div>
      </header>

      {/* Sidebar Panel */}
      <aside className={`sidebar glass ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Mobile Sidebar Close Button */}
        <button className="close-menu-btn" onClick={() => setIsMobileOpen(false)}>✕</button>

        {/* Workspace Selector */}
        <div className="ws-selector-container">
          <button 
            className="ws-selector-btn"
            onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
          >
            <div className="ws-logo-avatar">
              {activeWorkspace?.name.charAt(0) || 'W'}
            </div>
            <div className="ws-info">
              <span className="ws-name">{activeWorkspace?.name || 'Loading WS...'}</span>
              <span className="ws-plan">Free Plan</span>
            </div>
            <span className="ws-chevron">▼</span>
          </button>

          {isWsDropdownOpen && (
            <div className="ws-dropdown glass">
              <div className="dropdown-title">Switch Workspace</div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  className={`dropdown-item ${activeWorkspace?.id === ws.id ? 'active' : ''}`}
                  onClick={() => selectWorkspace(ws)}
                >
                  <span className="item-avatar">{ws.name.charAt(0)}</span>
                  <span className="item-name">{ws.name}</span>
                </button>
              ))}
              <div className="dropdown-divider"></div>
              <button 
                className="dropdown-action-btn"
                onClick={() => {
                  addToast('Workspace creation is coming soon!', 'info');
                  setIsWsDropdownOpen(false);
                }}
              >
                + Create Workspace
              </button>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <Link 
            href="/dashboard" 
            className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
            onClick={() => setIsMobileOpen(false)}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </Link>
          <Link 
            href="/dashboard/profile" 
            className={`nav-link ${pathname === '/dashboard/profile' ? 'active' : ''}`}
            onClick={() => setIsMobileOpen(false)}
          >
            <span className="nav-icon">👤</span>
            Profile Settings
          </Link>

          {/* Dynamic Projects Sub-list */}
          <div className="projects-header-row">
            <span className="sidebar-section-title">Projects</span>
            <span className="projects-count">{projects.length}</span>
          </div>
          <div className="sidebar-projects-list">
            {projects.length === 0 ? (
              <span className="no-projects-text">No active projects</span>
            ) : (
              projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.id}`}
                  className={`project-link ${pathname === `/dashboard/projects/${p.id}` ? 'active' : ''}`}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <span className={`project-bullet ${p.isFavorite ? 'favorite' : ''}`}>●</span>
                  <span className="project-link-name">{p.name}</span>
                </Link>
              ))
            )}
          </div>

          <div className="sidebar-divider"></div>

          <button 
            className="nav-link text-red"
            onClick={handleLogout}
          >
            <span className="nav-icon">🚪</span>
            Sign Out
          </button>
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="sidebar-footer">
          <Link href="/dashboard/profile" className="footer-profile-link">
            <img src={user.avatarUrl || defaultAvatar} alt="User Avatar" className="footer-avatar" />
            <div className="footer-user-details">
              <div className="footer-username">{user.name || 'Set Name'}</div>
              <div className="footer-useremail">{user.email}</div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Sidebar Mobile Overlay Background */}
      {isMobileOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileOpen(false)}></div>
      )}

      {/* Main Panel Content Container */}
      <div className="main-panel">
        {/* Desktop Header */}
        <header className="desktop-header glass">
          <div className="header-breadcrumbs">
            <span className="crumb-active">
              {pathname === '/dashboard' 
                ? 'Dashboard' 
                : pathname?.startsWith('/dashboard/projects/') 
                ? 'Project Console' 
                : 'Profile Settings'}
            </span>
          </div>

          <div className="header-search-bar" onClick={() => addToast('Use Dashboard filters to locate projects instantly', 'info')}>
            🔍 Search workspace... <kbd>⌘K</kbd>
          </div>

          <div className="header-actions-right">
            <button 
              className="header-icon-btn" 
              title="Notifications"
              onClick={() => addToast('No notifications yet', 'info')}
            >
              🔔
            </button>
            <button 
              className="header-icon-btn"
              title="Toggle Theme"
              onClick={() => {
                const html = document.documentElement;
                const nextTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
                html.setAttribute('data-theme', nextTheme);
                localStorage.setItem('collabspace-theme', nextTheme);
                addToast(`Theme switched to ${nextTheme}`, 'info');
              }}
            >
              🌓
            </button>
          </div>
        </header>

        {/* Actual child page rendered here */}
        <main className="content-area">
          {children}
        </main>
      </div>

      <style jsx>{`
        .layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg-primary);
        }

        /* Mobile Header */
        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 99;
          border-bottom: 1px solid var(--border-color);
        }
        .menu-btn {
          background: none;
          border: none;
          color: var(--fg-primary);
          font-size: 20px;
          cursor: pointer;
        }
        .mobile-logo {
          font-weight: 700;
          font-size: 16px;
        }
        .user-avatar-sm {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-tertiary);
        }

        /* Sidebar Container */
        .sidebar {
          width: 250px;
          height: 100%;
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 16px;
          background: var(--bg-secondary);
          z-index: 100;
          transition: transform var(--transition-normal);
        }

        /* Workspace selector styling */
        .ws-selector-container {
          position: relative;
          margin-bottom: 24px;
        }
        .ws-selector-btn {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-primary);
          cursor: pointer;
          transition: background var(--transition-fast);
          text-align: left;
        }
        .ws-selector-btn:hover {
          background: var(--bg-tertiary);
        }
        .ws-logo-avatar {
          width: 32px;
          height: 32px;
          background: var(--primary);
          color: white;
          font-weight: bold;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          margin-right: 10px;
          flex-shrink: 0;
        }
        .ws-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          overflow: hidden;
        }
        .ws-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ws-plan {
          font-size: 10px;
          color: var(--fg-tertiary);
        }
        .ws-chevron {
          font-size: 10px;
          color: var(--fg-tertiary);
          margin-left: 6px;
        }

        /* WS Dropdown Menu */
        .ws-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          padding: 8px;
          z-index: 101;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }
        .dropdown-title {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--fg-tertiary);
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 4px 8px;
          margin-bottom: 4px;
        }
        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 8px;
          border: none;
          background: none;
          color: var(--fg-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: background-color var(--transition-fast);
          text-align: left;
        }
        .dropdown-item:hover {
          background: var(--bg-tertiary);
          color: var(--fg-primary);
        }
        .dropdown-item.active {
          background: rgba(99, 102, 241, 0.08);
          color: var(--primary);
          font-weight: 600;
        }
        .item-avatar {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: var(--border-color);
          color: var(--fg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          margin-right: 8px;
        }
        .dropdown-item.active .item-avatar {
          background: var(--primary);
          color: white;
        }
        .item-name {
          font-size: 13px;
        }
        .dropdown-divider {
          height: 1px;
          background: var(--border-color);
          margin: 6px 0;
        }
        .dropdown-action-btn {
          width: 100%;
          background: none;
          border: none;
          padding: 8px;
          font-size: 12px;
          color: var(--fg-tertiary);
          text-align: left;
          cursor: pointer;
          transition: color var(--transition-fast);
          font-weight: 500;
        }
        .dropdown-action-btn:hover {
          color: var(--fg-primary);
        }

        /* Sidebar Nav links */
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-grow: 1;
        }
        .nav-link {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          color: var(--fg-secondary);
          font-size: 13px;
          font-weight: 500;
          transition: background var(--transition-fast), color var(--transition-fast);
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
        }
        .nav-link:hover {
          background: var(--bg-tertiary);
          color: var(--fg-primary);
        }
        .nav-link.active {
          background: rgba(99, 102, 241, 0.08);
          color: var(--primary);
          font-weight: 600;
        }
        .nav-icon {
          font-size: 16px;
          margin-right: 12px;
        }
        .sidebar-divider {
          height: 1px;
          background: var(--border-color);
          margin: 12px 0;
        }
        .text-red {
          color: var(--error);
        }
        .text-red:hover {
          background: rgba(239, 68, 68, 0.05);
          color: var(--error);
        }

        /* Sidebar Projects list */
        .projects-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          margin-bottom: 8px;
          padding: 0 12px;
        }
        .sidebar-section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--fg-tertiary);
          letter-spacing: 0.05em;
        }
        .projects-count {
          font-size: 10px;
          background: var(--bg-tertiary);
          color: var(--fg-secondary);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
        .sidebar-projects-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 12px;
        }
        .no-projects-text {
          font-size: 11px;
          color: var(--fg-tertiary);
          padding: 6px 12px;
          font-style: italic;
        }
        .project-link {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          color: var(--fg-secondary);
          font-size: 13px;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .project-link:hover {
          background: var(--bg-tertiary);
          color: var(--fg-primary);
        }
        .project-link.active {
          background: rgba(255, 255, 255, 0.02);
          color: var(--fg-primary);
          font-weight: 600;
        }
        .project-bullet {
          font-size: 8px;
          margin-right: 10px;
          color: var(--fg-tertiary);
          flex-shrink: 0;
        }
        .project-bullet.favorite {
          color: var(--warning);
        }
        .project-link-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Sidebar User Footer */
        .sidebar-footer {
          margin-top: auto;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }
        .footer-profile-link {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .footer-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
        }
        .footer-user-details {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .footer-username {
          font-size: 12px;
          font-weight: 600;
          color: var(--fg-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .footer-useremail {
          font-size: 10px;
          color: var(--fg-tertiary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Mobile Overlay */
        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 98;
          backdrop-filter: blur(4px);
        }

        /* Main Content Container */
        .main-panel {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        /* Desktop Header Layout */
        .desktop-header {
          height: 56px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          flex-shrink: 0;
        }
        .crumb-active {
          font-size: 13px;
          font-weight: 600;
          color: var(--fg-primary);
        }
        .header-search-bar {
          width: 240px;
          padding: 6px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 12px;
          color: var(--fg-tertiary);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .header-search-bar kbd {
          font-size: 9px;
          background: var(--bg-tertiary);
          padding: 2px 4px;
          border-radius: 3px;
          border: 1px solid var(--border-color);
        }
        .header-actions-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-icon-btn {
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--fg-secondary);
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color var(--transition-fast);
        }
        .header-icon-btn:hover {
          background-color: var(--bg-tertiary);
          color: var(--fg-primary);
        }

        /* Page Content Area */
        .content-area {
          flex-grow: 1;
          overflow-y: auto;
          background: var(--bg-primary);
        }

        /* Screen sizing media queries */
        @media (max-width: 768px) {
          .desktop-header {
            display: none;
          }
          .mobile-header {
            display: flex;
          }
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
          .mobile-overlay {
            display: block;
          }
          .content-area {
            padding-top: 56px;
          }
          .close-menu-btn {
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            color: var(--fg-tertiary);
            font-size: 18px;
            cursor: pointer;
          }
        }
        @media (min-width: 769px) {
          .close-menu-btn {
            display: none;
          }
        }
      `}</style>
    </div>
   </RealtimeProvider>
  );
}
