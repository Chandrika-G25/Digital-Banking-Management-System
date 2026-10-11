import React from 'react';
import { Link } from 'react-router-dom';
import { User, Briefcase, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function RoleSelection() {
  const roles = [
    {
      id: 'customer',
      title: 'Customer Banking',
      tagline: 'Personal & Business Accounts',
      description: 'Access balances, transfer funds with instant receipts, manage beneficiaries, pay utilities, and apply for loan financing.',
      path: '/customer/login',
      icon: User,
      color: 'blue',
      badge: 'Online Banking'
    },
    {
      id: 'employee',
      title: 'Employee Portal',
      tagline: 'Branch Staff Operations',
      description: 'Assist customer onboarding, review KYC identity documents, respond to service requests, and investigate transactions.',
      path: '/employee/login',
      icon: Briefcase,
      color: 'purple',
      badge: 'Staff Operations'
    },
    {
      id: 'manager',
      title: 'Branch Admin / Manager',
      tagline: 'Branch Oversight & Approvals',
      description: 'Review high-risk Maker-Checker approvals, underwrite loans, audit branch operations, and manage employee privileges.',
      path: '/manager/login',
      icon: ShieldCheck,
      color: 'navy',
      badge: 'Executive Oversight'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--slate-50)' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '4.5rem 2rem 6rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--slate-500)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={16} /> Return to Homepage
          </Link>
          <span style={{ display: 'block', color: 'var(--blue-600)', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Multi-Tier Authentication Gate
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.4rem', letterSpacing: '-0.025em' }}>
            Choose Your Access Portal
          </h1>
          <p style={{ color: 'var(--slate-600)', fontSize: '1.05rem', marginTop: '0.75rem', maxWidth: '620px', margin: '0.75rem auto 0' }}>
            Select your assigned role to access your dedicated banking environment. Authentication is role-isolated and strictly validated.
          </p>
        </div>

        {/* 3 Distinct Role Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.25rem',
            alignItems: 'stretch'
          }}
        >
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '2.25rem 2rem',
                  borderRadius: 'var(--radius-xl)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid var(--slate-200)',
                  transition: 'var(--transition)'
                }}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor:
                          role.color === 'blue' ? 'var(--blue-50)' :
                          role.color === 'purple' ? 'var(--purple-50)' : 'var(--navy-900)',
                        color:
                          role.color === 'blue' ? 'var(--blue-600)' :
                          role.color === 'purple' ? 'var(--purple-600)' : 'var(--white)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <Icon size={28} />
                    </div>
                    <span className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {role.badge}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: '0.25rem' }}>
                    {role.title}
                  </h2>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--blue-600)', marginBottom: '1rem' }}>
                    {role.tagline}
                  </div>

                  <p style={{ fontSize: '0.925rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {role.description}
                  </p>
                </div>

                <div>
                  {/* Navigation Button */}
                  <Link
                    to={role.path}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      fontSize: '1rem',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    Enter {role.title} <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
