'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useTheme } from '@/context/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Word-level LCS Diffing Algorithm
function computeWordDiff(oldText: string, newText: string) {
  const cleanOld = oldText || '';
  const cleanNew = newText || '';
  const oldWords = cleanOld.split(/(\s+)/);
  const newWords = cleanNew.split(/(\s+)/);
  
  const dp: number[][] = Array(oldWords.length + 1)
    .fill(0)
    .map(() => Array(newWords.length + 1).fill(0));
  
  for (let i = 1; i <= oldWords.length; i++) {
    for (let j = 1; j <= newWords.length; j++) {
      if (oldWords[i-1] === newWords[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  
  const diff: { value: string; type: 'added' | 'removed' | 'unchanged' }[] = [];
  let i = oldWords.length;
  let j = newWords.length;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i-1] === newWords[j-1]) {
      diff.unshift({ value: oldWords[i-1], type: 'unchanged' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      diff.unshift({ value: newWords[j-1], type: 'added' });
      j--;
    } else {
      diff.unshift({ value: oldWords[i-1], type: 'removed' });
      i--;
    }
  }
  
  return diff;
}

function ProjectWorkspaceContent() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { toggleTheme } = useTheme();
  
  const projectId = params.projectId as string;

  // Real-time synchronization context
  const {
    onlineUsers,
    typingUsers,
    editingTasks,
    connectionStatus,
    syncUpdate,
    triggerTyping,
    triggerEditing,
    
    sendChatMessage,
    sendChatTyping,
    sendChatReaction,
    sendChatRead
  } = useRealtime();

  // Root Project Data
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab View State: 'overview' | 'board' | 'list' | 'calendar' | 'timeline' | 'files' | 'chat' | 'analytics' | 'settings'
  const [viewTab, setViewTab] = useState<'overview' | 'board' | 'list' | 'calendar' | 'timeline' | 'files' | 'chat' | 'analytics' | 'settings'>('overview');

  // Search & Filters (List view)
  const [listSearch, setListSearch] = useState('');
  const [listPriorityFilter, setListPriorityFilter] = useState('all');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Task Drawer State
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  // Drawer sub-tabs: 'details' | 'discussion' | 'history'
  const [drawerSubTab, setDrawerSubTab] = useState<'details' | 'discussion' | 'history'>('details');

  // Task edit state inside drawer
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerDesc, setDrawerDesc] = useState('');
  const [drawerPriority, setDrawerPriority] = useState('medium');
  const [drawerStatus, setDrawerStatus] = useState('todo');
  const [drawerDueDate, setDrawerDueDate] = useState('');
  const [drawerEstimate, setDrawerEstimate] = useState<number | ''>('');
  
  // Custom Tag/Label inside drawer
  const [newTagInput, setNewTagInput] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // Subtask creation state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Project Settings Modal (now in Settings Tab)
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');

  // Task Quick Add on Kanban Board
  const [quickTaskTitle, setQuickTaskTitle] = useState<{ [key: string]: string }>({});

  // Dependency add state
  const [selectedDepTaskId, setSelectedDepTaskId] = useState('');

  // --- IMMUTABLE ACTIVITY LOGGING FEEDS STATES ---
  const [projectLogs, setProjectLogs] = useState<any[]>([]);
  const [taskLogs, setTaskLogs] = useState<any[]>([]);
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineActionFilter, setTimelineActionFilter] = useState('all');
  const [timelineUserFilter, setTimelineUserFilter] = useState('all');
  const [compareLog, setCompareLog] = useState<any>(null);

  // Undo Toast banner state
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const [undoMessage, setUndoMessage] = useState('');

  // --- COLLABORATIVE TEAM CHAT STATES ---
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatAttachments, setChatAttachments] = useState<any[]>([]);
  const [selectedParentMessage, setSelectedParentMessage] = useState<any>(null);
  const [threadInputText, setThreadInputText] = useState('');
  const [threadAttachments, setThreadAttachments] = useState<any[]>([]);
  const [isThreadDrawerOpen, setIsThreadDrawerOpen] = useState(false);
  const [activeChatTypingUsers, setActiveChatTypingUsers] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiSummaryOpen, setIsAiSummaryOpen] = useState(false);

  // --- AI ASSISTANT COPROCESSOR STATES (Now Floating Panel) ---
  const [isAiCoprocessorOpen, setIsAiCoprocessorOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ sender: 'user' | 'ai'; text: string; actionPayload?: any }[]>([
    { sender: 'ai', text: '### ✨ CollabSpace AI Assistant\n\nI understand this project context completely. Choose a shortcut or type a question below!' }
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);

  // --- FILE COLLABORATION AND ASSET STATES ---
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<any[]>([]); 
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isFileDrawerOpen, setIsFileDrawerOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileAiResult, setFileAiResult] = useState<string | null>(null);
  const [fileDrawerSubTab, setFileDrawerSubTab] = useState<'preview' | 'versions' | 'downloads' | 'ai'>('preview');

  // simulated PDF page controller
  const [pdfPage, setPdfPage] = useState(1);

  // --- ANALYTICS DASHBOARD STATES ---
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; type: 'ideal' | 'actual'; x: number; y: number; val: number } | null>(null);

  // --- MEMBER MANAGEMENT STATES ---
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [membersList, setMembersList] = useState<any[]>([]);

  // --- PRODUCTION STATE ---
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  const fetchProjectDetails = async () => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}`);
      if (!res.ok) {
        addToast('Project not found', 'error');
        router.push('/dashboard');
        return;
      }
      const data = await res.json();
      setProject(data);
      setProjName(data.name);
      setProjDesc(data.description || '');
    } catch (err) {
      addToast('Failed to load project details', 'error');
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/tasks`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`collabspace-tasks-cache-${projectId}`, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load project tasks', 'error');
    }
  };

  const fetchProjectLogs = async () => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/history`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjectLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTaskLogs = async (taskId: string) => {
    try {
      const res = await fetch(`/api/dashboard/tasks/${taskId}/history`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTaskLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/chat`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setChatMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFilesAndFolders = async () => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/files?folderId=${currentFolderId || ''}`);
      const data = await res.json();
      if (res.ok) {
        setFolders(data.folders || []);
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFileDetail = async (fileId: string) => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/files/${fileId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedFile(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalyticsData = async () => {
    setIsAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/analytics`);
      const data = await res.json();
      if (res.ok) {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const scrollToBottom = (type: 'chat' | 'thread' | 'ai' = 'chat') => {
    if (type === 'thread') {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'ai') {
      aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (viewTab === 'chat') {
      scrollToBottom('chat');
    }
  }, [viewTab, chatMessages]);

  useEffect(() => {
    if (isThreadDrawerOpen) {
      setTimeout(() => scrollToBottom('thread'), 100);
    }
  }, [isThreadDrawerOpen, selectedParentMessage]);

  useEffect(() => {
    if (isAiCoprocessorOpen) {
      setTimeout(() => scrollToBottom('ai'), 100);
    }
  }, [isAiCoprocessorOpen, aiMessages]);

  useEffect(() => {
    if (viewTab === 'files' || projectId) {
      fetchFilesAndFolders();
    }
  }, [currentFolderId, projectId, viewTab]);

  useEffect(() => {
    if (viewTab === 'analytics' || viewTab === 'overview') {
      fetchAnalyticsData();
    }
  }, [viewTab, projectId]);

  // Listen to Sidebar navigation tab switch events
  useEffect(() => {
    const handleSetTabEvent = (e: Event) => {
      const tabName = (e as CustomEvent).detail;
      if (tabName === 'coprocessor') {
        setIsAiCoprocessorOpen(true);
      } else if (['overview', 'board', 'list', 'calendar', 'timeline', 'files', 'chat', 'analytics', 'settings'].includes(tabName)) {
        setViewTab(tabName as any);
      }
    };
    window.addEventListener('collabspace-set-tab', handleSetTabEvent);
    return () => {
      window.removeEventListener('collabspace-set-tab', handleSetTabEvent);
    };
  }, []);

  // Offline support caching loader
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(window.navigator.onLine);
      const cached = localStorage.getItem(`collabspace-tasks-cache-${projectId}`);
      if (cached) {
        setTasks(JSON.parse(cached));
      }
    }
  }, [projectId]);

  // Offline status events listener
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      addToast('Back online! Synchronizing updates...', 'success');
      loadData();
    };
    const goOffline = () => {
      setIsOnline(false);
      addToast('Offline mode activated. Working with local cached indices.', 'warning');
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Keyboard Shortcuts & Global Esc Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }

      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsDrawerOpen(false);
        setIsFileDrawerOpen(false);
        setIsThreadDrawerOpen(false);
        setIsAiCoprocessorOpen(false);
        setIsAiSummaryOpen(false);
        if (selectedTask) {
          triggerEditing(selectedTask.id, false);
        }
      }

      // Check input elements focus
      const el = document.activeElement;
      const isInput = el && (
        el.tagName === 'INPUT' || 
        el.tagName === 'TEXTAREA' || 
        el.getAttribute('contenteditable') === 'true'
      );

      if (!isInput) {
        if (e.key === 'c') {
          e.preventDefault();
          const title = prompt('Shortcut Trigger: Enter task name:');
          if (title) handleCreateTask(title, 'todo');
        }
        if (e.key === 't') {
          e.preventDefault();
          toggleTheme();
          addToast('Theme toggled via shortcut', 'info');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTask]);

  // Real-time synchronization effect listeners
  useEffect(() => {
    const handleSyncEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.userId === user?.id) return;

      fetchTasks();
      fetchProjectDetails();
      fetchProjectLogs();
      fetchFilesAndFolders();

      if (viewTab === 'analytics' || viewTab === 'overview') {
        fetchAnalyticsData();
      }

      // If drawer is active, refresh the detail task fields
      if (selectedTask) {
        fetch(`/api/dashboard/projects/${projectId}/tasks`)
          .then((res) => res.json())
          .then((allTasks) => {
            if (Array.isArray(allTasks)) {
              const updated = allTasks.find((t) => t.id === selectedTask.id);
              if (updated) {
                setSelectedTask(updated);
                fetchTaskLogs(updated.id);
              }
            }
          });
      }

      if (selectedFile) {
        fetchFileDetail(selectedFile.id);
      }
    };

    const handlePresenceAnnouncement = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.user.userId === user?.id) return;

      addToast(
        `${detail.user.name || detail.user.email} has ${detail.type === 'join' ? 'joined' : 'left'} the workspace`,
        'info'
      );
    };

    // Chat custom listeners
    const handleNewChatMessage = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.message.userId === user?.id) return;
      fetchChats();

      // Auto-read receipts
      if (viewTab === 'chat') {
        handleMarkMessageRead(detail.message.id);
      }

      if (selectedParentMessage && selectedParentMessage.id === detail.message.parentMessageId) {
        setSelectedParentMessage((prev: any) => ({
          ...prev,
          replies: [...(prev.replies || []), detail.message]
        }));
      }
    };

    const handleChatTyping = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.userId === user?.id) return;
      
      setActiveChatTypingUsers((prev) => {
        if (detail.isTyping) {
          if (!prev.includes(detail.name)) return [...prev, detail.name];
        } else {
          return prev.filter(name => name !== detail.name);
        }
        return prev;
      });
    };

    const handleChatReaction = (e: Event) => {
      fetchChats();
    };

    const handleChatRead = (e: Event) => {
      fetchChats();
    };

    window.addEventListener('collabspace-sync-event', handleSyncEvent);
    window.addEventListener('collabspace-presence-announcement', handlePresenceAnnouncement);
    window.addEventListener('collabspace-chat-message', handleNewChatMessage);
    window.addEventListener('collabspace-chat-typing', handleChatTyping);
    window.addEventListener('collabspace-chat-reaction', handleChatReaction);
    window.addEventListener('collabspace-chat-read', handleChatRead);

    return () => {
      window.removeEventListener('collabspace-sync-event', handleSyncEvent);
      window.removeEventListener('collabspace-presence-announcement', handlePresenceAnnouncement);
      window.removeEventListener('collabspace-chat-message', handleNewChatMessage);
      window.removeEventListener('collabspace-chat-typing', handleChatTyping);
      window.removeEventListener('collabspace-chat-reaction', handleChatReaction);
      window.removeEventListener('collabspace-chat-read', handleChatRead);
    };
  }, [projectId, selectedTask, user, viewTab, selectedParentMessage, selectedFile]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchProjectDetails(), fetchTasks(), fetchProjectLogs(), fetchChats(), fetchFilesAndFolders()]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      loadData();
      fetchMembers();
    }
  }, [projectId]);

  // Mark all chat messages as read when viewing chat tab
  useEffect(() => {
    if (viewTab === 'chat' && chatMessages.length > 0) {
      chatMessages.forEach((msg) => {
        if (!msg.readBy.includes(user?.id)) {
          handleMarkMessageRead(msg.id);
        }
      });
    }
  }, [viewTab, chatMessages]);

  // Synchronize drawer fields when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      setDrawerTitle(selectedTask.title);
      setDrawerDesc(selectedTask.description || '');
      setDrawerPriority(selectedTask.priority);
      setDrawerStatus(selectedTask.status);
      setDrawerDueDate(selectedTask.dueDate ? selectedTask.dueDate.substring(0, 10) : '');
      setDrawerEstimate(selectedTask.timeEstimate || '');
      fetchTaskLogs(selectedTask.id);
    }
  }, [selectedTask]);

  // --- MEMBER MANAGEMENT HANDLERS ---
  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/members`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMembersList(data);
      }
    } catch (err) {
      console.error('Failed to fetch members', err);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      addToast('Please enter an email address', 'warning');
      return;
    }
    setIsInviting(true);
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`${inviteEmail} added as ${inviteRole}`, 'success');
        setInviteEmail('');
        setInviteRole('editor');
        fetchMembers();
        fetchProjectDetails();
        syncUpdate('member-added', { projectId });
      } else {
        addToast(data.error || 'Failed to invite member', 'error');
      }
    } catch (err) {
      addToast('Network error while inviting member', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from this project?`)) return;
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/members?userId=${memberUserId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`${memberEmail} removed from project`, 'success');
        fetchMembers();
        fetchProjectDetails();
        syncUpdate('member-removed', { projectId });
      } else {
        addToast(data.error || 'Failed to remove member', 'error');
      }
    } catch (err) {
      addToast('Network error while removing member', 'error');
    }
  };

  const handleUpdateMemberRole = async (memberUserId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberUserId, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`Role updated to ${newRole}`, 'success');
        fetchMembers();
        fetchProjectDetails();
      } else {
        addToast(data.error || 'Failed to update role', 'error');
      }
    } catch (err) {
      addToast('Network error while updating role', 'error');
    }
  };

  const handleToggleFavorite = async () => {
    if (!project) return;
    
    // Optimistic UI update
    setProject((prev: any) => ({ ...prev, isFavorite: !prev.isFavorite }));

    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/favorite`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setProject((prev: any) => ({ ...prev, isFavorite: data.isFavorite }));
        addToast(data.isFavorite ? 'Added project to favorites' : 'Removed from favorites', 'success');
        window.dispatchEvent(new Event('collabspace-projects-updated'));
        
        setUndoMessage('Star toggled');
        setShowUndoBanner(true);

        syncUpdate('project-fav-toggled', { projectId });
        fetchProjectLogs();
      } else {
        // Rollback
        setProject((prev: any) => ({ ...prev, isFavorite: !prev.isFavorite }));
        addToast('Favorite sync error', 'error');
      }
    } catch (err) {
      setProject((prev: any) => ({ ...prev, isFavorite: !prev.isFavorite }));
      addToast('Failed to toggle favorite', 'error');
    }
  };

  const handleProjectEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;

    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projName, description: projDesc }),
      });
      if (res.ok) {
        addToast('Project details updated', 'success');
        fetchProjectDetails();
        window.dispatchEvent(new Event('collabspace-projects-updated'));

        setUndoMessage('Project settings updated');
        setShowUndoBanner(true);

        syncUpdate('project-details-updated', { projectId });
        fetchProjectLogs();
      }
    } catch (err) {
      addToast('Failed to update project', 'error');
    }
  };

  const handleArchiveProject = async () => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (res.ok) {
        addToast('Project archived successfully', 'success');
        window.dispatchEvent(new Event('collabspace-projects-updated'));
        syncUpdate('project-archived', { projectId });
        router.push('/dashboard');
      }
    } catch (err) {
      addToast('Failed to archive project', 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to permanently delete this project? All associated tasks will be lost.')) return;
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Project deleted successfully', 'success');
        window.dispatchEvent(new Event('collabspace-projects-updated'));
        syncUpdate('project-deleted', { projectId });
        router.push('/dashboard');
      }
    } catch (err) {
      addToast('Failed to delete project', 'error');
    }
  };

  const handleDuplicateProject = async () => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        addToast('Project duplicated successfully!', 'success');
        window.dispatchEvent(new Event('collabspace-projects-updated'));
        syncUpdate('project-duplicated', { projectId });
        router.push(`/dashboard/projects/${data.id}`);
      }
    } catch (err) {
      addToast('Failed to duplicate project', 'error');
    }
  };

  // --- TASK ACTIONS ---
  const handleCreateTask = async (title: string, columnStatus: string, parentTaskId: string | null = null) => {
    if (!title.trim()) return;
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, status: columnStatus, parentTaskId }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Task created', 'success');
        fetchTasks();
        fetchProjectDetails();
        fetchProjectLogs();
        
        setUndoMessage('Task created');
        setShowUndoBanner(true);

        syncUpdate('task-created', { projectId });

        if (parentTaskId && selectedTask) {
          setSelectedTask((prev: any) => ({
            ...prev,
            subtasks: [...(prev.subtasks || []), data]
          }));
        }
      }
    } catch (err) {
      addToast('Failed to create task', 'error');
    }
  };

  const handleUpdateTaskField = async (taskId: string, fields: any) => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, ...fields }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchTasks();
        fetchProjectDetails();
        fetchProjectLogs();

        setUndoMessage('Task fields updated');
        setShowUndoBanner(true);
        
        syncUpdate('task-updated', { taskId, fields });

        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask((prev: any) => ({ ...prev, ...data }));
          fetchTaskLogs(taskId);
        }
      }
    } catch (err) {
      addToast('Failed to update task details', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/tasks?taskId=${taskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast('Task deleted', 'success');
        syncUpdate('task-deleted', { taskId });

        triggerEditing(taskId, false);
        setIsDrawerOpen(false);
        setSelectedTask(null);
        fetchTasks();
        fetchProjectDetails();
        fetchProjectLogs();
      }
    } catch (err) {
      addToast('Failed to delete task', 'error');
    }
  };

  // --- KANBAN BOARD DRAG-AND-DROP WITH OPTIMISTIC UI ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== status) {
      // Optimistic UI updates
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
      addToast(`Moved task to ${status.replace('_', ' ')}`, 'info');
      
      await handleUpdateTaskField(taskId, { status });
    }
  };

  // --- TASK COMMENTS ---
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    triggerTyping(selectedTask.id, false);

    try {
      const res = await fetch(`/api/dashboard/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedTask((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), data]
        }));
        setCommentText('');
        addToast('Comment added', 'success');
        
        setUndoMessage('Comment posted');
        setShowUndoBanner(true);

        syncUpdate('comment-added', { taskId: selectedTask.id });
        fetchTasks();
        fetchProjectLogs();
        fetchTaskLogs(selectedTask.id);
      }
    } catch (err) {
      addToast('Failed to post comment', 'error');
    }
  };

  // --- TASK DEPENDENCIES ---
  const handleAddDependency = async () => {
    if (!selectedDepTaskId || !selectedTask) return;
    try {
      const res = await fetch(`/api/dashboard/tasks/${selectedTask.id}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockingTaskId: selectedDepTaskId }),
      });
      if (res.ok) {
        addToast('Dependency added', 'success');
        setSelectedDepTaskId('');
        
        syncUpdate('dependency-linked', { taskId: selectedTask.id });
        fetchProjectLogs();
        fetchTaskLogs(selectedTask.id);

        const updatedRes = await fetch(`/api/dashboard/projects/${projectId}/tasks`);
        const updatedTasks = await updatedRes.json();
        if (Array.isArray(updatedTasks)) {
          setTasks(updatedTasks);
          const found = updatedTasks.find((t) => t.id === selectedTask.id);
          if (found) setSelectedTask(found);
        }
      } else {
        const errorData = await res.json();
        addToast(errorData.error || 'Failed to link dependency', 'error');
      }
    } catch (err) {
      addToast('Failed to add dependency', 'error');
    }
  };

  const handleRemoveDependency = async (blockingTaskId: string) => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`/api/dashboard/tasks/${selectedTask.id}/dependencies?blockingTaskId=${blockingTaskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast('Dependency removed', 'success');
        
        syncUpdate('dependency-unlinked', { taskId: selectedTask.id });
        fetchProjectLogs();
        fetchTaskLogs(selectedTask.id);

        const updatedRes = await fetch(`/api/dashboard/projects/${projectId}/tasks`);
        const updatedTasks = await updatedRes.json();
        if (Array.isArray(updatedTasks)) {
          setTasks(updatedTasks);
          const found = updatedTasks.find((t) => t.id === selectedTask.id);
          if (found) setSelectedTask(found);
        }
      }
    } catch (err) {
      addToast('Failed to remove dependency', 'error');
    }
  };

  // --- CHECKLIST ITEMS ---
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim() || !selectedTask) return;

    const items = selectedTask.checklist || [];
    const updated = [...items, { id: Math.random().toString(36).substring(2, 9), title: newChecklistTitle, completed: false }];
    
    setSelectedTask((prev: any) => ({ ...prev, checklist: updated }));
    handleUpdateTaskField(selectedTask.id, { checklist: updated });
    setNewChecklistTitle('');
  };

  const handleToggleChecklistItem = (itemId: string, currentCompleted: boolean) => {
    if (!selectedTask) return;
    const items = selectedTask.checklist || [];
    const updated = items.map((i: any) => i.id === itemId ? { ...i, completed: !currentCompleted } : i);
    
    setSelectedTask((prev: any) => ({ ...prev, checklist: updated }));
    handleUpdateTaskField(selectedTask.id, { checklist: updated });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (!selectedTask) return;
    const items = selectedTask.checklist || [];
    const updated = items.filter((i: any) => i.id !== itemId);
    
    setSelectedTask((prev: any) => ({ ...prev, checklist: updated }));
    handleUpdateTaskField(selectedTask.id, { checklist: updated });
  };

  // --- TAGS AND LABELS ---
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || !selectedTask) return;

    const tags = selectedTask.tags || [];
    if (!tags.includes(newTagInput.trim())) {
      const updated = [...tags, newTagInput.trim()];
      setSelectedTask((prev: any) => ({ ...prev, tags: updated }));
      handleUpdateTaskField(selectedTask.id, { tags: updated });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedTask) return;
    const tags = selectedTask.tags || [];
    const updated = tags.filter((t: string) => t !== tagToRemove);
    setSelectedTask((prev: any) => ({ ...prev, tags: updated }));
    handleUpdateTaskField(selectedTask.id, { tags: updated });
  };

  const handleAddLabel = (labelName: string, color: string) => {
    if (!selectedTask) return;
    const labels = selectedTask.labels || [];
    if (!labels.some((l: any) => l.name === labelName)) {
      const updated = [...labels, { name: labelName, color }];
      setSelectedTask((prev: any) => ({ ...prev, labels: updated }));
      handleUpdateTaskField(selectedTask.id, { labels: updated });
    }
  };

  const handleRemoveLabel = (labelName: string) => {
    if (!selectedTask) return;
    const labels = selectedTask.labels || [];
    const updated = labels.filter((l: any) => l.name !== labelName);
    setSelectedTask((prev: any) => ({ ...prev, tags: updated }));
    handleUpdateTaskField(selectedTask.id, { labels: updated });
  };

  // --- CALENDAR DATES UTILS ---
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // --- RESTORE VERSION & UNDO LOGIC ---
  const handleRestoreVersion = async (logId: string) => {
    if (!confirm('Revert property back to this version? This inserts a restore event in history.')) return;
    try {
      const res = await fetch(`/api/dashboard/history/${logId}/restore`, { method: 'POST' });
      if (res.ok) {
        addToast('Version restored successfully', 'success');
        setCompareLog(null);
        
        await fetchTasks();
        await fetchProjectDetails();
        await fetchProjectLogs();

        if (selectedTask) {
          await fetchTaskLogs(selectedTask.id);
          const tr = await fetch(`/api/dashboard/projects/${projectId}/tasks`);
          const all = await tr.json();
          if (Array.isArray(all)) {
            const updated = all.find((t) => t.id === selectedTask.id);
            if (updated) setSelectedTask(updated);
          }
        }

        syncUpdate('history-reverted', { projectId });
      } else {
        const err = await res.json();
        addToast(err.error || 'Failed to restore', 'error');
      }
    } catch (e) {
      addToast('Restoration error', 'error');
    }
  };

  const handleGlobalUndo = async () => {
    try {
      const res = await fetch('/api/dashboard/history/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      if (res.ok) {
        addToast('Last action reverted successfully', 'success');
        setShowUndoBanner(false);

        await fetchTasks();
        await fetchProjectDetails();
        await fetchProjectLogs();

        if (selectedTask) {
          await fetchTaskLogs(selectedTask.id);
          const tr = await fetch(`/api/dashboard/projects/${projectId}/tasks`);
          const all = await tr.json();
          if (Array.isArray(all)) {
            const updated = all.find((t) => t.id === selectedTask.id);
            if (updated) setSelectedTask(updated);
          }
        }

        syncUpdate('history-reverted', { projectId });
      } else {
        const err = await res.json();
        addToast(err.error || 'No actions to undo', 'warning');
      }
    } catch (e) {
      addToast('Undo error', 'error');
    }
  };

  // --- TEAM CHAT CONTROLLERS ---
  const handleChatTypingChange = (val: string, parentId: string | null = null) => {
    if (parentId) {
      setThreadInputText(val);
    } else {
      setChatInputText(val);
    }
    sendChatTyping(val.length > 0);
  };

  const handleSendChatMessage = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const textVal = parentId ? threadInputText : chatInputText;
    const attachVal = parentId ? threadAttachments : chatAttachments;

    if (!textVal.trim() && attachVal.length === 0) return;

    sendChatTyping(false);

    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textVal, attachments: attachVal, parentMessageId: parentId })
      });
      const data = await res.json();
      if (res.ok) {
        if (parentId) {
          setThreadInputText('');
          setThreadAttachments([]);
          setSelectedParentMessage((prev: any) => ({
            ...prev,
            replies: [...(prev.replies || []), data]
          }));
        } else {
          setChatInputText('');
          setChatAttachments([]);
        }

        await fetchChats();
        sendChatMessage(data);
        
        setTimeout(() => scrollToBottom(parentId ? 'thread' : 'chat'), 100);
      }
    } catch (e) {
      addToast('Failed to post message', 'error');
    }
  };

  const handleMarkMessageRead = async (messageId: string) => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/chat/${messageId}/read`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        sendChatRead(messageId, data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleChatMessageReaction = async (messageId: string, emoji: string, isReply: boolean = false) => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/chat/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchChats();
        sendChatReaction(messageId, data);

        if (isReply && selectedParentMessage) {
          setSelectedParentMessage((prev: any) => {
            const list = prev.replies.map((r: any) => r.id === messageId ? { ...r, reactions: data } : r);
            return { ...prev, replies: list };
          });
        } else if (selectedParentMessage && selectedParentMessage.id === messageId) {
          setSelectedParentMessage((prev: any) => ({ ...prev, reactions: data }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/chat/summary`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setAiSummary(data.summary);
        setIsAiSummaryOpen(true);
      }
    } catch (e) {
      addToast('Summary error', 'error');
    }
  };

  // --- AI ASSISTANT COPROCESSOR CONTROLLERS ---
  const handleAskAi = async (text: string) => {
    if (!text.trim()) return;
    setIsAiResponding(true);
    setAiMessages(prev => [...prev, { sender: 'user', text }]);
    setAiInputText('');

    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/coprocessor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          selectedTaskId: selectedTask ? selectedTask.id : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiMessages(prev => [...prev, { sender: 'ai', text: data.answer, actionPayload: data.actionPayload }]);
      } else {
        setAiMessages(prev => [...prev, { sender: 'ai', text: '⚠️ Failed to connect to Coprocessor engine.' }]);
      }
    } catch (err) {
      setAiMessages(prev => [...prev, { sender: 'ai', text: '⚠️ Coprocessor connection error.' }]);
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleExecuteAiAction = async (action: any) => {
    if (!action) return;
    if (action.type === 'create-tasks' && Array.isArray(action.tasks)) {
      for (const t of action.tasks) {
        await handleCreateTask(t.title, t.status);
      }
      addToast('Imported AI suggested tasks successfully!', 'success');
      setAiMessages(prev => [...prev, { sender: 'ai', text: '✅ Added suggested tasks into your board lanes.' }]);
    } else if (action.type === 'create-subtasks' && action.taskId && Array.isArray(action.subtasks)) {
      const items = selectedTask.checklist || [];
      const updated = [...items];
      action.subtasks.forEach((sub: any) => {
        updated.push({
          id: Math.random().toString(36).substring(2, 9),
          title: sub.title,
          completed: false
        });
      });
      setSelectedTask((prev: any) => ({ ...prev, checklist: updated }));
      handleUpdateTaskField(action.taskId, { checklist: updated });
      addToast('Imported AI checklists successfully!', 'success');
      setAiMessages(prev => [...prev, { sender: 'ai', text: '✅ Subtasks checklist integrated successfully.' }]);
    }
  };

  // --- FILE MANAGEMENT & COLLABORATION CONTROLLERS ---
  const handleCreateFolderAction = async () => {
    const name = prompt('Enter new folder name:');
    if (!name) return;
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: name })
      });
      if (res.ok) {
        addToast('Folder created successfully', 'success');
        fetchFilesAndFolders();
        syncUpdate('files-updated', { projectId });
      }
    } catch (err) {
      addToast('Failed to create folder', 'error');
    }
  };

  const handleUploadFileAction = async (name: string, mimeType: string, size: number) => {
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          mimeType,
          size,
          folderId: currentFolderId,
          url: mimeType.startsWith('image/') ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60' : '#'
        })
      });
      if (res.ok) {
        addToast('File uploaded successfully', 'success');
        fetchFilesAndFolders();
        syncUpdate('files-updated', { projectId });
      }
    } catch (err) {
      addToast('Failed to upload file', 'error');
    }
  };

  const handleUploadNewVersionAction = async () => {
    if (!selectedFile) return;
    const name = prompt('Simulate new file update. Keep name or replace details:');
    if (!name) return;
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/files/${selectedFile.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: Math.floor(Math.random() * 2000000) + 120000,
          mimeType: selectedFile.versions[0].mimeType,
          url: '#'
        })
      });
      if (res.ok) {
        addToast('New document version created', 'success');
        fetchFileDetail(selectedFile.id);
        fetchFilesAndFolders();
        syncUpdate('files-updated', { projectId });
      }
    } catch (err) {
      addToast('Failed to create new version', 'error');
    }
  };

  const handleDownloadFileAction = async (version: number) => {
    if (!selectedFile) return;
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/files/${selectedFile.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      });
      if (res.ok) {
        addToast(`Downloading ${selectedFile.name} (v${version})...`, 'info');
        fetchFileDetail(selectedFile.id);
        syncUpdate('files-updated', { projectId });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunFileAiAction = async (action: 'summary' | 'ocr') => {
    if (!selectedFile) return;
    setFileAiResult('Processing...');
    try {
      const res = await fetch(`/api/dashboard/projects/${projectId}/files/${selectedFile.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        setFileAiResult(data.answer);
      } else {
        setFileAiResult(`⚠️ AI operation failed: ${data.error}`);
      }
    } catch (err) {
      setFileAiResult('⚠️ AI connection timed out.');
    }
  };

  // Drag & drop handlers
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleFileDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    // Simulate drop prompts
    const option = prompt('Choose simulated file type: \n1. PDF Spec \n2. PNG Mockup \n3. CSV Sheet');
    if (option === '1') {
      handleUploadFileAction('workspace-diagram.pdf', 'application/pdf', 1048576);
    } else if (option === '2') {
      handleUploadFileAction('ux-landing-draft.png', 'image/png', 320400);
    } else if (option === '3') {
      handleUploadFileAction('financial-estimates.csv', 'text/csv', 48200);
    }
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_\-\.]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        return <strong key={idx} className="chat-mention">{part}</strong>;
      }
      return part;
    });
  };

  if (isLoading) {
    return (
      <div className="loading-container text-center animate-fade-in">
        <span className="spinner"></span>
        <p>Loading project workspace...</p>
        <style jsx>{`
          .loading-container { padding: 120px 40px; }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(79, 70, 229, 0.2);
            border-radius: 50%;
            border-top-color: var(--primary);
            animation: spin 0.8s linear infinite;
          }
          .text-center { text-align: center; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!project) return null;

  const isViewer = project.userRole === 'viewer';
  const rootTasks = tasks.filter((t) => t.parentTaskId === null);

  const getPriorityLabel = (prio: string) => {
    switch (prio) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      case 'urgent': return 'Urgent';
      default: return prio;
    }
  };

  // Filter tasks for list view
  const filteredListTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(listSearch.toLowerCase()) || 
      (t.description && t.description.toLowerCase().includes(listSearch.toLowerCase()));
    const matchesPriority = listPriorityFilter === 'all' || t.priority === listPriorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Filter logs for project timeline view
  const filteredTimelineLogs = projectLogs.filter((l) => {
    const matchesSearch = timelineSearch
      ? (l.newValue && l.newValue.toLowerCase().includes(timelineSearch.toLowerCase())) ||
        (l.oldValue && l.oldValue.toLowerCase().includes(timelineSearch.toLowerCase())) ||
        (l.fieldName && l.fieldName.toLowerCase().includes(timelineSearch.toLowerCase())) ||
        (l.task?.title && l.task.title.toLowerCase().includes(timelineSearch.toLowerCase()))
      : true;

    const matchesAction = timelineActionFilter === 'all' || l.action === timelineActionFilter;
    const matchesUser = timelineUserFilter === 'all' || l.userId === timelineUserFilter;

    return matchesSearch && matchesAction && matchesUser;
  });

  const logCollaborators = Array.from(
    new Map(projectLogs.map((log) => [log.user?.id, log.user])).values()
  ).filter(Boolean);

  const activeEditorName = selectedTask ? editingTasks[selectedTask.id] : null;
  const isEditingLocked = !!(activeEditorName && activeEditorName !== (user?.name || user?.email.split('@')[0]));
  const activeTypingUsers = selectedTask ? (typingUsers[selectedTask.id] || []) : [];

  // Commands for command palette
  const paletteCommands = [
    { name: '📋 Go to Kanban Board', action: () => setViewTab('board') },
    { name: '📝 Go to List Grid', action: () => setViewTab('list') },
    { name: '📅 Go to Calendar Planner', action: () => setViewTab('calendar') },
    { name: '⏱️ Go to Activity Timeline', action: () => setViewTab('timeline') },
    { name: '💬 Go to Team Chat', action: () => setViewTab('chat') },
    { name: '📂 Go to Files & Assets', action: () => setViewTab('files') },
    { name: '📊 Go to Analytics Dashboard', action: () => setViewTab('analytics') },
    { name: '✨ Ask AI Assistant', action: () => setIsAiCoprocessorOpen(true) },
    { name: '★ Star / Favorite Project', action: handleToggleFavorite },
    { name: '⚙️ Open Project Settings', action: () => setViewTab('settings') },
    { name: '🌓 Toggle Dark / Light Theme', action: toggleTheme },
    { name: '➕ Create New Task', action: () => {
      const name = prompt('Create Task:');
      if (name) handleCreateTask(name, 'todo');
    }}
  ];

  const filteredCommands = paletteCommands.filter(c => 
    c.name.toLowerCase().includes(commandSearch.toLowerCase())
  );

  return (
    <div className="workspace-container animate-fade-in" aria-label="Project Workspace">
      
      {/* Offline Status Warning banner */}
      {!isOnline && (
        <div className="offline-warning-banner animate-pulse" role="alert">
          ⚡ Working Offline: Working with cached project resources. Changes will be synced when connection is restored.
        </div>
      )}

      {/* Workspace Header banner */}
      <header className="workspace-header glass">
        <div className="header-top">
          <div className="project-title-info">
            <span className="folder-icon" aria-hidden="true">📁</span>
            <div>
              <h2>{project.name}</h2>
              <p className="description">{project.description || 'No project description added.'}</p>
            </div>
          </div>

          {/* Live presence avatars row */}
          <div className="header-meta-actions">
            <div className="presence-avatars-row">
              <span className={`status-badge-connection ${connectionStatus}`} title={`Socket: ${connectionStatus}`}>
                {connectionStatus === 'connected' ? '🟢 Live' : connectionStatus === 'connecting' ? '🟡 Connecting' : connectionStatus === 'fallback' ? '🔵 Tab Sync' : '🔴 Offline'}
              </span>
              <div className="avatars-group" aria-label="Active Collaborators">
                {onlineUsers.map((online) => {
                  const avatar = online.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(online.name || online.email)}`;
                  return (
                    <img
                      key={online.userId}
                      src={avatar}
                      alt={online.name}
                      title={`${online.name || online.email} is active`}
                      className="presence-avatar animate-scale-in"
                    />
                  );
                })}
              </div>
            </div>

            <button 
              className={`btn-fav-star ${project.isFavorite ? 'active' : ''}`}
              onClick={handleToggleFavorite}
            >
              ★ {project.isFavorite ? 'Starred' : 'Star'}
            </button>
          </div>
        </div>

        {/* Views switcher tabs (spacious tab design) */}
        <div className="header-tabs-row">
          <div className="view-switcher-tabs" role="tablist">
            <button className={`tab-btn ${viewTab === 'overview' ? 'active' : ''}`} onClick={() => setViewTab('overview')} role="tab" aria-selected={viewTab === 'overview'}>
              ✨ Overview
            </button>
            <button className={`tab-btn ${viewTab === 'board' ? 'active' : ''}`} onClick={() => setViewTab('board')} role="tab" aria-selected={viewTab === 'board'}>
              📋 Board
            </button>
            <button className={`tab-btn ${viewTab === 'list' ? 'active' : ''}`} onClick={() => setViewTab('list')} role="tab" aria-selected={viewTab === 'list'}>
              📝 List
            </button>
            <button className={`tab-btn ${viewTab === 'calendar' ? 'active' : ''}`} onClick={() => setViewTab('calendar')} role="tab" aria-selected={viewTab === 'calendar'}>
              📅 Calendar
            </button>
            <button className={`tab-btn ${viewTab === 'timeline' ? 'active' : ''}`} onClick={() => setViewTab('timeline')} role="tab" aria-selected={viewTab === 'timeline'}>
              ⏱️ Timeline
            </button>
            <button className={`tab-btn ${viewTab === 'files' ? 'active' : ''}`} onClick={() => setViewTab('files')} role="tab" aria-selected={viewTab === 'files'}>
              📂 Files
            </button>
            <button className={`tab-btn ${viewTab === 'chat' ? 'active' : ''}`} onClick={() => setViewTab('chat')} role="tab" aria-selected={viewTab === 'chat'}>
              💬 Chat
            </button>
            <button className={`tab-btn ${viewTab === 'analytics' ? 'active' : ''}`} onClick={() => setViewTab('analytics')} role="tab" aria-selected={viewTab === 'analytics'}>
              📊 Analytics
            </button>
            <button className={`tab-btn ${viewTab === 'settings' ? 'active' : ''}`} onClick={() => setViewTab('settings')} role="tab" aria-selected={viewTab === 'settings'}>
              ⚙️ Settings
            </button>
          </div>

          <div className="project-completion-badge">
            <div className="progress-bar-container">
              <span>Progress {project.progress}%</span>
              <div className="mini-progress-bg">
                <div className="mini-progress-fill" style={{ width: `${project.progress}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace content */}
      <div className="workspace-content">
        
        {/* TAB 1: OVERVIEW TAB */}
        {viewTab === 'overview' && (
          <div className="overview-tab-layout animate-fade-in">
            {isAnalyticsLoading || !analyticsData ? (
              <div className="loading-container text-center">
                <span className="spinner"></span>
                <p>Retrieving project highlights summaries...</p>
              </div>
            ) : (
              <div className="overview-grid">
                
                {/* 1. HEALTH SCORE RING & PROJECT DETAILS */}
                <div className="overview-card health-score-widget glass">
                  <span className="overview-card-label">PROJECT PROFILE</span>
                  <div className="health-radial-box">
                    <svg width="84" height="84" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={analyticsData.projectHealth >= 80 ? 'var(--success)' : analyticsData.projectHealth >= 50 ? 'var(--warning)' : 'var(--error)'}
                        strokeWidth="8"
                        strokeDasharray="314"
                        strokeDashoffset={314 - (314 * analyticsData.projectHealth) / 100}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                      />
                      <text x="60" y="66" textAnchor="middle" fill="var(--fg-primary)" fontSize="22" fontWeight="800">
                        {analyticsData.projectHealth}%
                      </text>
                    </svg>
                    <div className="health-text-details">
                      <h3>{project.name}</h3>
                      <p>Health Index Status: <strong>{analyticsData.projectHealth >= 80 ? 'Emerald Good' : 'Gold Alert'}</strong></p>
                    </div>
                  </div>
                  <div className="overview-mini-metrics">
                    <div className="mini-metric">
                      <span>Tasks Complete</span>
                      <strong>{analyticsData.productivity.completed} / {analyticsData.productivity.total}</strong>
                    </div>
                    <div className="mini-metric">
                      <span>In Progress</span>
                      <strong>{analyticsData.productivity.inProgress}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. AI COPROCESSOR RECOMMENDATION SUMMARY */}
                <div className="overview-card ai-summary-widget glass">
                  <span className="overview-card-label">🧠 AI COPROCESSOR REPORT</span>
                  <div className="ai-report-bullets">
                    <ul>
                      {analyticsData.aiInsights.slice(0, 2).map((ins: string, idx: number) => (
                        <li key={idx}>💡 {ins}</li>
                      ))}
                      {analyticsData.aiRisks.slice(0, 2).map((risk: string, idx: number) => (
                        <li key={idx} style={{ color: 'var(--error)' }}>⚠️ {risk}</li>
                      ))}
                    </ul>
                  </div>
                  <button className="btn-secondary" style={{ width: '100%', marginTop: 'auto' }} onClick={() => setIsAiCoprocessorOpen(true)}>
                    🪄 Consulting Workspace Brain
                  </button>
                </div>

                {/* 3. UPCOMING TASKS & TASK DELEGATION */}
                <div className="overview-card glass">
                  <span className="overview-card-label">📋 UPCOMING SPRINT TASKS</span>
                  {tasks.filter((t) => t.status !== 'done').length === 0 ? (
                    <p className="no-comments">All sprint tasks completed!</p>
                  ) : (
                    <div className="mini-list-preview">
                      {tasks.filter((t) => t.status !== 'done').slice(0, 3).map((t) => (
                        <div key={t.id} className="mini-list-item" onClick={() => {
                          setSelectedTask(t);
                          triggerEditing(t.id, true);
                          setIsDrawerOpen(true);
                        }}>
                          <span className={`prio-dot ${t.priority}`}>●</span>
                          <strong>{t.title}</strong>
                          <span className="meta">{t.status.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. RECENT AUDITS & TIMELINE FEED */}
                <div className="overview-card glass">
                  <span className="overview-card-label">⏱️ RECENT ACTIVITY RECORDS</span>
                  {projectLogs.length === 0 ? (
                    <p className="no-comments">No activity logs recorded.</p>
                  ) : (
                    <div className="mini-list-preview">
                      {projectLogs.slice(0, 3).map((log) => (
                        <div key={log.id} className="mini-list-item">
                          <span>{log.user?.name || log.user?.email.split('@')[0]}</span>
                          <strong>{log.action}d {log.fieldName || 'card'}</strong>
                          <span className="meta">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. RECENT FILES ACCESS */}
                <div className="overview-card glass">
                  <span className="overview-card-label">📂 RECENT FILES</span>
                  {files.length === 0 ? (
                    <p className="no-comments">No documents uploaded.</p>
                  ) : (
                    <div className="mini-list-preview">
                      {files.slice(0, 3).map((f) => (
                        <div key={f.id} className="mini-list-item" onClick={() => setViewTab('files')}>
                          <span>📄</span>
                          <strong>{f.name}</strong>
                          <span className="meta">v{f.currentVersion}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. PROJECT TEAM MEMBERS ROLES */}
                <div className="overview-card glass">
                  <span className="overview-card-label">👥 COLLABORATORS</span>
                  <div className="members-profile-list">
                    {project.members && project.members.map((member: any) => (
                      <div key={member.id} className="member-profile-row">
                        <img
                          src={member.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.user?.name || member.user?.email)}`}
                          alt="Avatar"
                          className="member-profile-avatar"
                        />
                        <div className="member-profile-info">
                          <strong>{member.user?.name || member.user?.email}</strong>
                          <span>{member.role.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
        
        {/* VIEW 2: KANBAN BOARD */}
        {viewTab === 'board' && (
          <div className="kanban-board-layout animate-fade-in">
            {(['backlog', 'todo', 'in_progress', 'done', 'cancelled'] as const).map((colStatus) => {
              const colTasks = rootTasks.filter((t) => t.status === colStatus);

              return (
                <div 
                  key={colStatus} 
                  className="kanban-column glass"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, colStatus)}
                >
                  <div className="column-header">
                    <span className={`col-indicator ${colStatus}`}>●</span>
                    <h3>{colStatus.replace('_', ' ').toUpperCase()}</h3>
                    <span className="col-count">{colTasks.length}</span>
                  </div>

                  {!isViewer && (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const title = quickTaskTitle[colStatus] || '';
                        handleCreateTask(title, colStatus);
                        setQuickTaskTitle(prev => ({ ...prev, [colStatus]: '' }));
                      }}
                      className="quick-add-form"
                    >
                      <input
                        type="text"
                        placeholder="＋ Add task..."
                        value={quickTaskTitle[colStatus] || ''}
                        onChange={(e) => setQuickTaskTitle(prev => ({ ...prev, [colStatus]: e.target.value }))}
                      />
                    </form>
                  )}

                  <div className="cards-stack">
                    {colTasks.length === 0 ? (
                      <div className="column-empty">No tasks yet.</div>
                    ) : (
                      colTasks.map((task) => {
                        const hasChecklist = task.checklist && task.checklist.length > 0;
                        const doneChecklist = hasChecklist ? task.checklist.filter((c: any) => c.completed).length : 0;
                        const totalChecklist = hasChecklist ? task.checklist.length : 0;
                        const editor = editingTasks[task.id];

                        return (
                          <div
                            key={task.id}
                            className={`task-card glass-hover animate-slide-in ${editor ? 'locked' : ''}`}
                            draggable={!isViewer}
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => {
                              setSelectedTask(task);
                              setDrawerSubTab('details');
                              triggerEditing(task.id, true);
                              setIsDrawerOpen(true);
                            }}
                          >
                            <div className="card-top-tags">
                              <span className={`prio-pill ${task.priority}`}>
                                {getPriorityLabel(task.priority)}
                              </span>
                              {editor && (
                                <span className="editing-badge-dot" title={`${editor} is editing...`}>
                                  ✏️ {editor.split(' ')[0]}
                                </span>
                              )}
                              {task.isFavorite && <span className="star-tag">★</span>}
                            </div>

                            <h4>{task.title}</h4>
                            
                            {task.description && (
                              <p className="card-desc">{task.description}</p>
                            )}

                            {task.labels && task.labels.length > 0 && (
                              <div className="card-labels">
                                {task.labels.map((l: any, idx: number) => (
                                  <span key={idx} className="label-dot" style={{ backgroundColor: l.color }} title={l.name}></span>
                                ))}
                              </div>
                            )}

                            <div className="card-footer-meta">
                              {task.dueDate ? (
                                <span className={`due-alert ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'overdue' : ''}`}>
                                  📅 {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              ) : <span className="empty-meta"></span>}

                              <div className="right-indicators">
                                {hasChecklist && (
                                  <span className="checklist-ratio" title="Checklist progress">
                                    ☑ {doneChecklist}/{totalChecklist}
                                  </span>
                                )}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <span className="subtasks-badge" title="Subtasks count">
                                    🔗 {task.subtasks.length}
                                  </span>
                                )}
                                {task.comments && task.comments.length > 0 && (
                                  <span className="comments-count" title="Comments">
                                    💬 {task.comments.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 3: LIST VIEW */}
        {viewTab === 'list' && (
          <div className="list-view-layout glass animate-fade-in">
            <div className="list-toolbar">
              <input
                type="text"
                placeholder="Search tasks..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="search-field"
              />
              <select 
                value={listPriorityFilter} 
                onChange={(e) => setListPriorityFilter(e.target.value)}
                className="select-field"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
              <button 
                className="btn-primary" 
                onClick={() => {
                  const title = prompt('Enter task name:');
                  if (title) handleCreateTask(title, 'todo');
                }}
                disabled={isViewer}
              >
                ＋ Add Task
              </button>
            </div>

            <div className="table-wrapper">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Estimate</th>
                    <th>Indicators</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center no-tasks">No tasks found.</td>
                    </tr>
                  ) : (
                    filteredListTasks.map((t) => (
                      <tr 
                        key={t.id} 
                        onClick={() => {
                          setSelectedTask(t);
                          setDrawerSubTab('details');
                          triggerEditing(t.id, true);
                          setIsDrawerOpen(true);
                        }}
                        className="clickable-row"
                      >
                        <td className="task-title-cell">
                          <span className="bullet">●</span>
                          <strong>{t.title}</strong>
                          {t.parentTaskId && <span className="subtask-parent-tag">subtask</span>}
                        </td>
                        <td>
                          <span className={`status-badge ${t.status}`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className={`priority-text ${t.priority}`}>
                            {getPriorityLabel(t.priority)}
                          </span>
                        </td>
                        <td>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          {t.timeEstimate ? `${t.timeEstimate} hrs` : '-'}
                        </td>
                        <td className="indicators-cell">
                          {t.checklist && t.checklist.length > 0 && `☑ ${t.checklist.filter((c: any) => c.completed).length}/${t.checklist.length}`}
                          {t.subtasks && t.subtasks.length > 0 && ` 🔗 ${t.subtasks.length}`}
                          {t.comments && t.comments.length > 0 && ` 💬 ${t.comments.length}`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: CALENDAR VIEW */}
        {viewTab === 'calendar' && (
          <div className="calendar-view-layout glass animate-fade-in">
            <div className="calendar-toolbar">
              <button className="btn-arrow" onClick={handlePrevMonth}>◀</button>
              <h2>
                {currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
              <button className="btn-arrow" onClick={handleNextMonth}>▶</button>
            </div>

            <div className="calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="calendar-day-header">{d}</div>
              ))}
              {getCalendarDays().map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="calendar-day empty"></div>;

                const dateStr = day.toDateString();
                const dayTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === dateStr);

                return (
                  <div key={dateStr} className="calendar-day active-day">
                    <span className="day-number">{day.getDate()}</span>
                    <div className="day-tasks-stack">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className={`day-task-pill ${t.priority}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(t);
                            setDrawerSubTab('details');
                            triggerEditing(t.id, true);
                            setIsDrawerOpen(true);
                          }}
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 5: ACTIVITY TIMELINE */}
        {viewTab === 'timeline' && (
          <div className="timeline-layout glass animate-fade-in">
            <div className="timeline-toolbar">
              <input
                type="text"
                placeholder="Search history content..."
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                className="search-field"
              />
              
              <select 
                value={timelineActionFilter}
                onChange={(e) => setTimelineActionFilter(e.target.value)}
                className="select-field"
              >
                <option value="all">All Actions</option>
                <option value="create">Creations</option>
                <option value="update">Modifications</option>
                <option value="comment">Comments</option>
                <option value="restore">Restorations</option>
                <option value="delete">Deletions</option>
              </select>

              <select 
                value={timelineUserFilter}
                onChange={(e) => setTimelineUserFilter(e.target.value)}
                className="select-field"
              >
                <option value="all">All Authors</option>
                {logCollaborators.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name || c.email}</option>
                ))}
              </select>
            </div>

            <div className="timeline-timeline-feed">
              {filteredTimelineLogs.length === 0 ? (
                <div className="timeline-empty">No activity records found.</div>
              ) : (
                filteredTimelineLogs.map((log) => {
                  const avatar = log.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(log.user?.name || log.user?.email || 'U')}`;
                  const isDescriptionUpdate = log.action === 'update' && log.fieldName === 'description';
                  const isTitleUpdate = log.action === 'update' && log.fieldName === 'title';

                  return (
                    <div key={log.id} className="timeline-card animate-slide-in">
                      <img src={avatar} alt="User Avatar" className="timeline-avatar" />
                      <div className="timeline-log-details">
                        <div className="timeline-card-meta">
                          <strong>{log.user?.name || log.user?.email}</strong>
                          <span className="timestamp">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        
                        <p className="timeline-text">
                          <span className={`log-badge ${log.action}`}>
                            {log.action.toUpperCase()}
                          </span>
                          
                          {log.taskId ? (
                            <>
                              {' '}on Task <strong>{log.task?.title || 'Deleted Task'}</strong>:{' '}
                            </>
                          ) : (
                            <>
                              {' '}on Project <strong>{project.name}</strong>:{' '}
                            </>
                          )}

                          {log.action === 'create' && `Created target entity.`}
                          {log.action === 'comment' && `Posted comment: "${log.newValue}"`}
                          {log.action === 'delete' && `Deleted task "${log.oldValue}"`}
                          
                          {(log.action === 'update' || log.action === 'restore') && (
                            <>
                              Modified field <code>{log.fieldName}</code> from{' '}
                              <span className="old-text">"{log.oldValue || 'none'}"</span> to{' '}
                              <span className="new-text">"{log.newValue || 'none'}"</span>
                            </>
                          )}
                        </p>

                        {(isDescriptionUpdate || isTitleUpdate) && (
                          <div className="timeline-card-actions">
                            <button className="btn-compare" onClick={() => setCompareLog(log)}>
                              🔎 Difference Details
                            </button>
                            {!isViewer && log.userId === user?.id && (
                              <button className="btn-restore-link" onClick={() => handleRestoreVersion(log.id)}>
                                🔄 Revert to this
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW 6: REAL-TIME TEAM CHAT WORKSPACE */}
        {viewTab === 'chat' && (
          <div className="chat-layout glass animate-fade-in">
            <div className="chat-toolbar">
              <span className="chat-heading">💬 Channel Stream</span>
              <button className="btn-ai-summary font-semibold" onClick={handleGenerateSummary} title="Compile Chat executive summary">
                🪄 AI Chat Summary
              </button>
            </div>

            {/* Chat message stream container */}
            <div className="chat-message-stream">
              {chatMessages.length === 0 ? (
                <div className="chat-empty text-center">No messages posted in team channel. Say hello!</div>
              ) : (
                chatMessages.map((msg) => {
                  const avatar = msg.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.user?.name || msg.user?.email || 'U')}`;
                  const readCount = msg.readBy ? msg.readBy.length : 0;

                  return (
                    <div key={msg.id} className="chat-bubble-row animate-scale-in">
                      <img src={avatar} alt="User Avatar" className="chat-avatar" />
                      <div className="chat-message-content">
                        <div className="chat-bubble-meta">
                          <strong>{msg.user?.name || msg.user?.email}</strong>
                          <span className="timestamp">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <p className="chat-text-payload">{renderMessageContent(msg.text)}</p>

                        {/* Attachments shared */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="chat-shared-files">
                            {msg.attachments.map((a: any, idx: number) => (
                              <div key={idx} className="file-attachment-card">
                                📎 {a.name} ({(a.size / 1024).toFixed(1)} KB)
                                <a href={a.url} target="_blank" rel="noreferrer" className="btn-dl">Download</a>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reactions and replies controls */}
                        <div className="chat-actions-row">
                          <button className="btn-reply-thread" onClick={() => {
                            setSelectedParentMessage(msg);
                            setIsThreadDrawerOpen(true);
                          }}>
                            💬 Reply {msg.replies && msg.replies.length > 0 ? `(${msg.replies.length})` : 'in thread'}
                          </button>

                          {/* Quick Reactions emoji picker */}
                          <div className="reactions-picker">
                            {['👍', '❤️', '🔥', '🎉'].map(emoji => {
                              const reaction = msg.reactions?.find((r: any) => r.emoji === emoji);
                              const count = reaction ? reaction.userIds.length : 0;
                              const isReacted = reaction?.userIds.includes(user?.id);

                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleChatMessageReaction(msg.id, emoji)}
                                  className={`btn-emoji ${isReacted ? 'active' : ''}`}
                                >
                                  {emoji} {count > 0 && <span>{count}</span>}
                                </button>
                              );
                            })}
                          </div>

                          {/* Read Receipts Badge */}
                          <div className="read-receipts-indicator" title={msg.readBy ? `Read by: ${msg.readBy.join(', ')}` : ''}>
                            ✓{readCount > 0 && <span className="receipts-count">{readCount}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input textbox with typing indicators */}
            <div className="chat-input-controls">
              {activeChatTypingUsers.length > 0 && (
                <div className="chat-typing-status animate-pulse">
                  ✍️ {activeChatTypingUsers.join(', ')} is typing...
                </div>
              )}

              {/* Shared files queued indicator */}
              {chatAttachments.length > 0 && (
                <div className="chat-queued-files">
                  {chatAttachments.map((file, idx) => (
                    <span key={idx} className="queued-file-pill">
                      📄 {file.name}
                      <button className="btn-q-del" onClick={() => setChatAttachments([])}>✕</button>
                    </span>
                  ))}
                </div>
              )}

              <form onSubmit={(e) => handleSendChatMessage(e)} className="chat-submission-form">
                <button
                  type="button"
                  className="btn-attach-clip"
                  onClick={() => {
                    const name = prompt('Simulate file attachment sharing:');
                    if (name) {
                      setChatAttachments([{ name, url: '#', size: 38400 }]);
                    }
                  }}
                  title="Simulate sharing file attachment"
                >
                  📎
                </button>
                <input
                  type="text"
                  placeholder="Message team... (use @name to mention collaborators)"
                  value={chatInputText}
                  onChange={(e) => handleChatTypingChange(e.target.value)}
                  onBlur={() => sendChatTyping(false)}
                />
                <button type="submit" className="btn-chat-send">Send</button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 7: FILE COLLABORATION AND DOCUMENT CENTER */}
        {viewTab === 'files' && (
          <div className="files-layout glass animate-fade-in">
            {/* Folder Navigation bar */}
            <div className="files-toolbar">
              <div className="breadcrumbs-bar">
                <span className="crumb-root" onClick={() => {
                  setCurrentFolderId(null);
                  setFolderPath([]);
                }}>📁 Root</span>
                {folderPath.map((pathItem, idx) => (
                  <span key={pathItem.id} className="crumb-item" onClick={() => {
                    setCurrentFolderId(pathItem.id);
                    setFolderPath(prev => prev.slice(0, idx + 1));
                  }}>
                    &nbsp;&gt;&nbsp;{pathItem.name}
                  </span>
                ))}
              </div>

              <div className="files-toolbar-actions">
                <button className="btn-secondary" onClick={handleCreateFolderAction} disabled={isViewer}>
                  📁 Create Folder
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    const name = prompt('Simulate File Upload: Enter filename (e.g. spec.pdf or design.png)');
                    if (name) {
                      const ext = name.split('.').pop() || '';
                      const mime = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'application/octet-stream';
                      handleUploadFileAction(name, mime, 482000);
                    }
                  }}
                  disabled={isViewer}
                >
                  📤 Upload File
                </button>
              </div>
            </div>

            {/* Dnd drop container area */}
            <div
              className={`files-dnd-zone ${isDraggingFile ? 'dragging' : ''}`}
              onDragOver={handleFileDragOver}
              onDragLeave={handleFileDragLeave}
              onDrop={handleFileDrop}
            >
              <div className="dnd-prompt">
                <span className="dnd-icon">🗂️</span>
                <p>Drag and drop assets here, or click upload buttons to simulate.</p>
              </div>
            </div>

            {/* Folder and File grid list */}
            <div className="files-grid-container">
              {folders.length === 0 && files.length === 0 ? (
                <div className="files-empty text-center">No documents in this directory yet.</div>
              ) : (
                <div className="folders-files-grid">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="folder-item-card glass-hover"
                      onClick={() => {
                        setCurrentFolderId(folder.id);
                        setFolderPath(prev => [...prev, folder]);
                      }}
                    >
                      <span className="grid-icon">📁</span>
                      <strong className="item-name">{folder.name}</strong>
                      <span className="item-meta">Folder</span>
                    </div>
                  ))}

                  {files.map((file) => {
                    const isImg = file.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/);
                    const isPdf = file.name.toLowerCase().endsWith('.pdf');
                    const icon = isImg ? '🖼️' : isPdf ? '📄' : '📝';

                    return (
                      <div
                        key={file.id}
                        className="file-item-card glass-hover"
                        onClick={async () => {
                          setSelectedFile(null);
                          setFileAiResult(null);
                          setFileDrawerSubTab('preview');
                          setIsFileDrawerOpen(true);
                          await fetchFileDetail(file.id);
                        }}
                      >
                        <span className="grid-icon">{icon}</span>
                        <strong className="item-name">{file.name}</strong>
                        <span className="item-meta">v{file.currentVersion} • Spec</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 8: ANALYTICS DASHBOARD */}
        {viewTab === 'analytics' && (
          <div className="analytics-layout animate-fade-in">
            {isAnalyticsLoading || !analyticsData ? (
              <div className="loading-container text-center">
                <span className="spinner"></span>
                <p>Computing interactive analytics metrics...</p>
              </div>
            ) : (
              <div className="analytics-dashboard-grid">
                
                {/* 1. HEALTH SCORE CIRCULAR GAUGE & PRODUCTIVITY STATS */}
                <div className="analytics-card kpi-column glass">
                  <span className="section-label">Performance Gauge</span>
                  <div className="health-circle-wrapper">
                    <svg width="100" height="100" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={analyticsData.projectHealth >= 80 ? 'var(--success)' : analyticsData.projectHealth >= 50 ? 'var(--warning)' : 'var(--error)'}
                        strokeWidth="8"
                        strokeDasharray="314"
                        strokeDashoffset={314 - (314 * analyticsData.projectHealth) / 100}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                      />
                      <text x="60" y="66" textAnchor="middle" fill="var(--fg-primary)" fontSize="22" fontWeight="800">
                        {analyticsData.projectHealth}%
                      </text>
                    </svg>
                    <div className="health-label-under">
                      <strong>Project Health</strong>
                      <span className="health-desc">
                        {analyticsData.projectHealth >= 80 ? '🟢 Highly Productive' : analyticsData.projectHealth >= 50 ? '🟡 At Risk / Impeded' : '🔴 Critical Blockage'}
                      </span>
                    </div>
                  </div>

                  <div className="mini-stats-grid">
                    <div className="mini-stat-card">
                      <span className="stat-label">Completions</span>
                      <strong>{analyticsData.productivity.completed} / {analyticsData.productivity.total}</strong>
                    </div>
                    <div className="mini-stat-card">
                      <span className="stat-label">Urgent</span>
                      <strong className="text-red">{analyticsData.productivity.priorities.urgent}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. AI ADVISORY & RISK ASSESSMENTS */}
                <div className="analytics-card ai-insights-card glass">
                  <span className="section-label">🧠 Coprocessor Advisory</span>
                  <div className="ai-report-box">
                    <h3>💡 Weekly Performance Insights</h3>
                    <ul>
                      {analyticsData.aiInsights.map((ins: string, idx: number) => (
                        <li key={idx}>{ins}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="ai-report-box alert-box" style={{ marginTop: '10px' }}>
                    <h3>⚠️ AI Threat & Risks Log</h3>
                    <ul>
                      {analyticsData.aiRisks.map((risk: string, idx: number) => (
                        <li key={idx} className="risk-item">{risk}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. BURNDOWN LINE CHART */}
                <div className="analytics-card burndown-column glass">
                  <span className="section-label">Burndown Chart</span>
                  <div className="chart-container" style={{ position: 'relative' }}>
                    <svg viewBox="0 0 500 220" width="100%" height="220" style={{ overflow: 'visible' }}>
                      {[0, 50, 100, 150, 200].map((y, idx) => (
                        <line key={idx} x1="30" y1={y + 10} x2="480" y2={y + 10} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                      ))}

                      {/* Ideal line path */}
                      <path
                        d={analyticsData.burndown.ideal.map((val: number, idx: number) => {
                          const x = 30 + (idx * 45);
                          const y = 210 - (val * 20);
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="var(--fg-tertiary)"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                      />

                      {/* Actual line path */}
                      <path
                        d={analyticsData.burndown.actual.map((val: number, idx: number) => {
                          const x = 30 + (idx * 45);
                          const y = 210 - (val * 20);
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Hoverable Node points */}
                      {analyticsData.burndown.actual.map((val: number, idx: number) => {
                        const x = 30 + (idx * 45);
                        const y = 210 - (val * 20);
                        return (
                          <circle
                            key={idx}
                            cx={x}
                            cy={y}
                            r="4"
                            fill="var(--primary)"
                            stroke="white"
                            strokeWidth="1"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredPoint({ index: idx, type: 'actual', x, y, val })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        );
                      })}
                    </svg>

                    {hoveredPoint && (
                      <div className="chart-tooltip" style={{ left: `${(hoveredPoint.x / 500) * 100}%`, top: `${(hoveredPoint.y / 220) * 100 - 15}%` }}>
                        Day {hoveredPoint.index}: <strong>{hoveredPoint.val}</strong> tasks remaining
                      </div>
                    )}
                  </div>
                  <div className="chart-legends-row">
                    <span className="legend-item"><span className="legend-dot dashed" style={{ background: 'var(--fg-tertiary)' }}></span> Ideal Burn</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--primary)' }}></span> Actual Remaining</span>
                  </div>
                </div>

                {/* 4. VELOCITY VERTICAL BAR CHART */}
                <div className="analytics-card velocity-column glass">
                  <span className="section-label">Team Velocity</span>
                  <div className="chart-container">
                    <svg viewBox="0 0 400 200" width="100%" height="200" style={{ overflow: 'visible' }}>
                      {[0, 50, 100, 150].map((y, idx) => (
                        <line key={idx} x1="30" y1={y + 20} x2="380" y2={y + 20} stroke="var(--border-color)" strokeWidth="0.5" />
                      ))}

                      {analyticsData.velocity.map((v: any, idx: number) => {
                        const x = 50 + (idx * 85);
                        const h = v.points * 4.5;
                        const y = 170 - h;

                        return (
                          <g key={idx} className="bar-group">
                            <rect
                              x={x}
                              y={y}
                              width="32"
                              height={h}
                              rx="3"
                              style={{ fill: 'var(--primary)', cursor: 'pointer' }}
                            />
                            <text x={x + 16} y={y - 6} textAnchor="middle" fill="var(--fg-primary)" fontSize="9" fontWeight="700">
                              {v.points} pts
                            </text>
                            <text x={x + 16} y="185" textAnchor="middle" fill="var(--fg-tertiary)" fontSize="9" fontWeight="600">
                              {v.sprint}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* 5. TEAM WORKLOAD */}
                <div className="analytics-card workload-column glass">
                  <span className="section-label">Workload Distribution</span>
                  <div className="workload-list">
                    {analyticsData.teamWorkload.map((member: any) => (
                      <div key={member.userId} className="workload-row-bar">
                        <div className="workload-labels-between">
                          <strong>{member.userName}</strong>
                          <span>{member.taskCount} tasks ({member.percentage}%)</span>
                        </div>
                        <div className="workload-track">
                          <div className="workload-fill" style={{ width: `${member.percentage}%`, background: 'var(--primary)' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. CONTRUBUTORS ATTENDANCE HEATMAP */}
                <div className="analytics-card attendance-column glass">
                  <span className="section-label">Contribution Heatmap</span>
                  <div className="attendance-heatmap-row">
                    {analyticsData.attendance.map((day: any, idx: number) => {
                      let bg = 'var(--bg-tertiary)';
                      if (day.count === 1) bg = 'rgba(34,197,94,0.2)';
                      else if (day.count === 2) bg = 'rgba(34,197,94,0.4)';
                      else if (day.count === 3) bg = 'rgba(34,197,94,0.7)';
                      else if (day.count >= 4) bg = 'rgba(34,197,94,1.0)';

                      return (
                        <div key={idx} className="heatmap-box" style={{ background: bg }} title={`${day.date}: ${day.count} updates`}>
                          <span className="heatmap-date-label">{day.date.split(' ')[1]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW 9: PROJECT CONFIGURATION SETTINGS */}
        {viewTab === 'settings' && (
          <div className="project-settings-tab-layout animate-fade-in">
            <div className="settings-wrapper glass">
              <h2 className="section-title">⚙️ Workspace Settings</h2>
              
              <form onSubmit={handleProjectEditSubmit} className="settings-form">
                <div className="input-group">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    required
                    disabled={isViewer}
                  />
                </div>

                <div className="input-group" style={{ marginTop: '16px' }}>
                  <label>Description</label>
                  <textarea
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    rows={4}
                    disabled={isViewer}
                  />
                </div>

                {!isViewer && (
                  <button type="submit" className="btn-primary" style={{ marginTop: '16px', alignSelf: 'flex-start' }}>
                    Save Configuration
                  </button>
                )}
              </form>

              <div className="sidebar-divider" style={{ margin: '24px 0' }}></div>

              {/* TEAM MEMBERS SECTION */}
              <h2 className="section-title">👥 Team Members</h2>
              
              {/* Current Members List */}
              <div className="members-list">
                {(membersList.length > 0 ? membersList : project?.members || []).map((m: any) => {
                  const memberUser = m.user;
                  if (!memberUser) return null;
                  const avatar = memberUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberUser.name || memberUser.email)}`;
                  const isOwner = m.role === 'owner';
                  const isCurrentUser = memberUser.id === user?.id;
                  const canManage = (project?.userRole === 'owner' || project?.userRole === 'admin') && !isOwner && !isCurrentUser;
                  
                  return (
                    <div key={m.id || m.userId} className="member-row">
                      <img src={avatar} alt="" className="member-avatar" />
                      <div className="member-info">
                        <span className="member-name">
                          {memberUser.name || memberUser.email.split('@')[0]}
                          {isCurrentUser && <span className="member-you-badge">you</span>}
                        </span>
                        <span className="member-email">{memberUser.email}</span>
                      </div>
                      <div className="member-actions">
                        {canManage ? (
                          <select
                            className="member-role-select"
                            value={m.role}
                            onChange={(e) => handleUpdateMemberRole(memberUser.id, e.target.value)}
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className={`member-role-badge ${m.role}`}>{m.role}</span>
                        )}
                        {canManage && (
                          <button
                            className="member-remove-btn"
                            onClick={() => handleRemoveMember(memberUser.id, memberUser.email)}
                            title="Remove member"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Invite New Member Form */}
              {(project?.userRole === 'owner' || project?.userRole === 'admin') && (
                <>
                  <div className="sidebar-divider" style={{ margin: '20px 0' }}></div>
                  <h3 className="subsection-title">Invite a Collaborator</h3>
                  <p className="invite-hint">Enter the email of a registered CollabSpace user to add them to this project.</p>
                  <form onSubmit={handleInviteMember} className="invite-form">
                    <div className="invite-input-row">
                      <input
                        type="email"
                        placeholder="friend@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        disabled={isInviting}
                        className="invite-email-input"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        disabled={isInviting}
                        className="invite-role-select"
                      >
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button type="submit" className="btn-primary invite-btn" disabled={isInviting}>
                        {isInviting ? 'Adding...' : 'Invite'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Share / Join Link UI */}
              <div className="sidebar-divider" style={{ margin: '20px 0' }}></div>
              <h3 className="subsection-title">Project Share Link</h3>
              <p className="invite-hint">Copy and send this secret link to let others join this project directly via Google or standard email signup.</p>
              <div className="invite-input-row" style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/dashboard/projects/${projectId}/join` : ''}
                  className="invite-email-input"
                  style={{ background: 'var(--bg-secondary)', cursor: 'text', fontFamily: 'monospace', fontSize: '11px' }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  className="btn-primary invite-btn"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(`${window.location.origin}/dashboard/projects/${projectId}/join`);
                      addToast('Share link copied to clipboard!', 'success');
                    }
                  }}
                >
                  🔗 Copy Link
                </button>
              </div>

              <div className="sidebar-divider" style={{ margin: '24px 0' }}></div>

              <h2 className="section-title text-red">⚠️ Destructive Zone</h2>
              <div className="settings-destructive-actions">
                <button type="button" className="btn-action-dest duplicate" onClick={handleDuplicateProject} disabled={isViewer}>
                  👥 Duplicate Project Copy
                </button>
                <button type="button" className="btn-action-dest archive" onClick={handleArchiveProject} disabled={isViewer}>
                  📦 Move Project to Archive
                </button>
                <button type="button" className="btn-action-dest delete" onClick={handleDeleteProject} disabled={isViewer}>
                  🗑️ Permanently Delete Project
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT DRAWER: TASK DETAIL DRAWER PANEL */}
      {isDrawerOpen && selectedTask && (
        <div 
          className="drawer-overlay" 
          onClick={() => {
            triggerEditing(selectedTask.id, false);
            setIsDrawerOpen(false);
          }}
        >
          <div className="drawer-panel glass animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-task-id">Task Editor</span>
              <div className="drawer-header-actions">
                {!isViewer && (
                  <button className="btn-action-delete" onClick={() => handleDeleteTask(selectedTask.id)} title="Delete Task">
                    🗑️ Delete
                  </button>
                )}
                <button 
                  className="btn-close-drawer" 
                  onClick={() => {
                    triggerEditing(selectedTask.id, false);
                    setIsDrawerOpen(false);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {isEditingLocked && (
              <div className="editing-lock-alert animate-pulse">
                ⚠️ <strong>{activeEditorName}</strong> is currently editing this task card.
              </div>
            )}

            <div className="drawer-subtabs-row">
              <button className={`subtab-btn ${drawerSubTab === 'details' ? 'active' : ''}`} onClick={() => setDrawerSubTab('details')}>
                ⚙️ Properties
              </button>
              <button className={`subtab-btn ${drawerSubTab === 'discussion' ? 'active' : ''}`} onClick={() => setDrawerSubTab('discussion')}>
                💬 Comments ({selectedTask.comments?.length || 0})
              </button>
              <button className={`subtab-btn ${drawerSubTab === 'history' ? 'active' : ''}`} onClick={() => setDrawerSubTab('history')}>
                ⏱️ Revisions ({taskLogs.length})
              </button>
            </div>

            <div className="drawer-body">
              {drawerSubTab === 'details' && (
                <>
                  <div className="drawer-section">
                    <input
                      type="text"
                      value={drawerTitle}
                      onChange={(e) => setDrawerTitle(e.target.value)}
                      onBlur={() => handleUpdateTaskField(selectedTask.id, { title: drawerTitle })}
                      disabled={isViewer || isEditingLocked}
                      className="task-title-input"
                    />
                    
                    <label className="section-label">Description</label>
                    <textarea
                      value={drawerDesc}
                      onChange={(e) => setDrawerDesc(e.target.value)}
                      onBlur={() => handleUpdateTaskField(selectedTask.id, { description: drawerDesc })}
                      placeholder="Add details for this task..."
                      disabled={isViewer || isEditingLocked}
                      className="task-desc-textarea"
                      rows={3}
                    />
                  </div>

                  <div className="drawer-section attributes-grid">
                    <div className="attr-item">
                      <span className="attr-label">Priority</span>
                      <select
                        value={drawerPriority}
                        onChange={(e) => {
                          setDrawerPriority(e.target.value);
                          handleUpdateTaskField(selectedTask.id, { priority: e.target.value });
                        }}
                        disabled={isViewer || isEditingLocked}
                        className="attr-select"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="attr-item">
                      <span className="attr-label">Status</span>
                      <select
                        value={drawerStatus}
                        onChange={(e) => {
                          setDrawerStatus(e.target.value);
                          handleUpdateTaskField(selectedTask.id, { status: e.target.value });
                        }}
                        disabled={isViewer || isEditingLocked}
                        className="attr-select"
                      >
                        <option value="backlog">Backlog</option>
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="attr-item">
                      <span className="attr-label">Due Date</span>
                      <input
                        type="date"
                        value={drawerDueDate}
                        onChange={(e) => {
                          setDrawerDueDate(e.target.value);
                          handleUpdateTaskField(selectedTask.id, { dueDate: e.target.value ? new Date(e.target.value) : null });
                        }}
                        disabled={isViewer || isEditingLocked}
                        className="attr-input"
                      />
                    </div>

                    <div className="attr-item">
                      <span className="attr-label">Estimate (Hrs)</span>
                      <input
                        type="number"
                        value={drawerEstimate}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value);
                          setDrawerEstimate(val);
                          handleUpdateTaskField(selectedTask.id, { timeEstimate: val === '' ? null : val });
                        }}
                        placeholder="None"
                        disabled={isViewer || isEditingLocked}
                        className="attr-input"
                      />
                    </div>
                  </div>

                  <div className="drawer-section">
                    <span className="section-label">Labels</span>
                    <div className="labels-selector-row">
                      {[
                        { name: 'Bug', color: '#ef4444' },
                        { name: 'Feature', color: '#3b82f6' },
                        { name: 'Refactor', color: '#f59e0b' },
                        { name: 'Docs', color: '#10b981' }
                      ].map((l) => (
                        <button
                          key={l.name}
                          onClick={() => handleAddLabel(l.name, l.color)}
                          disabled={isViewer || isEditingLocked}
                          className="tag-add-pill"
                          style={{ borderLeft: `4px solid ${l.color}` }}
                        >
                          ＋ {l.name}
                        </button>
                      ))}
                    </div>

                    {selectedTask.labels && selectedTask.labels.length > 0 && (
                      <div className="active-labels-row">
                        {selectedTask.labels.map((l: any, idx: number) => (
                          <span 
                            key={idx} 
                            className="label-pill" 
                            style={{ backgroundColor: `${l.color}15`, border: `1px solid ${l.color}`, color: l.color }}
                          >
                            {l.name}
                            {!(isViewer || isEditingLocked) && (
                              <button className="btn-tag-remove" onClick={() => handleRemoveLabel(l.name)}>✕</button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="drawer-section">
                    <span className="section-label">Subtasks List</span>
                    <div className="subtasks-list">
                      {selectedTask.subtasks && selectedTask.subtasks.map((sub: any) => (
                        <div key={sub.id} className="subtask-row">
                          <span className={`status-dot ${sub.status}`}>●</span>
                          <span className={`subtask-title ${sub.status === 'done' ? 'completed' : ''}`}>{sub.title}</span>
                          <select
                            value={sub.status}
                            onChange={(e) => handleUpdateTaskField(sub.id, { status: e.target.value })}
                            disabled={isViewer || isEditingLocked}
                            className="subtask-status-select"
                          >
                            <option value="todo">Todo</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Completed</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    {!(isViewer || isEditingLocked) && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCreateTask(newSubtaskTitle, 'todo', selectedTask.id);
                          setNewSubtaskTitle('');
                        }}
                        className="subtask-add-form"
                      >
                        <input
                          type="text"
                          placeholder="＋ Add subtask..."
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        />
                      </form>
                    )}
                  </div>

                  <div className="drawer-section">
                    <span className="section-label">Checklist Items</span>
                    <form onSubmit={handleAddChecklistItem} className="checklist-add-form">
                      <input
                        type="text"
                        placeholder="Add checklist item..."
                        value={newChecklistTitle}
                        onChange={(e) => setNewChecklistTitle(e.target.value)}
                        disabled={isViewer || isEditingLocked}
                      />
                    </form>

                    <div className="checklist-list">
                      {selectedTask.checklist && selectedTask.checklist.map((item: any) => (
                        <div key={item.id} className="checklist-item">
                          <label className="checklist-label">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleToggleChecklistItem(item.id, item.completed)}
                              disabled={isViewer || isEditingLocked}
                            />
                            <span className={item.completed ? 'completed' : ''}>{item.title}</span>
                          </label>
                          {!(isViewer || isEditingLocked) && (
                            <button className="btn-checklist-remove" onClick={() => handleDeleteChecklistItem(item.id)}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="drawer-section">
                    <span className="section-label">Dependencies</span>
                    
                    {!(isViewer || isEditingLocked) && (
                      <div className="dependency-add-controls">
                        <select
                          value={selectedDepTaskId}
                          onChange={(e) => setSelectedDepTaskId(e.target.value)}
                          className="dep-select"
                        >
                          <option value="">Link blocking task...</option>
                          {tasks
                            .filter((t) => t.id !== selectedTask.id && t.parentTaskId === null)
                            .map((t) => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                        <button className="btn-dep-add" onClick={handleAddDependency}>
                          Link
                        </button>
                      </div>
                    )}

                    <div className="dependencies-list">
                      {selectedTask.blockedBy && selectedTask.blockedBy.length > 0 && (
                        <div className="dependency-group">
                          <div className="dep-title text-red">⚠️ Blocked by:</div>
                          {selectedTask.blockedBy.map((dep: any) => (
                            <div key={dep.id} className="dep-item">
                              <span>{dep.title}</span>
                              {!(isViewer || isEditingLocked) && (
                                <button className="btn-unlink" onClick={() => handleRemoveDependency(dep.id)}>Unlink</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {drawerSubTab === 'discussion' && (
                <div className="drawer-section comments-section">
                  <span className="section-label">Discussion Feed</span>

                  <div className="comments-stack">
                    {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                      <p className="no-comments">No messages logged yet.</p>
                    ) : (
                      selectedTask.comments.map((c: any) => {
                        const avatar = c.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.user?.name || c.user?.email || 'U')}`;
                        return (
                          <div key={c.id} className="comment-bubble animate-scale-in">
                            <img src={avatar} alt="Avatar" className="comment-avatar" />
                            <div className="comment-content">
                              <div className="comment-author-row">
                                <strong>{c.user?.name || c.user?.email}</strong>
                                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="comment-text">{c.text}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {activeTypingUsers.length > 0 && (
                    <div className="typing-indicator animate-pulse">
                      💬 {activeTypingUsers.join(', ')} is typing...
                    </div>
                  )}

                  <form onSubmit={handlePostComment} className="comment-post-form">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => {
                        setCommentText(e.target.value);
                        triggerTyping(selectedTask.id, e.target.value.length > 0);
                      }}
                      onBlur={() => triggerTyping(selectedTask.id, false)}
                      placeholder="Post a comment..."
                      required
                    />
                    <button type="submit">Send</button>
                  </form>
                </div>
              )}

              {drawerSubTab === 'history' && (
                <div className="drawer-section task-history-tab">
                  <span className="section-label">Revision Audits</span>
                  <div className="task-logs-feed">
                    {taskLogs.map((log) => {
                      const avatar = log.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(log.user?.name || log.user?.email || 'U')}`;
                      const isTextCompare = log.action === 'update' && ['description', 'title'].includes(log.fieldName);
                      
                      return (
                        <div key={log.id} className="task-log-item animate-scale-in">
                          <div className="log-header">
                            <img src={avatar} alt="User" className="log-avatar" />
                            <div>
                              <strong>{log.user?.name || log.user?.email}</strong>
                              <span className="timestamp">{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                          </div>

                          <p className="log-text">
                            <span className={`log-badge ${log.action}`}>{log.action}</span>
                            {log.action === 'create' && `Created this task card`}
                            {log.action === 'comment' && `Commented: "${log.newValue}"`}
                            {log.action === 'restore' && `Restored property ${log.fieldName}`}
                            {log.action === 'update' && (
                              <>
                                Updated <code>{log.fieldName}</code> from <span className="old-text">"{log.oldValue || 'empty'}"</span> to <span className="new-text">"{log.newValue || 'empty'}"</span>
                              </>
                            )}
                          </p>

                          {isTextCompare && (
                            <div className="log-actions">
                              <button className="btn-compare" onClick={() => setCompareLog(log)}>
                                🔎 Diff Details
                              </button>
                              {!isViewer && (
                                <button className="btn-restore-link" onClick={() => handleRestoreVersion(log.id)}>
                                  🔄 Restore
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* THREAD REPLIES SIDE DRAWER PANEL */}
      {isThreadDrawerOpen && selectedParentMessage && (
        <div className="drawer-overlay" onClick={() => setIsThreadDrawerOpen(false)}>
          <div className="drawer-panel glass thread-drawer-panel animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-task-id">🧵 Discussion Thread</span>
              <button className="btn-close-drawer" onClick={() => setIsThreadDrawerOpen(false)}>✕</button>
            </div>

            <div className="drawer-body">
              <div className="thread-parent-message-card glass">
                <div className="chat-bubble-meta">
                  <strong>{selectedParentMessage.user?.name || selectedParentMessage.user?.email}</strong>
                  <span className="timestamp">{new Date(selectedParentMessage.createdAt).toLocaleString()}</span>
                </div>
                <p className="chat-text-payload parent-p">{renderMessageContent(selectedParentMessage.text)}</p>
                
                <div className="chat-actions-row">
                  <div className="reactions-picker">
                    {['👍', '❤️', '🔥', '🎉'].map(emoji => {
                      const reaction = selectedParentMessage.reactions?.find((r: any) => r.emoji === emoji);
                      const count = reaction ? reaction.userIds.length : 0;
                      const isReacted = reaction?.userIds.includes(user?.id);

                      return (
                        <button
                          key={emoji}
                          onClick={() => handleToggleChatMessageReaction(selectedParentMessage.id, emoji, false)}
                          className={`btn-emoji ${isReacted ? 'active' : ''}`}
                        >
                          {emoji} {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <span className="section-label">Replies</span>
              <div className="replies-timeline-stack">
                {(!selectedParentMessage.replies || selectedParentMessage.replies.length === 0) ? (
                  <div className="no-comments">No replies yet.</div>
                ) : (
                  selectedParentMessage.replies.map((reply: any) => {
                    const avatar = reply.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(reply.user?.name || reply.user?.email || 'U')}`;
                    return (
                      <div key={reply.id} className="reply-bubble-item animate-scale-in">
                        <img src={avatar} alt="User Avatar" className="reply-avatar-sm" />
                        <div className="reply-content-box">
                          <div className="chat-bubble-meta">
                            <strong>{reply.user?.name || reply.user?.email}</strong>
                            <span className="timestamp">{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="chat-text-payload">{renderMessageContent(reply.text)}</p>

                          <div className="chat-actions-row">
                            <div className="reactions-picker">
                              {['👍', '❤️', '🔥', '🎉'].map(emoji => {
                                const reaction = reply.reactions?.find((r: any) => r.emoji === emoji);
                                const count = reaction ? reaction.userIds.length : 0;
                                const isReacted = reaction?.userIds.includes(user?.id);

                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleToggleChatMessageReaction(reply.id, emoji, true)}
                                    className={`btn-emoji ${isReacted ? 'active' : ''}`}
                                  >
                                    {emoji} {count > 0 && <span>{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={threadEndRef} />
              </div>
            </div>

            <div className="chat-input-controls thread-inputs">
              <form onSubmit={(e) => handleSendChatMessage(e, selectedParentMessage.id)} className="chat-submission-form">
                <input
                  type="text"
                  placeholder="Reply in thread..."
                  value={threadInputText}
                  onChange={(e) => setThreadInputText(e.target.value)}
                />
                <button type="submit" className="btn-chat-send">Send</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI CHAT DISCUSSION SUMMARY MODAL */}
      {isAiSummaryOpen && aiSummary && (
        <div className="modal-overlay" onClick={() => setIsAiSummaryOpen(false)}>
          <div className="modal-card glass ai-summary-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🪄 AI Chat Executive Summary</h2>
              <button className="btn-close-modal" onClick={() => setIsAiSummaryOpen(false)}>✕</button>
            </div>

            <div className="ai-summary-modal-body">
              <div className="ai-summary-pane-content">
                {aiSummary.split('\n').map((line, idx) => {
                  if (line.startsWith('###')) {
                    return <h3 key={idx} className="sum-h3">{line.replace('###', '')}</h3>;
                  }
                  if (line.startsWith('**')) {
                    return <strong key={idx} className="sum-strong">{line.replaceAll('**', '')}</strong>;
                  }
                  return <p key={idx} className="sum-p">{line}</p>;
                })}
              </div>
            </div>

            <div className="modal-actions-footer">
              <button className="btn-primary" onClick={() => setIsAiSummaryOpen(false)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION TOAST BANNER FOR UNDO */}
      {showUndoBanner && (
        <div className="global-undo-banner animate-slide-up glass">
          <span>{undoMessage}. Revert last action?</span>
          <button className="btn-undo-trigger" onClick={handleGlobalUndo}>Revert</button>
          <button className="btn-undo-dismiss" onClick={() => setShowUndoBanner(false)}>✕</button>
        </div>
      )}

      {/* WORD-LEVEL DIFF MODAL */}
      {compareLog && (
        <div className="modal-overlay" onClick={() => setCompareLog(null)}>
          <div className="modal-card diff-modal glass animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Compare Revision Versions ({compareLog.fieldName})</h2>
              <button className="btn-close-modal" onClick={() => setCompareLog(null)}>✕</button>
            </div>

            <div className="diff-modal-body">
              <div className="split-compare-grid">
                <div className="compare-pane previous">
                  <h3>Previous</h3>
                  <div className="pane-content">{compareLog.oldValue || 'Empty'}</div>
                </div>
                <div className="compare-pane current">
                  <h3>Updated</h3>
                  <div className="pane-content">{compareLog.newValue || 'Empty'}</div>
                </div>
              </div>

              <div className="word-diff-section">
                <h3>Word-level Changes</h3>
                <div className="word-diff-highlight-pane">
                  {(() => {
                    const tokens = computeWordDiff(compareLog.oldValue || '', compareLog.newValue || '');
                    return tokens.map((token, idx) => {
                      if (token.type === 'added') {
                        return <ins key={idx} className="diff-added">{token.value}</ins>;
                      } else if (token.type === 'removed') {
                        return <del key={idx} className="diff-removed">{token.value}</del>;
                      }
                      return <span key={idx}>{token.value}</span>;
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="modal-actions-footer">
              <button className="btn-secondary" onClick={() => setCompareLog(null)}>
                Dismiss
              </button>
              {!isViewer && (
                <button className="btn-primary" onClick={() => handleRestoreVersion(compareLog.id)}>
                  🔄 Restore version
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RIGHT DRAWER: FILE DETAIL PANEL */}
      {isFileDrawerOpen && selectedFile && (
        <div className="drawer-overlay" onClick={() => setIsFileDrawerOpen(false)}>
          <div className="drawer-panel glass animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-task-id">Document Inspector</span>
              <button className="btn-close-drawer" onClick={() => setIsFileDrawerOpen(false)}>✕</button>
            </div>

            <div className="drawer-subtabs-row">
              <button className={`subtab-btn ${fileDrawerSubTab === 'preview' ? 'active' : ''}`} onClick={() => setFileDrawerSubTab('preview')}>
                🖼️ Preview
              </button>
              <button className={`subtab-btn ${fileDrawerSubTab === 'versions' ? 'active' : ''}`} onClick={() => setFileDrawerSubTab('versions')}>
                Revisions
              </button>
              <button className={`subtab-btn ${fileDrawerSubTab === 'ai' ? 'active' : ''}`} onClick={() => setFileDrawerSubTab('ai')}>
                ✨ Coprocessor
              </button>
            </div>

            <div className="drawer-body">
              {fileDrawerSubTab === 'preview' && (
                <div className="drawer-section">
                  <strong style={{ fontSize: '14px', color: 'var(--fg-primary)', display: 'block', marginBottom: '12px' }}>
                    {selectedFile.name}
                  </strong>

                  {selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                    <div className="simulated-pdf-viewer glass">
                      <div className="pdf-page-canvas">
                        <h4>📄 PDF pre-viewer framework</h4>
                        <p className="pdf-page-mark">Document: {selectedFile.name}</p>
                        <p style={{ fontStyle: 'italic', color: 'var(--fg-tertiary)', marginTop: '20px' }}>
                          Page {pdfPage} of 3
                        </p>
                      </div>
                      <div className="pdf-page-controls">
                        <button className="btn-arrow" onClick={() => setPdfPage(p => Math.max(1, p - 1))}>◀</button>
                        <span>Page {pdfPage}</span>
                        <button className="btn-arrow" onClick={() => setPdfPage(p => Math.min(3, p + 1))}>▶</button>
                      </div>
                    </div>
                  ) : selectedFile.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/) ? (
                    <div className="simulated-img-viewer glass">
                      <img src={selectedFile.versions?.[0]?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60'} alt="Image Preview" className="preview-asset-img" />
                    </div>
                  ) : (
                    <div className="simulated-csv-viewer glass">
                      <p className="no-comments">No preview canvas available for this format.</p>
                    </div>
                  )}

                  <button
                    className="btn-primary"
                    style={{ marginTop: '20px', width: '100%', textAlign: 'center' }}
                    onClick={() => handleDownloadFileAction(selectedFile.currentVersion)}
                  >
                    📥 Download (v{selectedFile.currentVersion})
                  </button>
                </div>
              )}

              {fileDrawerSubTab === 'versions' && (
                <div className="drawer-section">
                  <span className="section-label">Revision Audits</span>
                  <div className="task-logs-feed">
                    {selectedFile.versions?.map((v: any) => (
                      <div key={v.id} className="task-log-item animate-scale-in">
                        <div className="log-header">
                          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(v.user?.name || v.user?.email || 'U')}`} alt="Avatar" className="log-avatar" />
                          <div>
                            <strong>v{v.version} • {v.user?.name || v.user?.email}</strong>
                            <span className="timestamp">{new Date(v.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <button className="btn-compare" style={{ width: 'fit-content', marginTop: '6px' }} onClick={() => handleDownloadFileAction(v.version)}>
                          📥 Download v{v.version}
                        </button>
                      </div>
                    ))}
                  </div>

                  {!isViewer && (
                    <button className="btn-upload-mock" style={{ marginTop: '20px' }} onClick={handleUploadNewVersionAction}>
                      📤 Upload New Version
                    </button>
                  )}
                </div>
              )}

              {fileDrawerSubTab === 'ai' && (
                <div className="drawer-section">
                  <span className="section-label">AI Coprocessor Tools</span>
                  <div className="dependency-add-controls" style={{ gap: '10px' }}>
                    <button className="btn-primary" onClick={() => handleRunFileAiAction('summary')}>
                      🪄 AI Document Summary
                    </button>
                    <button className="btn-secondary" onClick={() => handleRunFileAiAction('ocr')} disabled={!selectedFile.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/)}>
                      🔍 Extract Text (AI OCR)
                    </button>
                  </div>

                  {fileAiResult && (
                    <div className="ai-summary-pane-content" style={{ marginTop: '16px', background: 'var(--bg-primary)' }}>
                      {fileAiResult.split('\n').map((line, idx) => {
                        if (line.startsWith('###')) {
                          return <h3 key={idx} className="sum-h3">{line.replace('###', '')}</h3>;
                        }
                        if (line.startsWith('**')) {
                          return <strong key={idx} className="sum-strong">{line.replaceAll('**', '')}</strong>;
                        }
                        return <p key={idx} className="sum-p">{line}</p>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTION: COMMAND PALETTE DIALOG OVERLAY */}
      {isCommandPaletteOpen && (
        <div className="command-palette-overlay" onClick={() => setIsCommandPaletteOpen(false)}>
          <div className="command-palette-card animate-scale-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command Palette">
            <input
              type="text"
              placeholder="Search actions or navigations... (e.g. board, chat, theme)"
              value={commandSearch}
              onChange={(e) => setCommandSearch(e.target.value)}
              className="command-input"
              autoFocus
            />

            <div className="command-list">
              {filteredCommands.length === 0 ? (
                <div className="no-comments" style={{ padding: '20px' }}>No matching shortcuts.</div>
              ) : (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    className="command-item"
                    onClick={() => {
                      cmd.action();
                      setIsCommandPaletteOpen(false);
                      setCommandSearch('');
                    }}
                  >
                    {cmd.name}
                  </button>
                ))
              )}
            </div>

            <div className="command-palette-footer">
              <span>Use ↑↓ to browse, ↵ to select</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM FLOATING AI ASSISTANT CHAT PANEL (ChatGPT Style, minimized/maximized) */}
      <div className={`floating-ai-wrapper ${isAiCoprocessorOpen ? 'expanded' : 'minimized'}`}>
        {isAiCoprocessorOpen ? (
          <div className="ai-coprocessor-card glass animate-scale-in">
            <div className="ai-card-header">
              <span className="title">🤖 AI Coprocessor</span>
              <button className="btn-minimize-ai" onClick={() => setIsAiCoprocessorOpen(false)}>✕</button>
            </div>
            
            <div className="ai-chat-body">
              <div className="ai-messages-stream">
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`ai-bubble-row ${msg.sender}`}>
                    <div className="ai-bubble-content">
                      {msg.text.split('\n').map((line, lIdx) => {
                        if (line.startsWith('###')) {
                          return <h3 key={lIdx} style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', margin: '6px 0 2px 0' }}>{line.replace('###', '')}</h3>;
                        }
                        if (line.startsWith('- **') || line.startsWith('• **')) {
                          return <p key={lIdx} style={{ fontSize: '11px', margin: '3px 0', paddingLeft: '6px' }}>{line}</p>;
                        }
                        return <p key={lIdx} style={{ fontSize: '11px', margin: '3px 0' }}>{line}</p>;
                      })}
                      {msg.actionPayload && (
                        <button onClick={() => handleExecuteAiAction(msg.actionPayload)} className="btn-ai-action-execute animate-pulse">
                          ✨ Apply Suggestions
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isAiResponding && (
                  <div className="ai-bubble-row ai">
                    <div className="ai-bubble-content animate-pulse" style={{ color: 'var(--fg-tertiary)' }}>
                      Analyzing...
                    </div>
                  </div>
                )}
                <div ref={aiChatEndRef} />
              </div>

              {/* Suggestions Quick keys */}
              <div className="ai-suggestions-grid">
                {[
                  'What changed today?',
                  'Find blockers',
                  'Generate sprint',
                  'Suggest priorities'
                ].map((txt) => (
                  <button key={txt} onClick={() => handleAskAi(txt)} className="ai-suggestion-badge" disabled={isAiResponding}>
                    {txt}
                  </button>
                ))}
              </div>
            </div>

            <div className="ai-card-footer">
              <form onSubmit={(e) => { e.preventDefault(); handleAskAi(aiInputText); }} className="ai-input-form">
                <input
                  type="text"
                  placeholder="Ask about task details, deadlines..."
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  disabled={isAiResponding}
                />
                <button type="submit" disabled={isAiResponding}>Ask</button>
              </form>
            </div>
          </div>
        ) : (
          <button className="btn-floating-ai-trigger glow-effect" onClick={() => setIsAiCoprocessorOpen(true)} title="Open AI Coprocessor">
            🤖 Ask AI
          </button>
        )}
      </div>

      <style jsx>{`
        .workspace-container {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          height: calc(100vh - 52px);
          overflow: hidden;
          background: var(--bg-primary);
        }

        /* Offline Warning banner styling */
        .offline-warning-banner {
          background: linear-gradient(90deg, #b45309 0%, #d97706 100%);
          color: white;
          padding: 6px;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          z-index: 1500;
          box-shadow: var(--shadow-sm);
          border-radius: var(--radius-sm);
        }

        /* Header block styling */
        .workspace-header {
          padding: 16px 20px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }
        .project-title-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-grow: 1;
        }
        .folder-icon {
          font-size: 24px;
        }
        .project-title-info h2 {
          font-size: 16px;
          font-weight: 800;
          color: var(--fg-primary);
          letter-spacing: -0.03em;
        }
        .project-title-info .description {
          font-size: 12px;
          color: var(--fg-secondary);
          margin-top: 2px;
        }

        .header-meta-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .presence-avatars-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-primary);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }
        .status-badge-connection {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--fg-secondary);
        }
        .status-badge-connection.connected { color: var(--success); }
        .status-badge-connection.connecting { color: var(--warning); }
        .status-badge-connection.fallback { color: var(--info); }
        .status-badge-connection.disconnected { color: var(--error); }

        .avatars-group {
          display: flex;
          align-items: center;
        }
        .presence-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1.5px solid var(--bg-secondary);
          margin-left: -6px;
          background: var(--bg-tertiary);
        }
        .presence-avatar:first-child {
          margin-left: 0;
        }

        .btn-fav-star {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 5px 10px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--fg-secondary);
          font-weight: 600;
          cursor: pointer;
          transition: border-color var(--transition-fast);
        }
        .btn-fav-star:hover {
          color: var(--warning);
          border-color: var(--border-hover);
        }
        .btn-fav-star.active {
          color: var(--warning);
          background: rgba(245,158,11,0.06);
          border-color: rgba(245,158,11,0.2);
        }

        /* Tabs bar */
        .header-tabs-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-color);
          padding-top: 10px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .view-switcher-tabs {
          display: flex;
          gap: 4px;
        }
        .tab-btn {
          border: none;
          background: none;
          color: var(--fg-secondary);
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .tab-btn:hover {
          background: var(--bg-primary);
          color: var(--fg-primary);
        }
        .tab-btn.active {
          background: rgba(79,70,229,0.08);
          color: var(--primary);
        }

        .project-completion-badge {
          display: flex;
          align-items: center;
        }
        .progress-bar-container {
          display: flex;
          flex-direction: column;
          gap: 3px;
          align-items: flex-end;
          font-size: 10px;
          color: var(--fg-secondary);
        }
        .mini-progress-bg {
          width: 100px;
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: 2px;
          overflow: hidden;
        }
        .mini-progress-fill {
          height: 100%;
          background: var(--primary);
        }

        /* Workspace Content Body container */
        .workspace-content {
          flex-grow: 1;
          overflow: hidden;
          position: relative;
        }

        /* TAB 1: OVERVIEW TAB DESIGN */
        .overview-tab-layout {
          height: 100%;
          overflow-y: auto;
          padding-bottom: 24px;
        }
        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
        }
        .overview-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .overview-card-label {
          font-size: 9px;
          font-weight: 800;
          color: var(--fg-tertiary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .health-radial-box {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .health-text-details h3 {
          font-size: 14px;
          font-weight: 800;
          color: var(--fg-primary);
        }
        .health-text-details p {
          font-size: 11px;
          color: var(--fg-secondary);
          margin-top: 2px;
        }
        .overview-mini-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          border-top: 1px solid var(--border-color);
          padding-top: 14px;
        }
        .mini-metric {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .mini-metric span {
          font-size: 10px;
          color: var(--fg-tertiary);
        }
        .mini-metric strong {
          font-size: 13px;
          color: var(--fg-primary);
        }
        .mini-list-preview {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mini-list-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 12px;
          cursor: pointer;
        }
        .mini-list-item:hover {
          border-color: var(--border-hover);
        }
        .mini-list-item strong {
          flex-grow: 1;
          color: var(--fg-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mini-list-item .meta {
          font-size: 9px;
          color: var(--fg-tertiary);
        }
        .members-profile-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .member-profile-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .member-profile-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
        }
        .member-profile-info {
          display: flex;
          flex-direction: column;
        }
        .member-profile-info strong {
          font-size: 11px;
          color: var(--fg-primary);
        }
        .member-profile-info span {
          font-size: 9px;
          color: var(--fg-tertiary);
        }

        /* 2. KANBAN BOARD */
        .kanban-board-layout {
          display: flex;
          gap: 16px;
          height: 100%;
          overflow-x: auto;
          align-items: stretch;
          padding-bottom: 8px;
        }
        .kanban-column {
          width: 260px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          padding: 16px;
          max-height: 100%;
          overflow-y: auto;
          background: rgba(255,255,255,0.005);
        }
        .column-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          gap: 8px;
        }
        .col-indicator {
          font-size: 10px;
        }
        .col-indicator.backlog { color: var(--fg-tertiary); }
        .col-indicator.todo { color: var(--info); }
        .col-indicator.in_progress { color: var(--primary); }
        .col-indicator.done { color: var(--success); }
        .col-indicator.cancelled { color: var(--error); }

        .column-header h3 {
          font-size: 11px;
          font-weight: 800;
          color: var(--fg-secondary);
          flex-grow: 1;
          letter-spacing: 0.05em;
        }
        .col-count {
          font-size: 9px;
          background: var(--bg-tertiary);
          color: var(--fg-secondary);
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: 700;
        }

        .quick-add-form {
          margin-bottom: 12px;
        }
        .quick-add-form input {
          width: 100%;
          padding: 6px 10px;
          background: var(--bg-secondary);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--fg-primary);
          font-size: 11px;
          outline: none;
        }
        .quick-add-form input:focus {
          border-color: var(--border-focus);
        }

        .cards-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-grow: 1;
          overflow-y: auto;
        }
        .column-empty {
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-md);
          padding: 20px;
          text-align: center;
          color: var(--fg-tertiary);
          font-size: 11px;
          font-style: italic;
        }

        /* Kanban task card styles */
        .task-card {
          padding: 12px;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .task-card:hover {
          border-color: var(--border-hover);
          box-shadow: var(--shadow-md);
        }
        .task-card.locked {
          border-left: 3px solid var(--primary);
        }
        .card-top-tags {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
        }
        .prio-pill {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 1px 4px;
          border-radius: 3px;
          margin-right: auto;
        }
        .prio-pill.low { background: rgba(113,113,122,0.08); color: var(--fg-secondary); }
        .prio-pill.medium { background: rgba(59,130,246,0.08); color: var(--info); }
        .prio-pill.high { background: rgba(245,158,11,0.08); color: var(--warning); }
        .prio-pill.urgent { background: rgba(239,68,68,0.08); color: var(--error); }

        .editing-badge-dot {
          font-size: 8px;
          background: var(--primary-glow);
          color: var(--primary);
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: 600;
        }
        
        .star-tag {
          color: var(--warning);
          font-size: 11px;
        }
        .task-card h4 {
          font-size: 12px;
          font-weight: 600;
          color: var(--fg-primary);
          line-height: 1.4;
        }
        .card-desc {
          font-size: 11px;
          color: var(--fg-secondary);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-labels {
          display: flex;
          gap: 3px;
        }
        .label-dot {
          width: 10px;
          height: 3px;
          border-radius: 1.5px;
        }

        .card-footer-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-color);
          padding-top: 6px;
          font-size: 9px;
        }
        .due-alert {
          color: var(--fg-secondary);
        }
        .due-alert.overdue {
          color: var(--error);
          font-weight: 700;
        }
        .right-indicators {
          display: flex;
          gap: 6px;
          color: var(--fg-tertiary);
        }

        /* 3. LIST VIEW */
        .list-view-layout {
          height: 100%;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .list-toolbar {
          padding: 10px 16px;
          display: flex;
          gap: 10px;
          border-bottom: 1px solid var(--border-color);
          align-items: center;
        }
        .search-field {
          flex-grow: 1;
          max-width: 220px;
          padding: 5px 10px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--fg-primary);
          font-size: 12px;
          outline: none;
        }
        .select-field {
          padding: 5px 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--fg-primary);
          font-size: 12px;
          outline: none;
        }
        .table-wrapper {
          flex-grow: 1;
          overflow-y: auto;
        }
        .list-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          text-align: left;
        }
        .list-table th,
        .list-table td {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-color);
        }
        .list-table th {
          background: rgba(255,255,255,0.01);
          font-size: 10px;
          font-weight: 800;
          color: var(--fg-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .clickable-row {
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .clickable-row:hover {
          background: var(--bg-secondary);
        }
        .task-title-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .task-title-cell .bullet {
          color: var(--primary);
          font-size: 8px;
        }
        .subtask-parent-tag {
          font-size: 8px;
          background: var(--bg-tertiary);
          color: var(--fg-tertiary);
          padding: 1px 3px;
          border-radius: 2px;
        }

        .status-badge {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 1px 4px;
          border-radius: 3px;
        }
        .status-badge.backlog { background: rgba(113,113,122,0.08); color: var(--fg-secondary); }
        .status-badge.todo { background: rgba(59,130,246,0.08); color: var(--info); }
        .status-badge.in_progress { background: rgba(79,70,229,0.08); color: var(--primary); }
        .status-badge.done { background: rgba(34,197,94,0.08); color: var(--success); }
        .status-badge.cancelled { background: rgba(239,68,68,0.08); color: var(--error); }

        .priority-text.low { color: var(--fg-secondary); }
        .priority-text.medium { color: var(--info); }
        .priority-text.high { color: var(--warning); }
        .priority-text.urgent { color: var(--error); font-weight: 700; }
        .indicators-cell {
          color: var(--fg-tertiary);
          font-size: 10px;
        }
        .no-tasks {
          color: var(--fg-tertiary);
          font-style: italic;
          padding: 24px;
        }

        /* 4. CALENDAR PLANNER VIEW */
        .calendar-view-layout {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 12px;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .calendar-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .calendar-toolbar h2 {
          font-size: 14px;
          font-weight: 800;
          color: var(--fg-primary);
        }
        .btn-arrow {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          color: var(--fg-primary);
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-auto-rows: minmax(60px, 1fr);
          gap: 1px;
          background: var(--border-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
          flex-grow: 1;
        }
        .calendar-day-header {
          background: var(--bg-secondary);
          padding: 6px;
          text-align: center;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--fg-tertiary);
          letter-spacing: 0.05em;
        }
        .calendar-day {
          background: var(--bg-primary);
          padding: 4px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-height: 0;
          overflow: hidden;
        }
        .calendar-day.empty {
          background: var(--bg-secondary);
          opacity: 0.2;
        }
        .day-number {
          font-size: 9px;
          font-weight: 700;
          color: var(--fg-tertiary);
          align-self: flex-end;
        }
        .day-tasks-stack {
          display: flex;
          flex-direction: column;
          gap: 1.5px;
          overflow-y: auto;
          flex-grow: 1;
        }
        .day-task-pill {
          font-size: 8px;
          font-weight: 600;
          padding: 1px 4px;
          border-radius: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
        }

        /* 5. ACTIVITY TIMELINE */
        .timeline-layout {
          height: 100%;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .timeline-toolbar {
          padding: 10px 16px;
          display: flex;
          gap: 10px;
          border-bottom: 1px solid var(--border-color);
          align-items: center;
        }
        .timeline-timeline-feed {
          flex-grow: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .timeline-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
        }
        .timeline-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          flex-shrink: 0;
        }
        .timeline-log-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-grow: 1;
        }
        .timeline-card-meta {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .timeline-card-meta .timestamp {
          color: var(--fg-tertiary);
          font-size: 10px;
        }
        .timeline-text {
          font-size: 12px;
          color: var(--fg-primary);
          line-height: 1.4;
        }
        .log-badge {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 1px 4px;
          border-radius: 2px;
        }
        .log-badge.create { background: rgba(34,197,94,0.08); color: var(--success); }
        .log-badge.update { background: rgba(79,70,229,0.08); color: var(--primary); }
        .log-badge.comment { background: rgba(59,130,246,0.08); color: var(--info); }
        .log-badge.restore { background: rgba(245,158,11,0.08); color: var(--warning); }
        .log-badge.delete { background: rgba(239,68,68,0.08); color: var(--error); }

        .old-text { color: var(--fg-tertiary); text-decoration: line-through; padding: 0 2px; }
        .new-text { color: var(--success); font-weight: 600; padding: 0 2px; }
        
        .timeline-card-actions {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }
        .btn-compare {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          font-size: 10px;
          padding: 3px 6px;
          border-radius: var(--radius-sm);
          color: var(--fg-secondary);
          cursor: pointer;
        }
        .btn-compare:hover {
          color: var(--fg-primary);
        }
        .btn-restore-link {
          background: none;
          border: none;
          color: var(--primary);
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .timeline-empty {
          color: var(--fg-tertiary);
          font-style: italic;
          text-align: center;
          padding: 24px;
        }

        /* 6. TEAM CHAT MODULE STYLES */
        .chat-layout {
          height: 100%;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--bg-secondary);
        }
        .chat-toolbar {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .chat-heading {
          font-size: 13px;
          font-weight: 800;
          color: var(--fg-primary);
        }
        .btn-ai-summary {
          background: var(--primary);
          color: white;
          border: none;
          padding: 5px 10px;
          font-size: 11px;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .chat-message-stream {
          flex-grow: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .chat-bubble-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .chat-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          flex-shrink: 0;
        }
        .chat-message-content {
          display: flex;
          flex-direction: column;
          gap: 3px;
          background: var(--bg-primary);
          padding: 10px 14px;
          border-radius: 0 var(--radius-md) var(--radius-md) var(--radius-md);
          border: 1px solid var(--border-color);
          max-width: 80%;
        }
        .chat-bubble-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .chat-bubble-meta strong {
          font-size: 11px;
          color: var(--fg-primary);
        }
        .chat-bubble-meta .timestamp {
          font-size: 9px;
          color: var(--fg-tertiary);
        }
        .chat-text-payload {
          font-size: 12px;
          color: var(--fg-primary);
          line-height: 1.4;
          white-space: pre-wrap;
        }
        :global(.chat-mention) {
          color: var(--primary) !important;
          background: var(--primary-glow);
          padding: 1px 3px;
          border-radius: 2px;
          font-weight: 700;
        }
        .chat-shared-files {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 6px;
        }
        .file-attachment-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          font-size: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-dl {
          color: var(--primary);
          font-weight: 700;
        }

        .chat-actions-row {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.02);
          padding-top: 6px;
        }
        .btn-reply-thread {
          background: none;
          border: none;
          color: var(--fg-secondary);
          font-size: 10px;
          cursor: pointer;
          font-weight: 600;
        }
        .reactions-picker {
          display: flex;
          gap: 3px;
        }
        .btn-emoji {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 3px;
          padding: 1px 5px;
          font-size: 10px;
          cursor: pointer;
        }
        .btn-emoji.active {
          background: var(--primary-glow);
          border-color: var(--primary);
          color: var(--primary);
        }
        .read-receipts-indicator {
          margin-left: auto;
          color: var(--primary);
          font-size: 10px;
        }
        .receipts-count {
          font-size: 8px;
          font-weight: 700;
        }

        .chat-input-controls {
          padding: 12px 20px;
          border-top: 1px solid var(--border-color);
          background: rgba(255,255,255,0.01);
          position: relative;
        }
        .chat-typing-status {
          position: absolute;
          top: -20px;
          left: 20px;
          font-size: 10px;
          color: var(--info);
          font-style: italic;
        }
        .chat-queued-files {
          display: flex;
          gap: 4px;
          margin-bottom: 6px;
        }
        .queued-file-pill {
          background: var(--primary-glow);
          border: 1px solid rgba(79, 70, 229, 0.2);
          color: var(--primary);
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-q-del {
          border: none;
          background: none;
          color: inherit;
          cursor: pointer;
          font-size: 8px;
        }
        .chat-submission-form {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .btn-attach-clip {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--fg-secondary);
        }
        .chat-submission-form input {
          flex-grow: 1;
          padding: 8px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-primary);
          font-size: 12px;
          outline: none;
        }
        .chat-submission-form input:focus {
          border-color: var(--border-focus);
        }
        .btn-chat-send {
          background: var(--primary);
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: var(--radius-md);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .chat-empty {
          color: var(--fg-tertiary);
          font-style: italic;
          padding: 24px;
        }

        /* RIGHT DRAWER TASK DETAIL PANEL styling */
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
        }
        .drawer-panel {
          width: 100%;
          max-width: 480px;
          height: 100%;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }
        .drawer-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .drawer-task-id {
          font-size: 10px;
          font-weight: 800;
          color: var(--fg-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .btn-action-delete {
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.15);
          color: var(--error);
          padding: 3px 6px;
          border-radius: var(--radius-sm);
          font-size: 10px;
          cursor: pointer;
        }
        .btn-close-drawer {
          border: none;
          background: none;
          color: var(--fg-tertiary);
          font-size: 16px;
          cursor: pointer;
        }

        .editing-lock-alert {
          background: rgba(245,158,11,0.06);
          border-bottom: 1px solid rgba(245,158,11,0.15);
          color: var(--warning);
          font-size: 11px;
          padding: 8px 20px;
          text-align: center;
        }

        /* Drawer Sub-tabs styling */
        .drawer-subtabs-row {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          background: rgba(0,0,0,0.05);
        }
        .drawer-subtabs-row .subtab-btn {
          flex: 1;
          background: none;
          border: none;
          color: var(--fg-secondary);
          font-size: 11px;
          font-weight: 600;
          padding: 10px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        .drawer-subtabs-row .subtab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
          background: var(--bg-secondary);
        }

        .drawer-body {
          flex-grow: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .drawer-section {
          display: flex;
          flex-direction: column;
        }
        .task-title-input {
          font-size: 16px;
          font-weight: 800;
          color: var(--fg-primary);
          background: none;
          border: none;
          border-bottom: 1px dashed var(--border-color);
          padding: 2px 0;
          margin-bottom: 12px;
          outline: none;
          width: 100%;
        }
        .section-label {
          font-size: 9px;
          font-weight: 800;
          color: var(--fg-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .task-desc-textarea {
          padding: 8px 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-primary);
          font-size: 12px;
          outline: none;
          resize: vertical;
        }

        /* Attributes Grid */
        .attributes-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }
        .attr-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .attr-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--fg-tertiary);
        }
        .attr-select,
        .attr-input {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--fg-primary);
          font-size: 12px;
          padding: 5px 8px;
          border-radius: var(--radius-sm);
          outline: none;
        }

        /* Labels row styles */
        .labels-selector-row {
          display: flex;
          gap: 4px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .tag-add-pill {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          font-size: 10px;
          padding: 3px 6px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--fg-secondary);
        }
        .active-labels-row {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .label-pill {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-tag-remove {
          border: none;
          background: none;
          color: inherit;
          cursor: pointer;
          font-size: 8px;
        }
        .tags-add-form input {
          width: 100%;
          padding: 5px 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--fg-primary);
          font-size: 11px;
          outline: none;
        }

        /* Subtasks lists drawer styling */
        .subtasks-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 8px;
        }
        .subtask-row {
          display: flex;
          align-items: center;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 5px 10px;
          border-radius: var(--radius-sm);
          gap: 10px;
        }
        .subtask-title {
          font-size: 11px;
          flex-grow: 1;
        }
        .subtask-title.completed {
          text-decoration: line-through;
          color: var(--fg-tertiary);
        }
        .status-dot {
          font-size: 8px;
        }
        .status-dot.todo { color: var(--info); }
        .status-dot.in_progress { color: var(--primary); }
        .status-dot.done { color: var(--success); }

        .subtask-status-select {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          font-size: 10px;
          padding: 1px 4px;
          color: var(--fg-primary);
          border-radius: 2px;
        }
        .subtask-add-form input {
          width: 100%;
          padding: 5px 8px;
          background: var(--bg-primary);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--fg-primary);
          font-size: 11px;
          outline: none;
        }

        /* Checklists list drawer styling */
        .checklist-add-form input {
          width: 100%;
          padding: 6px 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--fg-primary);
          font-size: 11px;
          outline: none;
          margin-bottom: 8px;
        }
        .checklist-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .checklist-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }
        .checklist-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 11px;
        }
        .checklist-label span.completed {
          text-decoration: line-through;
          color: var(--fg-tertiary);
        }
        .btn-checklist-remove {
          border: none;
          background: none;
          color: var(--fg-tertiary);
          cursor: pointer;
        }

        /* Dependency styles */
        .dependency-add-controls {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }
        .dep-select {
          flex-grow: 1;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--fg-primary);
          font-size: 11px;
          padding: 5px 8px;
          border-radius: var(--radius-sm);
          outline: none;
        }
        .btn-dep-add {
          background: var(--primary);
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 11px;
        }
        .dependencies-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .dependency-group {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px;
        }
        .dep-title {
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .dep-item {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          padding: 2px 0;
        }
        .btn-unlink {
          border: none;
          background: none;
          color: var(--error);
          font-size: 9px;
          cursor: pointer;
        }

        /* Comments timeline */
        .comments-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 10px;
          background: var(--bg-primary);
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }
        .comment-bubble {
          display: flex;
          gap: 8px;
        }
        .comment-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--bg-secondary);
        }
        .comment-content {
          display: flex;
          flex-direction: column;
          gap: 3px;
          background: var(--bg-secondary);
          padding: 6px 10px;
          border-radius: var(--radius-md);
          flex-grow: 1;
        }
        .comment-author-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: var(--fg-tertiary);
        }
        .comment-text {
          font-size: 11px;
          color: var(--fg-primary);
          line-height: 1.4;
        }

        .typing-indicator {
          font-size: 10px;
          color: var(--info);
          margin-bottom: 8px;
          font-style: italic;
        }

        .comment-post-form {
          display: flex;
          gap: 6px;
        }
        .comment-post-form input {
          flex-grow: 1;
          padding: 6px 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--fg-primary);
          font-size: 12px;
          outline: none;
        }
        .comment-post-form button {
          background: var(--primary);
          color: white;
          border: none;
          padding: 0 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .no-comments {
          font-size: 11px;
          color: var(--fg-tertiary);
          font-style: italic;
          text-align: center;
          padding: 12px;
        }

        /* Drawer History Tab Revisions log item styles */
        .task-logs-feed {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .task-log-item {
          padding: 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .log-header {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .log-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--bg-secondary);
        }
        .log-header strong {
          font-size: 11px;
          color: var(--fg-primary);
        }
        .log-header .timestamp {
          font-size: 9px;
          color: var(--fg-tertiary);
        }
        .log-text {
          font-size: 11px;
          color: var(--fg-primary);
          line-height: 1.4;
        }
        .log-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        /* Floating Undo banner */
        .global-undo-banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(255,255,255,0.05);
          background: #18181b;
          box-shadow: var(--shadow-lg);
          color: white;
          font-size: 12px;
        }
        .btn-undo-trigger {
          background: var(--primary);
          color: white;
          border: none;
          font-weight: 700;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .btn-undo-dismiss {
          background: none;
          border: none;
          color: var(--fg-tertiary);
          cursor: pointer;
          font-size: 11px;
        }

        /* Thread drawer and timeline replies styling */
        .thread-drawer-panel {
          max-width: 440px;
        }
        .thread-parent-message-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 12px;
        }
        .parent-p {
          font-size: 13px;
          margin-top: 4px;
        }
        .replies-timeline-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-grow: 1;
          overflow-y: auto;
          margin-top: 8px;
        }
        .reply-bubble-item {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        .reply-avatar-sm {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--bg-tertiary);
        }
        .reply-content-box {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          flex-grow: 1;
        }

        .thread-inputs {
          padding: 10px 14px;
        }

        /* AI SUMMARY modal cards */
        .ai-summary-card {
          max-width: 520px;
        }
        .ai-summary-modal-body {
          max-height: 360px;
          overflow-y: auto;
        }
        .ai-summary-pane-content {
          background: rgba(79, 70, 229, 0.03);
          border: 1px solid rgba(79, 70, 229, 0.15);
          border-radius: var(--radius-md);
          padding: 16px;
          color: var(--fg-primary);
          line-height: 1.6;
        }
        .sum-h3 {
          font-size: 13px;
          font-weight: 800;
          color: var(--primary);
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(79, 70, 229, 0.15);
          padding-bottom: 4px;
        }
        .sum-strong {
          color: var(--fg-primary);
          font-size: 12px;
          display: block;
          margin-top: 8px;
        }
        .sum-p {
          font-size: 12px;
          color: var(--fg-secondary);
          margin: 4px 0;
        }

        /* COMPARATIVE SPLIT AND WORD DIFF MODAL */
        .diff-modal {
          max-width: 680px;
        }
        .diff-modal-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 400px;
          overflow-y: auto;
        }
        .split-compare-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .compare-pane {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .compare-pane h3 {
          font-size: 10px;
          font-weight: 700;
          color: var(--fg-tertiary);
          text-transform: uppercase;
        }
        .pane-content {
          font-size: 11px;
          color: var(--fg-primary);
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .word-diff-section {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .word-diff-section h3 {
          font-size: 10px;
          font-weight: 700;
          color: var(--fg-tertiary);
          text-transform: uppercase;
        }
        .word-diff-highlight-pane {
          font-size: 12px;
          color: var(--fg-primary);
          line-height: 1.5;
          white-space: pre-wrap;
          background: var(--bg-secondary);
          padding: 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }
        :global(.diff-added) {
          background: rgba(34,197,94,0.15);
          color: var(--success);
          text-decoration: none;
          font-weight: 600;
          padding: 1px 2px;
          border-radius: 2px;
        }
        :global(.diff-removed) {
          background: rgba(239,68,68,0.15);
          color: var(--error);
          text-decoration: line-through;
          padding: 1px 2px;
          border-radius: 2px;
        }

        /* PROJECT CONFIG SETTINGS IN TAB */
        .project-settings-tab-layout {
          height: 100%;
          overflow-y: auto;
          padding-bottom: 24px;
        }
        .settings-wrapper {
          max-width: 600px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
        }
        .settings-form {
          display: flex;
          flex-direction: column;
        }
        .settings-form label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--fg-secondary);
          margin-bottom: 6px;
        }
        .settings-form input,
        .settings-form textarea {
          width: 100%;
          padding: 10px 14px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-primary);
          font-size: 13px;
          outline: none;
        }
        .settings-destructive-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        .btn-action-dest {
          text-align: left;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 600;
          color: var(--fg-secondary);
          cursor: pointer;
        }
        .btn-action-dest:hover {
          background: var(--bg-tertiary);
          color: var(--fg-primary);
        }
        .btn-action-dest.delete {
          color: var(--error);
          border-color: rgba(239,68,68,0.15);
        }

        /* MEMBER MANAGEMENT STYLES */
        .members-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }
        .member-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-fast);
        }
        .member-row:hover {
          border-color: var(--border-hover);
        }
        .member-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          flex-shrink: 0;
        }
        .member-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          overflow: hidden;
          gap: 1px;
        }
        .member-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--fg-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .member-you-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
          background: rgba(79, 70, 229, 0.1);
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .member-email {
          font-size: 11px;
          color: var(--fg-tertiary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .member-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .member-role-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.04em;
        }
        .member-role-badge.owner {
          background: rgba(79, 70, 229, 0.1);
          color: var(--primary);
        }
        .member-role-badge.admin {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }
        .member-role-badge.editor {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }
        .member-role-badge.viewer {
          background: var(--bg-tertiary);
          color: var(--fg-tertiary);
        }
        .member-role-select {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--fg-secondary);
          cursor: pointer;
          outline: none;
        }
        .member-role-select:focus {
          border-color: var(--primary);
        }
        .member-remove-btn {
          background: none;
          border: none;
          color: var(--fg-tertiary);
          font-size: 14px;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all var(--transition-fast);
        }
        .member-remove-btn:hover {
          color: var(--error);
          background: rgba(239, 68, 68, 0.08);
        }
        .subsection-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--fg-primary);
          margin-bottom: 4px;
        }
        .invite-hint {
          font-size: 12px;
          color: var(--fg-tertiary);
          margin-bottom: 12px;
          line-height: 1.4;
        }
        .invite-form {
          margin-top: 4px;
        }
        .invite-input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .invite-email-input {
          flex-grow: 1;
          padding: 9px 14px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-primary);
          font-size: 13px;
          outline: none;
        }
        .invite-email-input:focus {
          border-color: var(--primary);
        }
        .invite-role-select {
          padding: 9px 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-secondary);
          font-size: 12px;
          cursor: pointer;
          outline: none;
          min-width: 90px;
        }
        .invite-role-select:focus {
          border-color: var(--primary);
        }
        .invite-btn {
          white-space: nowrap;
          padding: 9px 20px;
          font-size: 12px;
        }

        @media (max-width: 640px) {
          .invite-input-row {
            flex-direction: column;
          }
          .invite-email-input,
          .invite-role-select,
          .invite-btn {
            width: 100%;
          }
        }

        /* PREMIUM FLOATING AI ASSISTANT CHAT PANEL (Linear style minimized/maximized) */
        .floating-ai-wrapper {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2500;
        }
        .btn-floating-ai-trigger {
          background: linear-gradient(135deg, var(--primary) 0%, #818cf8 100%);
          color: white;
          border: none;
          font-weight: 700;
          font-size: 12px;
          padding: 12px 20px;
          border-radius: var(--radius-full);
          cursor: pointer;
          box-shadow: var(--shadow-lg);
        }
        .ai-coprocessor-card {
          width: 320px;
          height: 400px;
          border-radius: var(--radius-lg);
          border: 1px solid rgba(79, 70, 229, 0.2);
          box-shadow: var(--shadow-lg);
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ai-card-header {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0,0,0,0.05);
        }
        .ai-card-header .title {
          font-size: 11px;
          font-weight: 800;
          color: var(--primary);
          text-transform: uppercase;
        }
        .btn-minimize-ai {
          background: none;
          border: none;
          color: var(--fg-tertiary);
          cursor: pointer;
          font-size: 12px;
        }
        .ai-chat-body {
          flex-grow: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .ai-messages-stream {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 240px;
          overflow-y: auto;
        }
        .ai-bubble-row {
          display: flex;
          width: 100%;
        }
        .ai-bubble-row.user { justify-content: flex-end; }
        .ai-bubble-row.ai { justify-content: flex-start; }
        .ai-bubble-row.user .ai-bubble-content {
          background: var(--primary);
          color: white;
          border-radius: var(--radius-md) var(--radius-md) 0 var(--radius-md);
        }
        .ai-bubble-row.ai .ai-bubble-content {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--fg-primary);
          border-radius: var(--radius-md) var(--radius-md) var(--radius-md) 0;
        }
        .ai-bubble-content {
          max-width: 85%;
          padding: 8px 12px;
          font-size: 11px;
          line-height: 1.4;
        }
        .btn-ai-action-execute {
          background: var(--success);
          color: white;
          border: none;
          font-size: 9px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          width: 100%;
          margin-top: 6px;
        }
        .ai-suggestions-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 10px;
          border-top: 1px solid var(--border-color);
          padding-top: 10px;
        }
        .ai-suggestion-badge {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--fg-secondary);
          font-size: 9px;
          font-weight: 600;
          padding: 3px 6px;
          border-radius: 4px;
          cursor: pointer;
        }
        .ai-suggestion-badge:hover {
          border-color: var(--border-hover);
        }
        .ai-card-footer {
          padding: 8px 12px;
          border-top: 1px solid var(--border-color);
          background: rgba(0,0,0,0.05);
        }
        .ai-input-form {
          display: flex;
          gap: 6px;
        }
        .ai-input-form input {
          flex-grow: 1;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          color: var(--fg-primary);
          font-size: 11px;
          outline: none;
        }
        .ai-input-form button {
          background: var(--primary);
          color: white;
          border: none;
          font-weight: 700;
          font-size: 11px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        /* Document previews */
        .simulated-pdf-viewer {
          background: #334155;
          border-radius: var(--radius-md);
          padding: 16px;
          text-align: center;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: white;
        }
        .pdf-page-canvas h4 { font-size: 12px; }
        .pdf-page-mark { font-size: 10px; color: #cbd5e1; }
        .pdf-page-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          font-size: 11px;
        }
        .simulated-img-viewer {
          background: #0f172a;
          border-radius: var(--radius-md);
          padding: 8px;
          display: flex;
          justify-content: center;
        }
        .preview-asset-img {
          max-width: 100%;
          max-height: 180px;
          object-fit: contain;
        }
        .simulated-csv-viewer {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 30px 10px;
          text-align: center;
        }

        /* Stats visual styles */
        .analytics-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .analytics-card {
          padding: 16px;
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .section-label {
          font-size: 9px;
          font-weight: 800;
          color: var(--fg-tertiary);
          text-transform: uppercase;
        }
        .health-circle-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .health-label-under {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .health-desc {
          font-size: 10px;
          font-weight: 700;
        }
        .mini-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          border-top: 1px solid var(--border-color);
          padding-top: 10px;
        }
        .mini-stat-card {
          background: var(--bg-primary);
          padding: 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 9px;
          color: var(--fg-tertiary);
          text-transform: uppercase;
        }
        .ai-report-box {
          background: var(--bg-primary);
          padding: 12px;
          border-radius: var(--radius-md);
          border-left: 3px solid var(--primary);
        }
        .ai-report-box.alert-box { border-left-color: var(--warning); }
        .ai-report-box h3 { font-size: 11px; margin-bottom: 6px; }
        .ai-report-box ul { padding-left: 12px; font-size: 11px; display: flex; flex-direction: column; gap: 4px; }
        .chart-container { background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; }
        .chart-legends-row { display: flex; gap: 10px; justify-content: center; font-size: 10px; }
        .legend-item { display: flex; align-items: center; gap: 4px; color: var(--fg-secondary); }
        .legend-dot { width: 10px; height: 3px; border-radius: 1px; }
        .legend-dot.dashed { border-bottom: 2px dashed var(--fg-tertiary); background: none; }
        .chart-tooltip { position: absolute; background: rgba(15,23,42,0.95); color: white; padding: 3px 6px; border-radius: 3px; font-size: 9px; pointer-events: none; z-index: 10; transform: translate(-50%, -100%); white-space: nowrap; }
        .workload-list { display: flex; flex-direction: column; gap: 10px; }
        .workload-row-bar { display: flex; flex-direction: column; gap: 4px; }
        .workload-labels-between { display: flex; justify-content: space-between; font-size: 11px; }
        .workload-track { height: 6px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 3px; overflow: hidden; }
        .workload-fill { height: 100%; border-radius: 3px; }
        .attendance-heatmap-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .heatmap-box { height: 28px; border-radius: 3px; display: flex; align-items: center; justify-content: center; cursor: help; }
        .heatmap-date-label { font-size: 8px; color: white; font-weight: 700; }

        /* Animation utilities */
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { transform: translate(-50%, 32px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

        @media (max-width: 768px) {
          .workspace-container {
            padding: 12px;
            height: auto;
            overflow-y: auto;
          }
          .header-top {
            flex-direction: column;
            align-items: stretch;
          }
          .view-switcher-tabs {
            overflow-x: auto;
          }
          .kanban-board-layout {
            height: auto;
          }
          .split-compare-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default function ProjectWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="loading-container text-center">
        <span className="spinner"></span>
        <p>Loading project workspace data...</p>
        <style jsx>{`
          .loading-container { padding: 120px 40px; }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(79, 70, 229, 0.2);
            border-radius: 50%;
            border-top-color: var(--primary);
            animation: spin 0.8s linear infinite;
          }
          .text-center { text-align: center; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    }>
      <ErrorBoundary>
        <ProjectWorkspaceContent />
      </ErrorBoundary>
    </Suspense>
  );
}
