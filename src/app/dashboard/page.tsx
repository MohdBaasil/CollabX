'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function DashboardPage() {
  const { activeWorkspace, user } = useAuth();
  const { addToast } = useToast();

  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter & Sort State
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'favorites' | 'archived'>('active');
  const [sortBy, setSortBy] = useState<'updated' | 'progress' | 'name'>('updated');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjStatus, setNewProjStatus] = useState('todo');
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = async () => {
    if (!activeWorkspace) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/dashboard/projects?workspaceId=${activeWorkspace.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load projects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [activeWorkspace]);

  // Handle starring a project
  const handleToggleFavorite = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/favorite`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.isFavorite ? 'Project added to favorites' : 'Project removed from favorites', 'success');
        
        // Update local state
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, isFavorite: data.isFavorite } : p))
        );
        
        // Notify sidebar
        window.dispatchEvent(new Event('collabspace-projects-updated'));
      }
    } catch (err) {
      addToast('Failed to update favorite status', 'error');
    }
  };

  // Handle creating a project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) {
      addToast('Project name is required', 'warning');
      return;
    }
    if (!activeWorkspace) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/dashboard/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjName,
          description: newProjDesc,
          status: newProjStatus,
          workspaceId: activeWorkspace.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('Project created successfully!', 'success');
        setIsModalOpen(false);
        setNewProjName('');
        setNewProjDesc('');
        setNewProjStatus('todo');
        
        // Reload project lists
        await fetchProjects();
        
        // Notify sidebar list
        window.dispatchEvent(new Event('collabspace-projects-updated'));
      } else {
        addToast(data.error || 'Failed to create project', 'error');
      }
    } catch (err) {
      addToast('Network error occurred', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Filter & Sort computation
  const filteredProjects = projects
    .filter((p) => {
      // 1. Search Query Match
      const matchesSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

      // 2. Tab Filter Match
      if (filterTab === 'active') {
        return matchesSearch && p.status !== 'archived';
      }
      if (filterTab === 'favorites') {
        return matchesSearch && p.isFavorite && p.status !== 'archived';
      }
      if (filterTab === 'archived') {
        return matchesSearch && p.status === 'archived';
      }
      return matchesSearch; // 'all' tab includes archives as well
    })
    .sort((a, b) => {
      if (sortBy === 'progress') {
        return b.progress - a.progress;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // default: 'updated' sort by updatedAt descending
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'backlog': return 'Backlog';
      case 'todo': return 'Todo';
      case 'in_progress': return 'In Progress';
      case 'done': return 'Done';
      case 'archived': return 'Archived';
      default: return status;
    }
  };

  return (
    <div className="console-container animate-fade-in">
      {/* Console Header */}
      <header className="console-header">
        <div>
          <h1>Projects Console</h1>
          <p className="subtitle">Coordinate active workflows, monitor project progress, and manage task sheets.</p>
        </div>
        <button className="btn-primary glow-effect" onClick={() => setIsModalOpen(true)}>
          + Create Project
        </button>
      </header>

      {/* Filters Toolbar */}
      <div className="toolbar glass">
        {/* Search */}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name..."
          />
        </div>

        {/* Tab Filters */}
        <div className="filter-tabs">
          {(['active', 'favorites', 'all', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${filterTab === tab ? 'active' : ''}`}
              onClick={() => setFilterTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div className="sort-box">
          <span className="sort-label">Sort by:</span>
          <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} className="sort-select">
            <option value="updated">Last Updated</option>
            <option value="progress">Progress %</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Projects Grid List */}
      {isLoading ? (
        <div className="loading-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton card-skele"></div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state glass">
          <div className="empty-icon">📂</div>
          <h3>No projects found</h3>
          <p>Create a project or adjust your filters to display items.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((p) => {
            const formattedDate = new Date(p.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="project-card glass">
                <div className="card-top">
                  <span className={`status-pill ${p.status}`}>
                    {getStatusText(p.status)}
                  </span>
                  <button
                    className={`fav-star-btn ${p.isFavorite ? 'active' : ''}`}
                    onClick={(e) => handleToggleFavorite(e, p.id)}
                    title={p.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    ★
                  </button>
                </div>

                <div className="card-middle">
                  <h3>{p.name}</h3>
                  <p className="desc">{p.description || 'No description provided.'}</p>
                </div>

                {/* Progress bar */}
                <div className="card-progress">
                  <div className="progress-label-row">
                    <span>Progress</span>
                    <span className="progress-val">{p.progress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${p.progress}%` }}
                    ></div>
                  </div>
                  <span className="task-count">{p.taskCount} tasks logged</span>
                </div>

                <div className="card-footer">
                  <div className="member-avatars">
                    {p.members.map((m: any) => {
                      const avatar = m.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.user?.name || m.user?.email || 'U')}`;
                      return (
                        <img
                          key={m.id}
                          src={avatar}
                          alt="Avatar"
                          title={`${m.user?.name || m.user?.email} (${m.role})`}
                          className="member-avatar"
                        />
                      );
                    })}
                  </div>
                  <span className="update-time">Updated {formattedDate}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Project Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card glass animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateProject} className="modal-form">
              <div className="input-group">
                <label htmlFor="p-name">Project Name</label>
                <input
                  type="text"
                  id="p-name"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. AI Coprocessor Setup"
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="input-group">
                <label htmlFor="p-desc">Description</label>
                <textarea
                  id="p-desc"
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Describe project deliverables..."
                  disabled={isCreating}
                  rows={3}
                />
              </div>

              <div className="input-group">
                <label htmlFor="p-status">Initial Status</label>
                <select
                  id="p-status"
                  value={newProjStatus}
                  onChange={(e) => setNewProjStatus(e.target.value)}
                  disabled={isCreating}
                  className="select-input"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Completed</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary glow-effect"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating project...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .console-container {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .console-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .console-header h1 {
          font-size: 28px;
          font-weight: 800;
          color: var(--fg-primary);
          margin-bottom: 6px;
        }
        .subtitle {
          font-size: 14px;
          color: var(--fg-secondary);
        }

        /* Button */
        .btn-primary {
          padding: 10px 20px;
          background: var(--primary);
          border: none;
          color: white;
          font-size: 14px;
          font-weight: 600;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .btn-primary:hover {
          background: var(--primary-hover);
        }

        /* Toolbar */
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-radius: var(--radius-md);
          gap: 16px;
          flex-wrap: wrap;
        }
        .search-box {
          display: flex;
          align-items: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 6px 12px;
          flex-grow: 1;
          max-width: 320px;
        }
        .search-icon {
          font-size: 14px;
          margin-right: 8px;
        }
        .search-box input {
          background: none;
          border: none;
          color: var(--fg-primary);
          font-size: 13px;
          outline: none;
          width: 100%;
        }
        
        .filter-tabs {
          display: flex;
          background: var(--bg-secondary);
          padding: 4px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }
        .tab-btn {
          border: none;
          background: none;
          color: var(--fg-secondary);
          font-size: 13px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .tab-btn.active {
          background: var(--bg-tertiary);
          color: var(--fg-primary);
          font-weight: 600;
        }

        .sort-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sort-label {
          font-size: 12px;
          color: var(--fg-tertiary);
          font-weight: 600;
        }
        .sort-select {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--fg-primary);
          font-size: 13px;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          outline: none;
        }

        /* Project card lists */
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }
        .loading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }
        .card-skele {
          height: 220px;
          border-radius: var(--radius-lg);
        }

        .project-card {
          padding: 24px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: transform 0.2s, border-color var(--transition-fast);
        }
        .project-card:hover {
          transform: translateY(-3px);
          border-color: var(--border-hover);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .status-pill {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .status-pill.backlog {
          background: rgba(113, 113, 122, 0.08);
          color: var(--fg-secondary);
          border: 1px solid rgba(113, 113, 122, 0.15);
        }
        .status-pill.todo {
          background: rgba(59, 130, 246, 0.08);
          color: var(--info);
          border: 1px solid rgba(59, 130, 246, 0.15);
        }
        .status-pill.in_progress {
          background: rgba(99, 102, 241, 0.08);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.15);
        }
        .status-pill.done {
          background: rgba(16, 185, 129, 0.08);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.15);
        }
        .status-pill.archived {
          background: rgba(239, 68, 68, 0.08);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.15);
        }

        .fav-star-btn {
          border: none;
          background: none;
          color: var(--fg-tertiary);
          font-size: 18px;
          cursor: pointer;
          transition: color var(--transition-fast), transform var(--transition-fast);
        }
        .fav-star-btn:hover {
          transform: scale(1.15);
          color: var(--warning);
        }
        .fav-star-btn.active {
          color: var(--warning);
        }

        .card-middle h3 {
          font-size: 17px;
          color: var(--fg-primary);
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-middle .desc {
          font-size: 13px;
          color: var(--fg-secondary);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 38px;
        }

        /* Card Progress */
        .card-progress {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .progress-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--fg-secondary);
          font-weight: 600;
        }
        .progress-val {
          color: var(--fg-primary);
        }
        .progress-bar-bg {
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary) 0%, #818cf8 100%);
          border-radius: 3px;
          transition: width 0.4s ease-out;
        }
        .task-count {
          font-size: 11px;
          color: var(--fg-tertiary);
        }

        /* Card Footer */
        .card-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }
        .member-avatars {
          display: flex;
          align-items: center;
        }
        .member-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid var(--bg-secondary);
          margin-left: -6px;
          background: var(--bg-tertiary);
        }
        .member-avatar:first-child {
          margin-left: 0;
        }
        .update-time {
          font-size: 11px;
          color: var(--fg-tertiary);
        }

        .empty-state {
          padding: 60px;
          border-radius: var(--radius-lg);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .empty-icon {
          font-size: 48px;
        }
        .empty-state h3 {
          font-size: 18px;
          color: var(--fg-primary);
        }
        .empty-state p {
          font-size: 14px;
          color: var(--fg-secondary);
          max-width: 320px;
        }

        /* Modal Overlay styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }
        .modal-card {
          width: 100%;
          max-width: 480px;
          border-radius: var(--radius-lg);
          padding: 32px;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h2 {
          font-size: 20px;
          color: var(--fg-primary);
        }
        .modal-close-btn {
          border: none;
          background: none;
          color: var(--fg-tertiary);
          font-size: 18px;
          cursor: pointer;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .modal-form label {
          font-size: 11px;
          font-weight: 700;
          color: var(--fg-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .modal-form input,
        .modal-form textarea,
        .modal-form select {
          padding: 10px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-primary);
          font-size: 14px;
          outline: none;
          width: 100%;
        }
        .modal-form input:focus,
        .modal-form textarea:focus,
        .modal-form select:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 12px;
        }
        .btn-cancel {
          padding: 10px 20px;
          background: none;
          border: 1px solid var(--border-color);
          color: var(--fg-secondary);
          font-size: 14px;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .btn-cancel:hover {
          background: var(--bg-secondary);
        }

        @media (max-width: 768px) {
          .console-container {
            padding: 20px;
          }
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .search-box {
            max-width: none;
          }
          .filter-tabs {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}
