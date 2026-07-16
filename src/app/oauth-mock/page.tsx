'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

function OAuthMockContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  
  const provider = searchParams.get('provider') || 'google';
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const rand = Math.floor(Math.random() * 1000);
    setEmail(`developer-${rand}@collabspace.dev`);
    setName(`Developer User ${rand}`);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=dev-${rand}`);
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      addToast('Please enter an email address', 'error');
      return;
    }

    setIsSimulating(true);
    addToast(`Simulating ${provider} authentication callback...`, 'info');

    setTimeout(() => {
      const callbackUrl = `/api/auth/oauth/callback?` + 
        `provider=${provider}` +
        `&mock=true` +
        `&email=${encodeURIComponent(email)}` + 
        `&name=${encodeURIComponent(name)}` +
        `&avatarUrl=${encodeURIComponent(avatarUrl)}`;
      
      router.push(callbackUrl);
    }, 1500);
  };

  return (
    <div className="oauth-card glass animate-fade-in">
      <div className="card-header">
        <div className="badge">DEVELOPER DIAGNOSTICS</div>
        <h2>{provider === 'google' ? 'Google' : 'GitHub'} OAuth Sandbox</h2>
        <p className="subtitle">
          Because client keys for <code>{provider.toUpperCase()}_CLIENT_ID</code> are not configured in <code>.env</code>, 
          CollabSpace has routed you to this developer portal to simulate social login.
        </p>
      </div>

      <form onSubmit={handleSimulate} className="form">
        <div className="input-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. developer@collabspace.dev"
            required
            disabled={isSimulating}
          />
        </div>

        <div className="input-group">
          <label htmlFor="name">Display Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
            disabled={isSimulating}
          />
        </div>

        <div className="input-group">
          <label htmlFor="avatarUrl">Avatar Image URL (DiceBear SVG)</label>
          <input
            type="text"
            id="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="Avatar URL"
            disabled={isSimulating}
          />
          {avatarUrl && (
            <div className="avatar-preview">
              <img src={avatarUrl} alt="Avatar Preview" />
              <span>Auto-generated Bottts SVG Seed</span>
            </div>
          )}
        </div>

        <button type="submit" className="btn glow-effect" disabled={isSimulating}>
          {isSimulating ? (
            <div className="spinner-container">
              <span className="spinner"></span>
              <span>Authenticating Mock User...</span>
            </div>
          ) : (
            `Complete Simulated ${provider === 'google' ? 'Google' : 'GitHub'} Sign In`
          )}
        </button>
      </form>

      <style jsx>{`
        .oauth-card {
          width: 100%;
          max-width: 480px;
          border-radius: var(--radius-lg);
          padding: 32px;
          box-shadow: var(--shadow-lg);
        }
        .card-header {
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .badge {
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          align-self: flex-start;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        h2 {
          font-size: 24px;
          color: var(--fg-primary);
        }
        .subtitle {
          font-size: 13px;
          color: var(--fg-secondary);
          line-height: 1.6;
        }
        .subtitle code {
          background: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: var(--fg-primary);
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
          font-size: 12px;
          font-weight: 600;
          color: var(--fg-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        input {
          padding: 12px 16px;
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
        .avatar-preview {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
          padding: 8px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          border: 1px dashed var(--border-color);
        }
        .avatar-preview img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-tertiary);
        }
        .avatar-preview span {
          font-size: 12px;
          color: var(--fg-tertiary);
        }
        .btn {
          margin-top: 8px;
          padding: 14px;
          background: var(--primary);
          border: none;
          border-radius: var(--radius-md);
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
          transition: background-color var(--transition-fast), transform var(--transition-fast);
          width: 100%;
        }
        .btn:hover {
          background: var(--primary-hover);
        }
        .btn:disabled {
          background: var(--border-color);
          color: var(--fg-tertiary);
          cursor: not-allowed;
        }
        .spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .spinner {
          width: 20px;
          height: 20px;
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

export default function OAuthMockPage() {
  return (
    <div className="container">
      <Suspense fallback={
        <div className="oauth-card glass text-center">
          <span className="spinner"></span>
          <p>Initialising sandbox...</p>
        </div>
      }>
        <OAuthMockContent />
      </Suspense>

      <style jsx>{`
        .container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.05), transparent 40%),
                      radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.05), transparent 40%),
                      var(--bg-primary);
          padding: 24px;
        }
        .oauth-card {
          width: 100%;
          max-width: 480px;
          border-radius: var(--radius-lg);
          padding: 32px;
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
