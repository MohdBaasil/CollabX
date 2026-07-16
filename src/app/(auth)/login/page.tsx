'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

function LoginContent() {
  const { login, isLoading } = useAuth();
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const errorMsg = searchParams.get('error');
    const successMsg = searchParams.get('success');
    const verified = searchParams.get('verified');

    if (errorMsg) {
      addToast(errorMsg, 'error');
    }
    if (successMsg) {
      addToast(successMsg, 'success');
    }
    if (verified === 'true') {
      addToast('Email verified successfully! You can now log in.', 'success');
    }
  }, [searchParams, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'warning');
      return;
    }

    setIsSubmitting(true);
    const res = await login(email, password);

    if (res.success) {
      addToast('Welcome back to CollabSpace!', 'success');
    } else {
      addToast(res.error || 'Login failed', 'error');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="auth-card glass animate-fade-in">
      <div className="logo-container">
        <Link href="/" className="logo-link">
          <div className="logo-icon">C</div>
          <span className="logo-text">CollabSpace</span>
        </Link>
      </div>

      <h2 className="title">Welcome back</h2>
      <p className="subtitle">Enter your credentials to access your workspaces</p>

      {/* OAuth Buttons */}
      <div className="oauth-grid">
        <a href="/api/auth/oauth/google" className="btn-oauth">
          <svg className="oauth-svg" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.4 7.56l3.85 2.99c.9-2.7 3.42-4.51 6.75-4.51z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.5z"/>
            <path fill="#FBBC05" d="M5.25 14.57c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.4 7.22C.5 9.02 0 11.02 0 13.11s.5 4.09 1.4 5.89l3.85-3.03z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.51 1.18-4.3 1.18-3.33 0-5.85-1.81-6.75-4.51L1.4 16.96C3.37 20.87 7.35 23 12 23z"/>
          </svg>
          Google
        </a>
        <a href="/api/auth/oauth/github" className="btn-oauth">
          <svg className="oauth-svg" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          GitHub
        </a>
      </div>

      <div className="divider">
        <span>or continue with email</span>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="input-group">
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@work.com"
            required
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="input-group">
          <div className="label-container">
            <label htmlFor="password">Password</label>
            <Link href="/forgot-password" className="forgot-link">
              Forgot?
            </Link>
          </div>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading || isSubmitting}
          />
        </div>

        <button 
          type="submit" 
          className="btn glow-effect" 
          disabled={isLoading || isSubmitting}
        >
          {isSubmitting ? (
            <div className="spinner-container">
              <span className="spinner"></span>
              <span>Signing in...</span>
            </div>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="footer-text">
        Don't have an account?{' '}
        <Link href="/signup">
          Sign up
        </Link>
      </p>

      <style jsx>{`
        .logo-container {
          margin-bottom: 24px;
          display: flex;
          justify-content: center;
        }
        .logo-link {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-icon {
          width: 28px;
          height: 28px;
          background: var(--primary);
          color: white;
          font-weight: 800;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .logo-text {
          font-weight: 700;
          font-size: 16px;
          color: var(--fg-primary);
        }
        .title {
          font-size: 24px;
          text-align: center;
          color: var(--fg-primary);
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 13px;
          text-align: center;
          color: var(--fg-secondary);
          margin-bottom: 28px;
        }
        .oauth-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        .btn-oauth {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--fg-primary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
        }
        .btn-oauth:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-hover);
        }
        .oauth-svg {
          width: 16px;
          height: 16px;
        }
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin-bottom: 24px;
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-color);
        }
        .divider span {
          padding: 0 10px;
          font-size: 11px;
          color: var(--fg-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
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
        .label-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        label {
          font-size: 11px;
          font-weight: 700;
          color: var(--fg-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .forgot-link {
          font-size: 12px;
          color: var(--primary);
          font-weight: 500;
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
          margin-top: 4px;
        }
        .btn:hover {
          background: var(--primary-hover);
        }
        .btn:disabled {
          background: var(--border-color);
          color: var(--fg-tertiary);
          cursor: not-allowed;
        }
        .footer-text {
          font-size: 13px;
          text-align: center;
          color: var(--fg-secondary);
          margin-top: 24px;
        }
        .spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          border-top-color: #ffffff;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="container">
      <Suspense fallback={
        <div className="auth-card glass text-center">
          <span className="spinner"></span>
          <p>Loading login form...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>

      <style jsx>{`
        .container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.04), transparent 40%),
                      radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.04), transparent 40%),
                      var(--bg-primary);
          padding: 24px;
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          border-radius: var(--radius-lg);
          padding: 40px 32px;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .text-center {
          text-align: center;
        }
        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(99, 102, 241, 0.2);
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
