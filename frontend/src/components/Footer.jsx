import React from 'react';
import { ShieldCheck, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--navy-950)', color: 'var(--slate-400)', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 2rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--blue-600), var(--blue-400))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--white)'
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--white)' }}>SecureBank</span>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--slate-400)', marginBottom: '1.25rem' }}>
              Enterprise-grade digital banking platform engineering next-generation transaction safety, branch intelligence, and real-time financial services.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--blue-400)', fontWeight: 600 }}>
              Tagline: "Your Trust. Our Priority."
            </div>
          </div>

          {/* Quick Access */}
          <div>
            <h4 style={{ color: 'var(--white)', fontSize: '0.95rem', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Portal Access
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <li>
                <Link to="/customer/login" style={{ color: 'var(--slate-400)' }}>Customer Banking Portal</Link>
              </li>
              <li>
                <Link to="/employee/login" style={{ color: 'var(--slate-400)' }}>Employee Operations</Link>
              </li>
              <li>
                <Link to="/manager/login" style={{ color: 'var(--slate-400)' }}>Branch Administration</Link>
              </li>
              <li>
                <Link to="/customer/register" style={{ color: 'var(--slate-400)' }}>Open New Account</Link>
              </li>
              <li>
                <Link to="/forgot-password" style={{ color: 'var(--slate-400)' }}>Account Recovery</Link>
              </li>
            </ul>
          </div>
          {/* Contact Details */}
          <div id="contact">
            <h4 style={{ color: 'var(--white)', fontSize: '0.95rem', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Branch Headquarters
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <MapPin size={18} color="var(--blue-400)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <span>100 Financial Center Blvd, Suite 400, Metropolis</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Phone size={18} color="var(--blue-400)" style={{ flexShrink: 0 }} />
                <span>+1 (555) 019-2831 (24/7 Helpline)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Mail size={18} color="var(--blue-400)" style={{ flexShrink: 0 }} />
                <span>support@securebank.demo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Notice Banner & Copyright */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--slate-500)'
          }}
        >
          <div
            style={{
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              color: 'var(--blue-300)',
              maxWidth: '800px'
            }}
          >
            <strong>DEMO BANKING NOTICE:</strong> SecureBank is a software demonstration environment with simulated internal transactions and accounts. Demo balances cannot be mistaken for actual legal tender or real funds.
          </div>
          <div>
            &copy; {new Date().getFullYear()} SecureBank Systems Corporation. All rights reserved. Built with React & Django.
          </div>
        </div>
      </div>
    </footer>
  );
}
