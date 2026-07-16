'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'fallback';

interface RealtimeContextType {
  onlineUsers: any[];
  typingUsers: { [taskId: string]: string[] };
  editingTasks: { [taskId: string]: string };
  connectionStatus: ConnectionStatus;
  syncUpdate: (action: string, payload: any) => void;
  triggerTyping: (taskId: string, isTyping: boolean) => void;
  triggerEditing: (taskId: string, isEditing: boolean) => void;
  
  // Real-time Chat operations
  sendChatMessage: (message: any) => void;
  sendChatTyping: (isTyping: boolean) => void;
  sendChatReaction: (messageId: string, reactions: any) => void;
  sendChatRead: (messageId: string, readBy: any) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children, projectId }: { children: React.ReactNode; projectId?: string }) {
  const { user } = useAuth();
  
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [taskId: string]: string[] }>({});
  const [editingTasks, setEditingTasks] = useState<{ [taskId: string]: string }>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const socketRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const getCookieToken = () => {
    if (typeof document === 'undefined') return '';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; collabspace-session=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  };

  // BroadcastChannel Fallback implementation
  const initBroadcastChannelFallback = () => {
    if (typeof window === 'undefined') return;
    
    // Close existing socket if open
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    if (!broadcastChannelRef.current) {
      console.warn('⚠️ WebSocket server unavailable. Initializing Browser BroadcastChannel fallback for multi-tab sync.');
      setConnectionStatus('fallback');

      const channel = new BroadcastChannel('collabspace-realtime-fallback');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const data = event.data;
        if (data.projectId !== projectId) return;

        handleRealtimeEvent(data);
      };

      // Seed local user in online list immediately in fallback mode
      if (user) {
        setOnlineUsers([
          { userId: user.id, name: user.name || user.email.split('@')[0], email: user.email, avatarUrl: user.avatarUrl }
        ]);
      }
    }
  };

  // Main Event Handler mapping incoming sockets / channel logs to React state
  const handleRealtimeEvent = (data: any) => {
    switch (data.type) {
      case 'presence':
        if (Array.isArray(data.onlineUsers)) {
          setOnlineUsers(data.onlineUsers);
        }
        
        // Handle trigger toast notifications if join/leave details are attached
        if (data.event) {
          const ev = data.event;
          // Trigger a global custom event to announce arrivals/departures in workspace details UI
          const announceEvent = new CustomEvent('collabspace-presence-announcement', {
            detail: { type: ev.type, user: ev.user }
          });
          window.dispatchEvent(announceEvent);
        }
        break;

      case 'typing':
        setTypingUsers((prev) => {
          const list = prev[data.taskId] || [];
          if (data.isTyping) {
            if (!list.includes(data.name)) {
              return { ...prev, [data.taskId]: [...list, data.name] };
            }
          } else {
            return { ...prev, [data.taskId]: list.filter((name) => name !== data.name) };
          }
          return prev;
        });
        break;

      case 'editing':
        setEditingTasks((prev) => {
          if (data.isEditing) {
            return { ...prev, [data.taskId]: data.name };
          } else {
            const next = { ...prev };
            delete next[data.taskId];
            return next;
          }
        });
        break;

      case 'sync':
        // Trigger a re-fetch of project tasks in the details page
        const syncEvent = new CustomEvent('collabspace-sync-event', {
          detail: { action: data.action, payload: data.payload, userId: data.userId }
        });
        window.dispatchEvent(syncEvent);
        break;

      // Collaborative Chat Events
      case 'chat-message':
        window.dispatchEvent(new CustomEvent('collabspace-chat-message', { detail: data }));
        break;

      case 'chat-typing':
        window.dispatchEvent(new CustomEvent('collabspace-chat-typing', { detail: data }));
        break;

      case 'chat-reaction':
        window.dispatchEvent(new CustomEvent('collabspace-chat-reaction', { detail: data }));
        break;

      case 'chat-read':
        window.dispatchEvent(new CustomEvent('collabspace-chat-read', { detail: data }));
        break;
    }
  };

  // Connect WebSockets
  const connectWebSocket = () => {
    if (typeof window === 'undefined' || !projectId) return;

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
      broadcastChannelRef.current = null;
    }

    setConnectionStatus('connecting');
    const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const wsUrl = `${baseWsUrl}?projectId=${projectId}&token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connection established successfully.');
        setConnectionStatus('connected');
        retryCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeEvent(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        if (connectionStatus === 'connected') {
          console.warn('🔌 WebSocket connection closed.');
        }
        socketRef.current = null;
        triggerReconnection();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      triggerReconnection();
    }
  };

  const triggerReconnection = () => {
    if (retryCountRef.current >= 4) {
      initBroadcastChannelFallback();
      return;
    }

    setConnectionStatus('disconnected');
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 15000);
    retryCountRef.current += 1;

    console.log(`🔌 Attempting reconnection in ${delay}ms (retry ${retryCountRef.current}/4)...`);

    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket();
    }, delay);
  };

  useEffect(() => {
    if (projectId) {
      retryCountRef.current = 0;
      connectWebSocket();
    } else {
      initBroadcastChannelFallback();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [projectId, projectId]);

  // --- ACTIONS DISPATCHERS ---
  const syncUpdate = (action: string, payload: any) => {
    const event = { type: 'sync', projectId, action, payload, userId: user?.id };
    
    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify(event));
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event);
    }
  };

  const triggerTyping = (taskId: string, isTyping: boolean) => {
    const name = user?.name || user?.email?.split('@')[0] || 'User';
    const event = { type: 'typing', projectId, taskId, isTyping, name };

    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify(event));
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event);
    }
  };

  const triggerEditing = (taskId: string, isEditing: boolean) => {
    const name = user?.name || user?.email?.split('@')[0] || 'User';
    const event = { type: 'editing', projectId, taskId, isEditing, name };

    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify(event));
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event);
    }
  };

  // --- COLLABORATIVE CHAT DISPATCHERS ---
  const sendChatMessage = (message: any) => {
    const event = { type: 'chat-message', projectId, message };
    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify(event));
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event);
    }
  };

  const sendChatTyping = (isTyping: boolean) => {
    const event = { type: 'chat-typing', projectId, isTyping };
    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify(event));
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event);
    }
  };

  const sendChatReaction = (messageId: string, reactions: any) => {
    const event = { type: 'chat-reaction', projectId, messageId, reactions };
    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify(event));
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event);
    }
  };

  const sendChatRead = (messageId: string, readBy: any) => {
    const event = { type: 'chat-read', projectId, messageId, readBy };
    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify(event));
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event);
    }
  };

  return (
    <RealtimeContext.Provider
      value={{
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
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
