'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

export default function JoinProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const projectId = params.projectId as string;
  const [status, setStatus] = useState('Joining project...');

  useEffect(() => {
    if (!projectId) return;

    const joinProject = async () => {
      try {
        const res = await fetch(`/api/dashboard/projects/${projectId}/join`, {
          method: 'POST',
        });
        const data = await res.json();

        if (res.ok) {
          addToast('Successfully joined project!', 'success');
          router.push(`/dashboard/projects/${projectId}`);
        } else if (res.status === 401) {
          // Save pending join to localStorage
          localStorage.setItem('collabspace-pending-join', projectId);
          addToast('Please login or sign up to join this project', 'info');
          router.push(`/login?redirect=/dashboard/projects/${projectId}/join`);
        } else {
          setStatus(data.error || 'Failed to join project');
          addToast(data.error || 'Failed to join project', 'error');
        }
      } catch (err) {
        setStatus('Network error occurred');
        addToast('Network error occurred', 'error');
      }
    };

    joinProject();
  }, [projectId]);

  return (
    <div className="join-container">
      <div className="join-card glass">
        <div className="spinner"></div>
        <h1>{status}</h1>
        <p className="subtitle">Preparing your project environment...</p>
      </div>

      <style jsx>{`
        .join-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          color: var(--fg-primary);
        }
        .join-card {
          padding: 40px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 400px;
          box-shadow: var(--shadow-lg);
        }
        h1 {
          font-size: 18px;
          font-weight: 700;
          margin-top: 20px;
          letter-spacing: -0.02em;
        }
        .subtitle {
          font-size: 13px;
          color: var(--fg-tertiary);
          margin-top: 8px;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(79, 70, 229, 0.2);
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
