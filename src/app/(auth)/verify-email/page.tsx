'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { refreshSession } = useAuth();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link. Missing token or email parameter.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          addToast('Email verified. Welcome to CollabSpace!', 'success');
          
          await refreshSession();
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to verify email. The link may have expired.');
          addToast(data.error || 'Email verification failed', 'error');
        }
      } catch (err) {
        setStatus('error');
        setMessage('A network error occurred. Please try again.');
        addToast('Verification failed. Network issue.', 'error');
      }
    };

    verifyToken();
  }, [token, email, router, addToast, refreshSession]);

  return (
    <div className="auth-card glass animate-fade-in text-center">
      <div className="logo-container">
        <div className="logo-icon">C</div>
        <span className="logo-text">CollabSpace</span>
      </div>

      {status === 'loading' && (
        <div className="status-container">
          <span className="spinner"></span>
          <p className="loading-text">{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="status-container">
          <div className="status-icon success">✓</div>
          <h2 className="title">Verification Successful</h2>
          <p className="subtitle">{message}</p>
          <p className="redirect-note">Redirecting you to the dashboard...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="status-container">
          <div className="status-icon error">✕</div>
          <h2 className="title">Verification Failed</h2>
          <p className="subtitle">{message}</p>
          <div className="action-row">
            <Link href="/login" className="btn">
              Return to Sign In
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        .logo-container {
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
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
        .status-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(99, 102, 241, 0.2);
          border-radius: 50%;
          border-top-color: var(--primary);
          animation: spin 0.8s linear infinite;
        }
        .loading-text {
          font-size: 14px;
          color: var(--fg-secondary);
        }
        .status-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
        }
        .status-icon.success {
          background: var(--success-glow);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .status-icon.error {
          background: var(--error-glow);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .title {
          font-size: 20px;
          color: var(--fg-primary);
        }
        .subtitle {
          font-size: 14px;
          color: var(--fg-secondary);
          line-height: 1.5;
        }
        .redirect-note {
          font-size: 12px;
          color: var(--fg-tertiary);
          margin-top: 8px;
        }
        .btn {
          padding: 12px 24px;
          background: var(--primary);
          border: none;
          border-radius: var(--radius-md);
          color: #ffffff;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background-color var(--transition-fast);
          display: inline-block;
        }
        .btn:hover {
          background: var(--primary-hover);
        }
        .action-row {
          margin-top: 8px;
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

export default function VerifyEmailPage() {
  return (
    <div className="container">
      <Suspense fallback={
        <div className="auth-card glass text-center">
          <span className="spinner"></span>
          <p>Initialising verification...</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>

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
