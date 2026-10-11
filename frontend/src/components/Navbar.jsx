import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Menu, X, User } from 'lucide-react';
import { authService } from '../services/auth';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();

  const getDashboardPath = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'EMPLOYEE') return '/employee/dashboard';
    if (currentUser.role === 'BRANCH_MANAGER') return '/manager/dashboard';
    return '/customer/dashboard';
  };

  return (
    <header
      style={{
        backgroundColor: 'rgba(11, 21, 40, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--blue-600), var(--blue-400))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--white)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--white)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              SecureBank
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--blue-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Your Trust. Our Priority.
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '2rem',
          }}
          className="desktop-nav"
        >
          <a href="/#features" style={{ color: 'var(--slate-300)', fontSize: '0.925rem', fontWeight: 500 }}>
            Features
          </a>
          <a href="/#how-it-works" style={{ color: 'var(--slate-300)', fontSize: '0.925rem', fontWeight: 500 }}>
            How It Works
          </a>
          <a href="/#security" style={{ color: 'var(--slate-300)', fontSize: '0.925rem', fontWeight: 500 }}>
            Security
          </a>
          <a href="/#faq" style={{ color: 'var(--slate-300)', fontSize: '0.925rem', fontWeight: 500 }}>
            FAQs
          </a>
          <a href="/#contact" style={{ color: 'var(--slate-300)', fontSize: '0.925rem', fontWeight: 500 }}>
            Contact
          </a>
        </nav>

        {/* Auth CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAuthenticated ? (
            <Link to={getDashboardPath()} className="btn btn-primary btn-sm">
              <User size={16} /> My Dashboard
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                to="/login"
                style={{
                  color: 'var(--slate-200)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  transition: 'var(--transition)'
                }}
              >
                Sign In
              </Link>
              <Link
                to="/customer/open-account"
                className="btn btn-primary btn-sm"
                style={{ backgroundColor: 'var(--emerald-600)', borderColor: 'var(--emerald-500)', fontSize: '0.85rem' }}
              >
                Open Account
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--white)',
              cursor: 'pointer',
              display: 'none',
            }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </header>
  );
}
