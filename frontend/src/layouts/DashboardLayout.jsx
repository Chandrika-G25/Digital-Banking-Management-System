import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import ConnectionStatus from '../components/ConnectionStatus';
import { wsService } from '../services/websocket';
import { authService } from '../services/auth';

export default function DashboardLayout({ children, pageTitle = 'Dashboard', subtitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = authService.getCurrentUser() || {};

  useEffect(() => {
    // Connect WebSocket when inside dashboard
    wsService.connect();
    return () => {
      // Keep connected across dashboard route changes
    };
  }, []);

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--slate-700)',
                display: 'flex',
                alignItems: 'center',
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)'
              }}
              className="mobile-sidebar-toggle"
              title="Toggle Menu"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                {pageTitle}
              </h2>
              {subtitle && (
                <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.1rem' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ConnectionStatus />
            <NotificationBell />
            <div
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.65rem',
                paddingLeft: '0.75rem',
                borderLeft: '1px solid var(--slate-200)',
              }}
              className="desktop-user-pill"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--blue-600)',
                  color: 'var(--white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.825rem'
                }}
              >
                {(user.first_name || user.username || 'U')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy-900)' }}>
                {user.first_name || user.username}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 901px) {
          .mobile-sidebar-toggle { display: none !important; }
          .desktop-user-pill { display: flex !important; }
        }
        @media (max-width: 900px) {
          .mobile-sidebar-toggle { display: flex !important; }
          .desktop-user-pill { display: none !important; }
        }
      `}</style>
    </div>
  );
}
