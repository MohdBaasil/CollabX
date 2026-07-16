'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="landing-container">
      {/* Header / Navbar */}
      <header className="header glass">
        <div className="logo-container">
          <div className="logo-icon">C</div>
          <span className="logo-text">CollabSpace</span>
        </div>
        
        <nav className="nav">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="auth-buttons">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary glow-effect">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Sign In
              </Link>
              <Link href="/signup" className="btn-primary glow-effect">
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content animate-fade-in">
          <div className="announcement">
            <span className="badge">NEW</span>
            <span className="announcement-text">Introducing AI-Powered Workspace Generation</span>
          </div>
          <h1>
            Collaborate without friction. <br />
            <span className="text-gradient">Build with intelligence.</span>
          </h1>
          <p className="hero-subtitle">
            CollabSpace brings authentication, real-time updates, custom themes, and project tracking 
            into one beautifully structured environment. Fully optimized for high-velocity engineering teams.
          </p>
          <div className="hero-actions">
            <Link href={isAuthenticated ? "/dashboard" : "/signup"} className="btn-hero-primary glow-effect">
              {isAuthenticated ? "Enter Workspace" : "Start Collaborating Now"}
            </Link>
            <a href="#features" className="btn-hero-secondary">
              Explore Features
            </a>
          </div>
        </div>

        {/* Dashboard Preview Interface Mockup */}
        <div className="hero-preview animate-fade-in">
          <div className="mock-window glass">
            <div className="window-header">
              <div className="dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="window-title">Acme Corp - Dashboard</div>
            </div>
            <div className="mock-body">
              <aside className="mock-sidebar">
                <div className="mock-ws-selector">Acme Corp</div>
                <div className="mock-nav-item active">Dashboard</div>
                <div className="mock-nav-item">Issues</div>
                <div className="mock-nav-item">AI Agent</div>
                <div className="mock-nav-item">Settings</div>
                <div className="mock-user-footer">
                  <div className="avatar"></div>
                  <div className="user-details">
                    <div className="name">User Name</div>
                    <div className="email">verified@collabspace.dev</div>
                  </div>
                </div>
              </aside>
              <main className="mock-content">
                <header className="mock-content-header">
                  <div className="mock-title">Workspace Dashboard</div>
                  <div className="mock-actions">
                    <span className="pill">Active</span>
                  </div>
                </header>
                <div className="mock-grid">
                  <div className="mock-card">
                    <div className="card-label">Active Issues</div>
                    <div className="card-value">12</div>
                    <div className="card-sub">3 updated today</div>
                  </div>
                  <div className="mock-card">
                    <div className="card-label">AI Suggestions</div>
                    <div className="card-value">5</div>
                    <div className="card-sub">Ready to deploy</div>
                  </div>
                  <div className="mock-card">
                    <div className="card-label">Team Members</div>
                    <div className="card-value">8</div>
                    <div className="card-sub">3 online now</div>
                  </div>
                </div>
                <div className="mock-list">
                  <div className="mock-list-title">Recent Activity</div>
                  <div className="mock-list-item">
                    <div className="indicator"></div>
                    <div className="item-text">GitHub OAuth successfully configured</div>
                  </div>
                  <div className="mock-list-item">
                    <div className="indicator"></div>
                    <div className="item-text">Dark theme set as default workspace preference</div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="features-section">
        <h2 className="section-title">Designed for modern teams. Built for developer productivity.</h2>
        <div className="features-grid">
          <div className="feature-card glass">
            <div className="feature-icon">🔑</div>
            <h3>Secured JWT Authentication</h3>
            <p>HTTP-only session cookies with Edge middleware route protection. Safe from CSRF/XSS attacks.</p>
          </div>
          <div className="feature-card glass">
            <div className="feature-icon">🔌</div>
            <h3>Google & GitHub OAuth</h3>
            <p>Single-click social logins utilizing state verification parameters and sandbox testing environments.</p>
          </div>
          <div className="feature-card glass">
            <div className="feature-icon">🛡️</div>
            <h3>Email Verification Flow</h3>
            <p>Verification gates, secure reset tokens, and forgot-password emails handled seamlessly.</p>
          </div>
          <div className="feature-card glass">
            <div className="feature-icon">🎨</div>
            <h3>Workspace Customization</h3>
            <p>Toggle between gorgeous Dark and Light modes. Smooth transitions and high-contrast color palettes.</p>
          </div>
          <div className="feature-card glass">
            <div className="feature-icon">⚡</div>
            <h3>Optimized ORM Tier</h3>
            <p>Prisma-powered database schema layers mapped to standard, scalable PostgreSQL database architectures.</p>
          </div>
          <div className="feature-card glass">
            <div className="feature-icon">🤖</div>
            <h3>AI Core Integration</h3>
            <p>Ready-to-use hooks and states ready to power AI agent features in future iterations.</p>
          </div>
        </div>
      </section>

      <style jsx>{`
        .landing-container {
          min-height: 100vh;
          width: 100vw;
          background: radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.08), transparent 45%),
                      radial-gradient(circle at 70% 80%, rgba(99, 102, 241, 0.08), transparent 45%),
                      var(--bg-primary);
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Navbar Header */
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          z-index: 1000;
          border-bottom: 1px solid var(--border-color);
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          background: var(--primary);
          color: white;
          font-weight: 800;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .logo-text {
          font-weight: 700;
          font-size: 18px;
          color: var(--fg-primary);
        }
        .nav {
          display: flex;
          gap: 32px;
        }
        .nav a {
          color: var(--fg-secondary);
          font-size: 14px;
          font-weight: 500;
        }
        .nav a:hover {
          color: var(--fg-primary);
        }
        .auth-buttons {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .btn-primary {
          padding: 8px 16px;
          background: var(--primary);
          color: white;
          font-size: 14px;
          font-weight: 600;
          border-radius: var(--radius-md);
        }
        .btn-primary:hover {
          background: var(--primary-hover);
        }
        .btn-secondary {
          color: var(--fg-primary);
          font-size: 14px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: var(--radius-md);
          transition: background-color var(--transition-fast);
        }
        .btn-secondary:hover {
          background: var(--bg-secondary);
        }

        /* Hero */
        .hero {
          padding: 160px 40px 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 60px;
        }
        .hero-content {
          max-width: 800px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .announcement {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 500;
          color: var(--fg-primary);
        }
        .announcement .badge {
          background: var(--primary);
          color: white;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          font-size: 9px;
          font-weight: 800;
        }
        h1 {
          font-size: 56px;
          font-weight: 800;
          color: var(--fg-primary);
          line-height: 1.1;
        }
        .text-gradient {
          background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-subtitle {
          font-size: 18px;
          color: var(--fg-secondary);
          max-width: 680px;
          line-height: 1.6;
        }
        .hero-actions {
          display: flex;
          gap: 16px;
          margin-top: 12px;
        }
        .btn-hero-primary {
          padding: 14px 28px;
          background: var(--primary);
          color: white;
          font-weight: 600;
          font-size: 15px;
          border-radius: var(--radius-md);
        }
        .btn-hero-primary:hover {
          background: var(--primary-hover);
        }
        .btn-hero-secondary {
          padding: 14px 28px;
          background: var(--bg-secondary);
          color: var(--fg-primary);
          border: 1px solid var(--border-color);
          font-weight: 600;
          font-size: 15px;
          border-radius: var(--radius-md);
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
        }
        .btn-hero-secondary:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-hover);
        }

        /* Mockup Window */
        .hero-preview {
          width: 100%;
          max-width: 1000px;
          padding: 8px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
          box-shadow: 0 30px 60px -15px rgba(0,0,0,0.8);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .mock-window {
          border-radius: var(--radius-md);
          overflow: hidden;
          text-align: left;
          height: 480px;
          display: flex;
          flex-direction: column;
        }
        .window-header {
          height: 40px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          padding: 0 16px;
          position: relative;
        }
        .dots {
          display: flex;
          gap: 6px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .dot.red { background: #ff5f56; }
        .dot.yellow { background: #ffbd2e; }
        .dot.green { background: #27c93f; }
        .window-title {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          color: var(--fg-tertiary);
          font-weight: 500;
        }
        .mock-body {
          flex-grow: 1;
          display: flex;
        }
        .mock-sidebar {
          width: 220px;
          background: rgba(0, 0, 0, 0.15);
          border-right: 1px solid var(--border-color);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mock-ws-selector {
          font-weight: 600;
          font-size: 14px;
          padding: 8px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          color: var(--fg-primary);
          margin-bottom: 16px;
        }
        .mock-nav-item {
          font-size: 13px;
          padding: 8px;
          border-radius: var(--radius-sm);
          color: var(--fg-secondary);
        }
        .mock-nav-item.active {
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
          font-weight: 600;
        }
        .mock-user-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }
        .mock-user-footer .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
        }
        .mock-user-footer .name {
          font-size: 12px;
          font-weight: 600;
          color: var(--fg-primary);
        }
        .mock-user-footer .email {
          font-size: 10px;
          color: var(--fg-tertiary);
        }
        .mock-content {
          flex-grow: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: var(--bg-secondary);
        }
        .mock-content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .mock-title {
          font-size: 20px;
          font-weight: 700;
        }
        .mock-actions .pill {
          background: rgba(16, 185, 129, 0.15);
          color: var(--success);
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .mock-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .mock-card {
          padding: 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }
        .card-label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--fg-tertiary);
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .card-value {
          font-size: 28px;
          font-weight: 800;
          color: var(--fg-primary);
          margin: 4px 0;
        }
        .card-sub {
          font-size: 11px;
          color: var(--fg-secondary);
        }
        .mock-list {
          margin-top: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
        }
        .mock-list-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--fg-primary);
          margin-bottom: 12px;
        }
        .mock-list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .mock-list-item:last-child {
          border-bottom: none;
        }
        .mock-list-item .indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
        }
        .mock-list-item .item-text {
          font-size: 12px;
          color: var(--fg-secondary);
        }

        /* Features Section */
        .features-section {
          padding: 100px 40px;
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 60px;
        }
        .section-title {
          font-size: 36px;
          font-weight: 800;
          text-align: center;
          color: var(--fg-primary);
          max-width: 600px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          width: 100%;
        }
        .feature-card {
          padding: 32px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
          transition: transform 0.2s, border-color var(--transition-fast);
        }
        .feature-card:hover {
          transform: translateY(-4px);
          border-color: var(--border-hover);
        }
        .feature-icon {
          font-size: 32px;
        }
        .feature-card h3 {
          font-size: 18px;
          color: var(--fg-primary);
        }
        .feature-card p {
          font-size: 13px;
          color: var(--fg-secondary);
          line-height: 1.6;
        }

        /* Responsiveness */
        @media (max-width: 900px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .mock-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          h1 {
            font-size: 40px;
          }
        }
        @media (max-width: 600px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
          .mock-grid {
            grid-template-columns: 1fr;
          }
          .mock-sidebar {
            display: none;
          }
          .header {
            padding: 0 20px;
          }
          .nav {
            display: none;
          }
          .hero {
            padding: 120px 20px 60px;
          }
        }
      `}</style>
    </div>
  );
}
