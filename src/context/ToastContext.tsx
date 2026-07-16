'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getStyleProps = () => {
    switch (toast.type) {
      case 'success':
        return {
          borderLeft: '4px solid var(--success)',
          iconColor: 'var(--success)',
          iconBg: 'var(--success-glow)',
          icon: '✓'
        };
      case 'error':
        return {
          borderLeft: '4px solid var(--error)',
          iconColor: 'var(--error)',
          iconBg: 'var(--error-glow)',
          icon: '✕'
        };
      case 'warning':
        return {
          borderLeft: '4px solid var(--warning)',
          iconColor: 'var(--warning)',
          iconBg: 'rgba(245, 158, 11, 0.08)',
          icon: '⚠'
        };
      case 'info':
      default:
        return {
          borderLeft: '4px solid var(--primary)',
          iconColor: 'var(--primary)',
          iconBg: 'var(--primary-glow)',
          icon: 'ℹ'
        };
    }
  };

  const props = getStyleProps();

  return (
    <div 
      className="toast-item" 
      style={{ borderLeft: props.borderLeft }}
      onClick={onClose}
    >
      <span 
        className="toast-icon" 
        style={{ color: props.iconColor, backgroundColor: props.iconBg }}
      >
        {props.icon}
      </span>
      <p className="toast-message">{toast.message}</p>
      <button 
        className="toast-close" 
        onClick={(e) => { 
          e.stopPropagation(); 
          onClose(); 
        }}
      >
        ✕
      </button>
    </div>
  );
}
