'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

export default function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      addToast('Please enter your email address', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('Reset link logged to console!', 'success');
        setIsSubmitted(true);
      } else {
        addToast(data.error || 'Something went wrong', 'error');
      }
    } catch (err) {
      addToast('Network error occurred. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="container">
        <div className="auth-card glass animate-fade-in text-center">
          <div className="status-icon">📬</div>
          <h2 className="title">Recovery link sent</h2>
          <p className="subtitle">
            If <strong>{email}</strong> is associated with an account, a password reset link has been logged 
            directly to the server terminal. Please check there to continue.
          </p>
          <div className="action-row">
            <Link href="/login" className="btn">
              Return to Sign In
            </Link>
          </div>
        </div>

        <style jsx>{`
          .container {
            min-height: 100vh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
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
          }
          .text-center {
            text-align: center;
          }
          .status-icon {
            font-size: 48px;
            margin-bottom: 20px;
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
    <div className="container">
      <div className="auth-card glass animate-fade-in">
        <div className="logo-container">
          <Link href="/" className="logo-link">
            <div className="logo-icon">C</div>
            <span className="logo-text">CollabSpace</span>
          </Link>
        </div>

        <h2 className="title">Reset password</h2>
        <p className="subtitle">Enter your email and we'll send you recovery details</p>

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
                <span>Generating recovery link...</span>
              </div>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <p className="footer-text">
          Remembered your password?{' '}
          <Link href="/login">
            Sign in
          </Link>
        </p>
      </div>

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
        }
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
