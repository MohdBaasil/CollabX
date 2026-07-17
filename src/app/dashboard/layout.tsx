'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { RealtimeProvider } from '@/context/RealtimeContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, workspaces, activeWorkspace, setActiveWorkspace, logout, isLoading } = useAuth();
  const { addToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Handle pending project joins after login/registration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pendingJoinProjectId = localStorage.getItem('collabspace-pending-join');
      if (pendingJoinProjectId) {
        // Remove it first to prevent redirect loops
        localStorage.removeItem('collabspace-pending-join');
        router.push(`/dashboard/projects/${pendingJoinProjectId}/join`);
      }
    }
  }, [router]);

  // Sync sidebar projects list
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

  const handleSidebarTabClick = (tabKey: string) => {
    // If we are currently inside a project, we can update the tab using event dispatch
    const isInProject = pathname?.startsWith('/dashboard/projects/');
    if (isInProject) {
      window.dispatchEvent(new CustomEvent('collabspace-set-tab', { detail: tabKey }));
      setIsMobileOpen(false);
    } else {
      // If we are not inside a project, redirect to dashboard and show a toast
      router.push('/dashboard');
      setTimeout(() => {
        addToast(`Select any project from the grid to view its ${tabKey} tab`, 'info');
      }, 300);
    }
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
            border: 3px solid rgba(79, 70, 229, 0.2);
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
        <aside className={`sidebar glass ${isMobileOpen ? 'mobile-open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          
          {/* Collapse/Expand toggle icon */}
          <button 
            className="sidebar-collapse-toggle" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? '➡️' : '⬅️'}
          </button>

          <button className="close-menu-btn" onClick={() => setIsMobileOpen(false)}>✕</button>

          {/* Logo Brand Header */}
          <div className="logo-brand">
            <span className="brand-icon">⚡</span>
            <span className="brand-text font-bold">CollabSpace</span>
          </div>

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
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Home</span>
            </Link>

            <button 
              className="nav-link btn-sidebar-action"
              onClick={() => handleSidebarTabClick('overview')}
            >
              <span className="nav-icon">📁</span>
              <span className="nav-text">Projects</span>
            </button>

            <button 
              className="nav-link btn-sidebar-action"
              onClick={() => handleSidebarTabClick('list')}
            >
              <span className="nav-icon">✅</span>
              <span className="nav-text">My Tasks</span>
            </button>

            <button 
              className="nav-link btn-sidebar-action"
              onClick={() => handleSidebarTabClick('calendar')}
            >
              <span className="nav-icon">📅</span>
              <span className="nav-text">Calendar</span>
            </button>

            <button 
              className="nav-link btn-sidebar-action"
              onClick={() => handleSidebarTabClick('chat')}
            >
              <span className="nav-icon">💬</span>
              <span className="nav-text">Team Chat</span>
            </button>

            <button 
              className="nav-link btn-sidebar-action"
              onClick={() => handleSidebarTabClick('files')}
            >
              <span className="nav-icon">📂</span>
              <span className="nav-text">Files</span>
            </button>

            <button 
              className="nav-link btn-sidebar-action"
              onClick={() => handleSidebarTabClick('analytics')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Analytics</span>
            </button>

            <button 
              className="nav-link btn-sidebar-action"
              onClick={() => handleSidebarTabClick('coprocessor')}
            >
              <span className="nav-icon">🤖</span>
              <span className="nav-text">AI Assistant</span>
            </button>

            <Link 
              href="/dashboard/profile" 
              className={`nav-link ${pathname === '/dashboard/profile' ? 'active' : ''}`}
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Settings</span>
            </Link>

            {/* Dynamic Projects Sub-list */}
            <div className="projects-header-row">
              <span className="sidebar-section-title">Starred</span>
              <span className="projects-count">{projects.filter(p => p.isFavorite).length}</span>
            </div>
            <div className="sidebar-projects-list">
              {projects.filter(p => p.isFavorite).map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.id}`}
                  className={`project-link ${pathname === `/dashboard/projects/${p.id}` ? 'active' : ''}`}
                  onClick={() => setIsMobileOpen(false)}
                  title={p.name}
                >
                  <span className="project-bullet favorite">●</span>
                  <span className="project-link-name">{p.name}</span>
                </Link>
              ))}
            </div>

            <div className="sidebar-divider"></div>

            <button 
              className="nav-link text-red"
              onClick={handleLogout}
            >
              <span className="nav-icon">🚪</span>
              <span className="nav-text">Sign Out</span>
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
                  ? 'Home Console' 
                  : pathname?.startsWith('/dashboard/projects/') 
                  ? 'Project Environment' 
                  : 'Profile Configurations'}
              </span>
            </div>

            <div className="header-search-bar" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' }))}>
              <span>🔍 Search workspace...</span> <kbd>⌘K</kbd>
            </div>

            <div className="header-actions-right">
              <button 
                className="header-icon-btn" 
                title="Notifications"
                onClick={() => addToast('No new notifications today', 'info')}
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
                  addToast(`Theme set to ${nextTheme}`, 'info');
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
            font-weight: 800;
            font-size: 15px;
            letter-spacing: -0.03em;
            color: var(--fg-primary);
          }
          .user-avatar-sm {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--bg-tertiary);
          }

          /* Sidebar Container */
          .sidebar {
            width: 240px;
            height: 100%;
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            padding: 16px;
            background: var(--bg-secondary);
            z-index: 100;
            transition: width var(--transition-normal), transform var(--transition-normal);
            position: relative;
          }
          
          .sidebar-collapse-toggle {
            position: absolute;
            top: 18px;
            right: -12px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 1px solid var(--border-color);
            background: var(--bg-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            z-index: 110;
            box-shadow: var(--shadow-sm);
            color: var(--fg-primary);
          }
          .sidebar-collapse-toggle:hover {
            background: var(--bg-tertiary);
          }

          /* Collapsed state styling */
          .sidebar.collapsed {
            width: 72px;
            padding: 16px 8px;
          }
          .sidebar.collapsed .brand-text,
          .sidebar.collapsed .ws-info,
          .sidebar.collapsed .ws-chevron,
          .sidebar.collapsed .nav-text,
          .sidebar.collapsed .projects-header-row,
          .sidebar.collapsed .sidebar-projects-list,
          .sidebar.collapsed .footer-user-details {
            display: none !important;
          }
          .sidebar.collapsed .logo-brand {
            justify-content: center;
          }
          .sidebar.collapsed .ws-selector-btn {
            justify-content: center;
            padding: 4px;
          }
          .sidebar.collapsed .ws-logo-avatar {
            margin-right: 0;
          }
          .sidebar.collapsed .nav-link {
            justify-content: center;
            padding: 10px;
          }
          .sidebar.collapsed .nav-icon {
            margin-right: 0;
            font-size: 18px;
          }

          .logo-brand {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
            padding-left: 8px;
            font-size: 16px;
            color: var(--fg-primary);
          }
          .brand-icon {
            font-size: 20px;
          }
          .brand-text {
            font-weight: 800;
            letter-spacing: -0.04em;
          }

          /* Workspace selector styling */
          .ws-selector-container {
            position: relative;
            margin-bottom: 20px;
          }
          .ws-selector-btn {
            width: 100%;
            display: flex;
            align-items: center;
            padding: 6px 8px;
            background: none;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            color: var(--fg-primary);
            cursor: pointer;
            transition: background var(--transition-fast);
            text-align: left;
          }
          .ws-selector-btn:hover {
            background: var(--bg-tertiary);
          }
          .ws-logo-avatar {
            width: 24px;
            height: 24px;
            background: var(--primary);
            color: white;
            font-weight: bold;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            margin-right: 8px;
            flex-shrink: 0;
          }
          .ws-info {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            overflow: hidden;
          }
          .ws-name {
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .ws-plan {
            font-size: 9px;
            color: var(--fg-tertiary);
          }
          .ws-chevron {
            font-size: 8px;
            color: var(--fg-tertiary);
            margin-left: 4px;
          }

          /* WS Dropdown Menu */
          .ws-dropdown {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            padding: 6px;
            z-index: 101;
            border: 1px solid var(--border-color);
            background: var(--bg-secondary);
          }
          .dropdown-title {
            font-size: 9px;
            text-transform: uppercase;
            color: var(--fg-tertiary);
            font-weight: 700;
            letter-spacing: 0.05em;
            padding: 4px;
            margin-bottom: 2px;
          }
          .dropdown-item {
            width: 100%;
            display: flex;
            align-items: center;
            padding: 6px;
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
            background: rgba(79, 70, 229, 0.08);
            color: var(--primary);
            font-weight: 600;
          }
          .item-avatar {
            width: 18px;
            height: 18px;
            border-radius: 3px;
            background: var(--border-color);
            color: var(--fg-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            margin-right: 6px;
          }
          .dropdown-item.active .item-avatar {
            background: var(--primary);
            color: white;
          }
          .item-name {
            font-size: 12px;
          }
          .dropdown-divider {
            height: 1px;
            background: var(--border-color);
            margin: 4px 0;
          }
          .dropdown-action-btn {
            width: 100%;
            background: none;
            border: none;
            padding: 6px;
            font-size: 11px;
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
            gap: 2px;
            flex-grow: 1;
            overflow-y: auto;
          }
          .nav-link {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: var(--radius-sm);
            color: var(--fg-secondary);
            font-size: 13px;
            font-weight: 500;
            transition: background var(--transition-fast), color var(--transition-fast);
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            width: 100%;
          }
          .nav-link:hover {
            background: var(--bg-tertiary);
            color: var(--fg-primary);
          }
          .nav-link.active {
            background: rgba(79, 70, 229, 0.08);
            color: var(--primary);
            font-weight: 600;
          }
          .nav-icon {
            font-size: 15px;
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
            margin-top: 16px;
            margin-bottom: 6px;
            padding: 0 8px;
          }
          .sidebar-section-title {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--fg-tertiary);
            letter-spacing: 0.05em;
          }
          .projects-count {
            font-size: 9px;
            background: var(--bg-tertiary);
            color: var(--fg-secondary);
            padding: 1px 4px;
            border-radius: 3px;
            font-weight: 600;
          }
          .sidebar-projects-list {
            display: flex;
            flex-direction: column;
            gap: 1px;
            max-height: 140px;
            overflow-y: auto;
            margin-bottom: 8px;
          }
          .project-link {
            display: flex;
            align-items: center;
            padding: 6px 12px;
            border-radius: var(--radius-sm);
            color: var(--fg-secondary);
            font-size: 12px;
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
            font-size: 6px;
            margin-right: 8px;
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
            width: 28px;
            height: 28px;
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
            font-size: 11px;
            font-weight: 700;
            color: var(--fg-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .footer-useremail {
            font-size: 9px;
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
            background: rgba(0, 0, 0, 0.4);
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
            height: 52px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            flex-shrink: 0;
          }
          .crumb-active {
            font-size: 12px;
            font-weight: 700;
            color: var(--fg-primary);
            letter-spacing: -0.02em;
          }
          .header-search-bar {
            width: 220px;
            padding: 5px 10px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            font-size: 11px;
            color: var(--fg-tertiary);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: border-color var(--transition-fast);
          }
          .header-search-bar:hover {
            border-color: var(--border-hover);
          }
          .header-search-bar kbd {
            font-size: 9px;
            background: var(--bg-tertiary);
            padding: 1px 4px;
            border-radius: 3px;
            border: 1px solid var(--border-color);
          }
          .header-actions-right {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .header-icon-btn {
            width: 28px;
            height: 28px;
            background: none;
            border: none;
            border-radius: var(--radius-sm);
            color: var(--fg-secondary);
            font-size: 12px;
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
