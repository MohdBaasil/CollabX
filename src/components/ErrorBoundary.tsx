'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container glass">
          <div className="error-boundary-card">
            <span className="error-icon">⚠️</span>
            <h2>Oops! Something went wrong</h2>
            <p>CollabSpace encountered an unexpected rendering error on this page.</p>
            <pre className="error-details">{this.state.error?.message}</pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary"
            >
              🔄 Reload Application
            </button>
          </div>

          <style jsx>{`
            .error-boundary-container {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: 40px;
              margin: 40px;
              border-radius: var(--radius-lg);
              border: 1px solid var(--border-color);
              background: var(--bg-secondary);
            }
            .error-boundary-card {
              max-width: 480px;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
            }
            .error-icon {
              font-size: 48px;
            }
            .error-boundary-card h2 {
              font-size: 18px;
              font-weight: 800;
              color: var(--fg-primary);
            }
            .error-boundary-card p {
              font-size: 13px;
              color: var(--fg-secondary);
            }
            .error-details {
              font-family: var(--font-mono);
              font-size: 11px;
              background: var(--bg-primary);
              border: 1px solid var(--border-color);
              padding: 12px;
              border-radius: var(--radius-sm);
              color: var(--error);
              max-width: 100%;
              overflow-x: auto;
              text-align: left;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
