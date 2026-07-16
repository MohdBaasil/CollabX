'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  theme: 'light' | 'dark';
  emailVerified: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  user: UserProfile | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; unverified?: boolean }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setActiveWorkspace: (workspace: Workspace) => void;
  updateUserTheme: (theme: 'light' | 'dark') => Promise<void>;
  updateProfile: (name: string, avatarUrl: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
        setWorkspaces(data.workspaces || []);
        
        // Sync active workspace from localStorage or default to first
        const savedWsId = localStorage.getItem('collabspace-active-workspace');
        const workspacesList = data.workspaces || [];
        const matched = workspacesList.find((w: Workspace) => w.id === savedWsId);
        
        if (matched) {
          setActiveWorkspaceState(matched);
        } else if (workspacesList.length > 0) {
          setActiveWorkspaceState(workspacesList[0]);
          localStorage.setItem('collabspace-active-workspace', workspacesList[0].id);
        }
        
        // Apply theme from user settings
        const currentTheme = data.user.theme || 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('collabspace-theme', currentTheme);
      } else {
        setUser(null);
        setWorkspaces([]);
        setActiveWorkspaceState(null);
      }
    } catch (err) {
      console.error('Error checking auth session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed', unverified: data.unverified };
      }

      await refreshSession();
      router.push('/dashboard');
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('collabspace-active-workspace', workspace.id);
  };

  const updateUserTheme = async (theme: 'light' | 'dark') => {
    if (!user) return;
    try {
      // Optimitic UI update
      setUser((prev) => prev ? { ...prev, theme } : null);
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('collabspace-theme', theme);

      await fetch('/api/dashboard/profile/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });
    } catch (err) {
      console.error('Failed to sync theme to DB', err);
    }
  };

  const updateProfile = async (name: string, avatarUrl: string) => {
    if (!user) return { success: false, error: 'No authenticated user' };
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update profile' };
      }

      setUser((prev) => prev ? { ...prev, name, avatarUrl } : null);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshSession,
        setActiveWorkspace,
        updateUserTheme,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
