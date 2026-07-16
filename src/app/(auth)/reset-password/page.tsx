'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) {
      addToast('Invalid password reset parameters.', 'error');
      return;
    }

    if (password.length < 8) {
      addToast('Password must be at least 8 characters long', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('Password reset successfully!', 'success');
        setIsDone(true);
        setTimeout(() => {
          router.push('/login?success=Your password has been updated. Please sign in.');
        }, 2000);
      } else {
        addToast(data.error || 'Password reset failed', 'error');
      }
    } catch (err) {
      addToast('Network error occurred. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="auth-card glass animate-fade-in text-center">
        <div className="status-icon error">✕</div>
        <h2 className="title">Invalid Reset Link</h2>
        <p className="subtitle">
          This password reset link is invalid or has expired. Please request a new link.
        </p>
        <div className="action-row">
          <Link href="/forgot-password" className="btn">
            Request New Link
          </Link>
        </div>
        <style jsx>{`
          .status-icon {
            font-size: 48px;
            margin-bottom: 20px;
            color: var(--error);
          }
          .title {
            font-size: 22px;
            color: var(--fg-primary);
            margin-bottom: 12px;
          }
          .subtitle {
            font-size: 14px;
            color: var(--fg-secondary);
            line-height: 1.6;
            margin-bottom: 28px;
          }
          .btn {
            padding: 12px 24px;
            background: var(--primary);
            border: none;
            border-radius: var(--radius-md);
            color: #ffffff;
            font-weight: 600;
            cursor: pointer;
            transition: background-color var(--transition-fast);
            display: inline-block;
          }
          .btn:hover {
            background: var(--primary-hover);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-card glass animate-fade-in">
      <div className="logo-container">
        <Link href="/" className="logo-link">
          <div className="logo-icon">C</div>
          <span className="logo-text">CollabSpace</span>
        </Link>
      </div>

      <h2 className="title">Set new password</h2>
      <p className="subtitle">Enter your new password below to secure your account</p>

      {isDone ? (
        <div className="status-container text-center">
          <div className="status-icon success">✓</div>
          <p className="success-text">Password updated successfully!</p>
          <p className="redirect-note">Redirecting you to login...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <div className="input-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Match password"
              required
              disabled={isSubmitting}
            />
          </div>

          <button 
            type="submit" 
            className="btn glow-effect" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="spinner-container">
                <span className="spinner"></span>
                <span>Updating password...</span>
              </div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      )}

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
        label {
          font-size: 11px;
          font-weight: 700;
          color: var(--fg-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
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
        .status-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .status-icon.success {
          font-size: 32px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--success-glow);
          color: var(--success);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .success-text {
          font-size: 14px;
          font-weight: 600;
          color: var(--fg-primary);
        }
        .redirect-note {
          font-size: 12px;
          color: var(--fg-tertiary);
        }
        .text-center {
          text-align: center;
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

export default function ResetPasswordPage() {
  return (
    <div className="container">
      <Suspense fallback={
        <div className="auth-card glass text-center">
          <span className="spinner"></span>
          <p>Initialising reset form...</p>
        </div>
      }>
        <ResetPasswordContent />
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
