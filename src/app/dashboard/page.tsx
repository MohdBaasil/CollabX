'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function DashboardPage() {
  const { activeWorkspace, user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Project Creation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjStatus, setNewProjStatus] = useState('todo');
  const [isCreating, setIsCreating] = useState(false);

  const fetchWorkspaceData = async () => {
    if (!activeWorkspace) return;
    try {
      setIsLoading(true);
      
      // 1. Fetch active workspace projects
      const projRes = await fetch(`/api/dashboard/projects?workspaceId=${activeWorkspace.id}`);
      const projectsList = await projRes.json();
      if (Array.isArray(projectsList)) {
        setProjects(projectsList);

        // 2. Fetch tasks across all projects in parallel
        const tasksPromises = projectsList.map((p) =>
          fetch(`/api/dashboard/projects/${p.id}/tasks`).then((res) => res.json())
        );
        const tasksResults = await Promise.all(tasksPromises);
        const mergedTasks = tasksResults.flat().filter((t) => t && t.id);
        setAllTasks(mergedTasks);

        // 3. Fetch activity logs across projects in parallel
        const logsPromises = projectsList.map((p) =>
          fetch(`/api/dashboard/projects/${p.id}/history`).then((res) => res.json())
        );
        const logsResults = await Promise.all(logsPromises);
        const mergedLogs = logsResults
          .flat()
          .filter((l) => l && l.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentLogs(mergedLogs.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load workspace updates', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [activeWorkspace]);

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
        
        await fetchWorkspaceData();
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

  const handleToggleFavorite = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/favorite`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.isFavorite ? 'Star added' : 'Star removed', 'success');
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, isFavorite: data.isFavorite } : p))
        );
        window.dispatchEvent(new Event('collabspace-projects-updated'));
      }
    } catch (err) {
      addToast('Failed to update favorite status', 'error');
    }
  };

  // Get current greeting based on time of day
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Filter urgent upcoming deadlines
  const upcomingDeadlines = allTasks
    .filter((t) => t.dueDate && t.status !== 'done')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  // Filter My tasks assigned or general backlog items
  const myTasks = allTasks
    .filter((t) => t.status !== 'done')
    .slice(0, 5);

  // Extract unique active collaborators
  const activeCollaborators = Array.from(
    new Map<string, any>(
      recentLogs
        .map((log) => [log.user?.id, log.user] as [string, any])
        .filter(([id, u]) => !!id && !!u)
    ).values()
  ).slice(0, 6);

  return (
    <div className="home-dashboard animate-fade-in" aria-label="Workspace Console Home">
      
      {/* 1. Header greeting */}
      <header className="dashboard-welcome">
        <div className="welcome-left">
          <span className="date-badge">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <h1>{getGreeting()}, {user?.name || user?.email.split('@')[0]}</h1>
          <p className="welcome-subtitle">Here is a summary of active workflows in {activeWorkspace?.name || 'Workspace'}.</p>
        </div>
        <div className="welcome-right">
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            ＋ Create Project
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="skeleton-grid">
          <div className="skeleton card-skele h-120"></div>
          <div className="skeleton card-skele h-240"></div>
          <div className="skeleton card-skele h-240"></div>
        </div>
      ) : (
        <div className="dashboard-main-grid">
          
          {/* LEFT COLUMN: Main metrics & details lists */}
          <div className="dashboard-col-left">
            
            {/* stats overview widgets */}
            <section className="stats-row">
              <div className="stat-widget glass">
                <span className="widget-icon">📁</span>
                <div className="widget-body">
                  <strong>{projects.length}</strong>
                  <span className="widget-label">Active Projects</span>
                </div>
              </div>

              <div className="stat-widget glass">
                <span className="widget-icon">✅</span>
                <div className="widget-body">
                  <strong>{allTasks.filter((t) => t.status !== 'done').length}</strong>
                  <span className="widget-label">Pending Tasks</span>
                </div>
              </div>

              <div className="stat-widget glass">
                <span className="widget-icon">🎉</span>
                <div className="widget-body">
                  <strong>{allTasks.filter((t) => t.status === 'done').length}</strong>
                  <span className="widget-label">Completed Cards</span>
                </div>
              </div>

              <div className="stat-widget glass">
                <span className="widget-icon">📈</span>
                <div className="widget-body">
                  <strong>
                    {projects.length > 0
                      ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)
                      : 0}%
                  </strong>
                  <span className="widget-label">Average Progress</span>
                </div>
              </div>
            </section>

            {/* Recently viewed projects section */}
            <section className="dashboard-section glass">
              <h2 className="section-title">📂 Active Projects</h2>
              {projects.length === 0 ? (
                <div className="empty-state">
                  <span>📂</span>
                  <p>No active projects in this workspace yet.</p>
                  <button className="btn-primary" onClick={() => setIsModalOpen(true)}>Create Project</button>
                </div>
              ) : (
                <div className="projects-minimal-grid">
                  {projects.map((proj) => (
                    <Link key={proj.id} href={`/dashboard/projects/${proj.id}`} className="mini-project-card glass-hover">
                      <div className="proj-card-header">
                        <span className="proj-icon">📁</span>
                        <div className="proj-names">
                          <h3>{proj.name}</h3>
                          <span className="proj-task-count">{proj.taskCount} tasks logged</span>
                        </div>
                        <button 
                          className={`star-action-btn ${proj.isFavorite ? 'active' : ''}`}
                          onClick={(e) => handleToggleFavorite(e, proj.id)}
                        >
                          ★
                        </button>
                      </div>
                      <p className="proj-card-desc">{proj.description || 'No description added.'}</p>
                      
                      <div className="proj-card-footer">
                        <div className="prog-container">
                          <span>{proj.progress}%</span>
                          <div className="prog-bg">
                            <div className="prog-fill" style={{ width: `${proj.progress}%` }}></div>
                          </div>
                        </div>
                        <span className="status-indicator-badge">{proj.status.toUpperCase()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* My pending tasks */}
            <section className="dashboard-section glass">
              <h2 className="section-title">✅ My Active Task Sheet</h2>
              {myTasks.length === 0 ? (
                <div className="empty-state">
                  <span>✨</span>
                  <p>All tasks completed! You are completely caught up.</p>
                </div>
              ) : (
                <div className="task-minimal-list">
                  {myTasks.map((t) => (
                    <div key={t.id} className="task-row-item">
                      <span className={`prio-dot ${t.priority}`}>●</span>
                      <strong className="task-title">{t.title}</strong>
                      <span className={`status-badge-inline ${t.status}`}>{t.status.replace('_', ' ')}</span>
                      {t.dueDate && (
                        <span className="task-due">📅 {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>

          {/* RIGHT COLUMN: Quick links, AI recommendation advisory, Collaborators */}
          <div className="dashboard-col-right">
            
            {/* Quick Actions Shortcuts */}
            <section className="dashboard-section glass">
              <h2 className="section-title">⚡ Quick Actions</h2>
              <div className="quick-actions-box">
                <button className="btn-action-shortcut" onClick={() => setIsModalOpen(true)}>
                  📁 New Project Setup
                </button>
                <button className="btn-action-shortcut" onClick={() => addToast('Open the projects view to access the floating AI assistant panel', 'info')}>
                  🤖 Consult AI Coprocessor
                </button>
                <button className="btn-action-shortcut" onClick={() => router.push('/dashboard/profile')}>
                  ⚙️ Profile Settings
                </button>
              </div>
            </section>

            {/* AI Recommendations panel */}
            <section className="dashboard-section glass ai-advisory-widget">
              <h2 className="section-title">🧠 AI Executive Advisories</h2>
              <div className="ai-report-bullets">
                <ul>
                  {projects.some((p) => p.progress < 25) && (
                    <li>⚠️ **Project progress warning**: Some projects are under 25% checklist completions. Consider checking backlog dependencies.</li>
                  )}
                  {allTasks.some((t) => t.priority === 'urgent' && t.status !== 'done') && (
                    <li>🔥 **Urgent deadlocks**: Urgent tasks are pending. Review active sprint boards.</li>
                  )}
                  <li>💬 **Team activity check**: CollabX team channel has logged active collaboration check-ins recently.</li>
                  <li>💡 **Suggestion**: Break down large milestones into checklists to improve project health indices.</li>
                </ul>
              </div>
            </section>

            {/* Upcoming deadlines */}
            <section className="dashboard-section glass">
              <h2 className="section-title">⌛ Upcoming Deadlines</h2>
              {upcomingDeadlines.length === 0 ? (
                <div className="empty-state-sm">No upcoming deadlines logged.</div>
              ) : (
                <div className="deadlines-list">
                  {upcomingDeadlines.map((t) => (
                    <div key={t.id} className="deadline-item-card">
                      <div className="deadline-left">
                        <strong>{t.title}</strong>
                        <span className={`prio-text-sm ${t.priority}`}>{t.priority.toUpperCase()}</span>
                      </div>
                      <span className="deadline-date-alert overdue">
                        {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent activity timeline overview */}
            <section className="dashboard-section glass">
              <h2 className="section-title">⏱️ Recent Audits</h2>
              {recentLogs.length === 0 ? (
                <div className="empty-state-sm">No activity logged in this workspace workspace.</div>
              ) : (
                <div className="mini-timeline-stack">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="mini-timeline-card">
                      <strong>{log.user?.name || log.user?.email.split('@')[0]}</strong>
                      <span> {log.action}d {log.fieldName || 'item'}</span>
                      <p className="time">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent collaborators */}
            <section className="dashboard-section glass">
              <h2 className="section-title">👥 Team Activity Leader</h2>
              {activeCollaborators.length === 0 ? (
                <div className="empty-state-sm">No collaborators active today.</div>
              ) : (
                <div className="collaborators-faces-row">
                  {activeCollaborators.map((c: any) => {
                    const avatar = c.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name || c.email)}`;
                    return (
                      <img
                        key={c.id}
                        src={avatar}
                        alt="Avatar"
                        title={c.name || c.email}
                        className="collaborator-face-circle"
                      />
                    );
                  })}
                </div>
              )}
            </section>

          </div>

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
                  className="btn-submit"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating Project...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .home-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .dashboard-welcome {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
        }
        .date-badge {
          font-size: 10px;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
          display: block;
        }
        .dashboard-welcome h1 {
          font-size: 26px;
          font-weight: 800;
          color: var(--fg-primary);
          letter-spacing: -0.03em;
        }
        .welcome-subtitle {
          font-size: 13px;
          color: var(--fg-secondary);
          margin-top: 4px;
        }

        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 8fr 4fr;
          gap: 32px;
          align-items: start;
        }
        .dashboard-col-left,
        .dashboard-col-right {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Stats Row widgets */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }
        .stat-widget {
          padding: 16px 20px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
        }
        .widget-icon {
          font-size: 22px;
        }
        .widget-body {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .widget-body strong {
          font-size: 18px;
          color: var(--fg-primary);
          font-weight: 800;
        }
        .widget-label {
          font-size: 11px;
          color: var(--fg-tertiary);
          font-weight: 600;
        }

        /* General dashboard section box */
        .dashboard-section {
          padding: 24px;
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
        }
        .section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--fg-tertiary);
          letter-spacing: 0.05em;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }

        .projects-minimal-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .mini-project-card {
          padding: 16px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          transition: border-color var(--transition-fast), transform var(--transition-fast);
        }
        .mini-project-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-1px);
        }
        .proj-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .proj-icon {
          font-size: 18px;
        }
        .proj-names {
          flex-grow: 1;
        }
        .proj-names h3 {
          font-size: 13px;
          font-weight: 700;
          color: var(--fg-primary);
        }
        .proj-task-count {
          font-size: 10px;
          color: var(--fg-tertiary);
        }
        .star-action-btn {
          background: none;
          border: none;
          color: var(--fg-tertiary);
          font-size: 14px;
          cursor: pointer;
        }
        .star-action-btn.active {
          color: var(--warning);
        }
        .proj-card-desc {
          font-size: 12px;
          color: var(--fg-secondary);
          line-height: 1.4;
        }

        .proj-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
        }
        .prog-container {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          color: var(--fg-secondary);
          flex-grow: 1;
          max-width: 180px;
        }
        .prog-bg {
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: 2px;
          flex-grow: 1;
          overflow: hidden;
        }
        .prog-fill {
          height: 100%;
          background: var(--primary);
        }
        .status-indicator-badge {
          font-size: 9px;
          font-weight: 700;
          color: var(--fg-tertiary);
          background: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: 3px;
        }

        /* My task row items list */
        .task-minimal-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .task-row-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 12px;
        }
        .prio-dot {
          font-size: 10px;
        }
        .prio-dot.low { color: var(--fg-tertiary); }
        .prio-dot.medium { color: var(--info); }
        .prio-dot.high { color: var(--warning); }
        .prio-dot.urgent { color: var(--error); }

        .task-title {
          flex-grow: 1;
          color: var(--fg-primary);
        }
        .status-badge-inline {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 1px 4px;
          border-radius: 3px;
          background: var(--bg-tertiary);
          color: var(--fg-secondary);
        }
        .task-due {
          font-size: 11px;
          color: var(--fg-tertiary);
        }

        /* Quick actions styling */
        .quick-actions-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .btn-action-shortcut {
          width: 100%;
          text-align: left;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--fg-secondary);
          font-size: 12px;
          font-weight: 600;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .btn-action-shortcut:hover {
          background-color: var(--bg-tertiary);
          color: var(--fg-primary);
        }

        /* AI report styling */
        .ai-advisory-widget {
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(129, 140, 248, 0.04) 100%);
          border-color: rgba(79, 70, 229, 0.15);
        }
        .ai-report-bullets ul {
          padding-left: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ai-report-bullets li {
          font-size: 12px;
          color: var(--fg-secondary);
          line-height: 1.5;
        }
        .ai-report-bullets :global(strong) {
          color: var(--fg-primary);
        }

        /* Deadlines list */
        .deadlines-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .deadline-item-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }
        .deadline-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .deadline-left strong {
          font-size: 12px;
          color: var(--fg-primary);
        }
        .prio-text-sm {
          font-size: 8px;
          font-weight: 800;
        }
        .prio-text-sm.low { color: var(--fg-tertiary); }
        .prio-text-sm.medium { color: var(--info); }
        .prio-text-sm.high { color: var(--warning); }
        .prio-text-sm.urgent { color: var(--error); }
        .deadline-date-alert {
          font-size: 11px;
          font-weight: 700;
        }
        .deadline-date-alert.overdue {
          color: var(--error);
        }

        /* Mini Timeline stacks */
        .mini-timeline-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mini-timeline-card {
          font-size: 12px;
          color: var(--fg-secondary);
        }
        .mini-timeline-card strong {
          color: var(--fg-primary);
        }
        .mini-timeline-card .time {
          font-size: 9px;
          color: var(--fg-tertiary);
          margin-top: 1px;
        }

        /* Collaborators row faces */
        .collaborators-faces-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .collaborator-face-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
        }

        /* Empty states */
        .empty-state {
          text-align: center;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--fg-tertiary);
          font-size: 13px;
        }
        .empty-state span {
          font-size: 32px;
        }
        .empty-state-sm {
          font-size: 11px;
          color: var(--fg-tertiary);
          font-style: italic;
        }

        /* Project Creation Modal overlay styling */
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
          z-index: 2000;
        }
        .modal-card {
          width: 100%;
          max-width: 460px;
          padding: 28px;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h2 {
          font-size: 16px;
          font-weight: 800;
          color: var(--fg-primary);
        }
        .modal-close-btn {
          border: none;
          background: none;
          color: var(--fg-tertiary);
          font-size: 16px;
          cursor: pointer;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .modal-form label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--fg-secondary);
          margin-bottom: 6px;
        }
        .modal-form input,
        .modal-form textarea,
        .select-input {
          width: 100%;
          padding: 10px 14px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-primary);
          font-size: 13px;
          outline: none;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }
        .btn-cancel {
          background: none;
          border: 1px solid var(--border-color);
          color: var(--fg-secondary);
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-submit {
          background: var(--primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .skeleton-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .h-120 { height: 120px; }
        .h-240 { height: 240px; }

        @media (max-width: 992px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
