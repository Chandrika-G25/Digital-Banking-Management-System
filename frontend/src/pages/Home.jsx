import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ArrowRight, Lock, Zap, RefreshCw, Smartphone,
  CheckCircle2, CreditCard, ChevronDown, ChevronUp, UserCheck,
  Building2, Landmark, Clock, Award, ShieldAlert, UserPlus
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'How does SecureBank protect my personal and financial data?',
      a: 'SecureBank enforces double-entry SQL ledger accounting, cryptographic password hashing, role-based authorization, and real-time branch audit trails to ensure complete balance and transaction integrity.'
    },
    {
      q: 'Are internal transfers processed immediately?',
      a: 'Yes. Transfers between SecureBank accounts execute atomically using database row locking, ensuring balances update simultaneously and immediately push real-time WebSocket notifications.'
    },
    {
      q: 'What is the Maker-Checker security control?',
      a: 'Maker-Checker is an enterprise banking safeguard preventing fraud. For high-risk operations (such as high-value transfers or loan disbursements), the employee who initiates the request is blocked from approving it; an independent Branch Manager must review and sign off.'
    },
    {
      q: 'How do I access my role-specific dashboard?',
      a: 'Click "Get Started" to visit the portal selector. From there, choose either Customer Banking, Employee Operations, or Branch Manager Portal to sign in with your credentials.'
    },
    {
      q: 'Is this demo connected to real financial institutions?',
      a: 'No. SecureBank is a software demonstration environment with simulated internal accounts and transactions. All money displayed is fictional demo balance.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--slate-50)' }}>
      <Navbar />

      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--navy-950) 0%, var(--navy-900) 50%, var(--navy-800) 100%)',
          color: 'var(--white)',
          padding: '5.5rem 2rem 6.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Ambient background glows */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, rgba(37, 99, 235, 0) 70%)',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            left: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%)',
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            alignItems: 'center',
            gap: '3.5rem',
            position: 'relative',
            zIndex: 10
          }}
        >
          {/* Left Text Column */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 'var(--radius-full)',
                padding: '0.35rem 1rem',
                marginBottom: '1.5rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--blue-400)'
              }}
            >
              <ShieldCheck size={16} /> Enterprise Digital Financial Platform
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
                fontWeight: 800,
                color: 'var(--white)',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '1.5rem'
              }}
            >
              Banking Made <span style={{ color: 'var(--blue-400)' }}>Simple</span> &amp; <span style={{ color: 'var(--emerald-500)' }}>Secure</span>.
            </h1>

            <p
              style={{
                fontSize: '1.15rem',
                lineHeight: 1.6,
                color: 'var(--slate-300)',
                marginBottom: '2.25rem',
                maxWidth: '560px'
              }}
            >
              Experience seamless digital banking with real-time fund transfers, atomic SQL double-entry ledgers, role-governed employee workflows, and branch-level administrative intelligence.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <Link to="/customer/open-account" id="btn-hero-open-account" className="btn btn-primary btn-lg" style={{ backgroundColor: 'var(--emerald-600)', borderColor: 'var(--emerald-500)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}>
                <UserPlus size={18} /> Open a New Bank Account
              </Link>
              <Link to="/login" className="btn btn-primary btn-lg">
                Sign In <ArrowRight size={18} />
              </Link>
              <a href="#features" className="btn btn-secondary btn-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--white)', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                Explore Features
              </a>
            </div>

            {/* Quick Metrics Banner */}
            <div
              style={{
                marginTop: '3rem',
                display: 'flex',
                gap: '2.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '1.75rem'
              }}
            >
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--white)' }}>$2.4M+</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>Simulated Daily Volume</div>
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--blue-400)' }}>100%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>Atomic Ledger Integrity</div>
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--emerald-500)' }}>&lt; 50ms</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>WebSocket Dispatch</div>
              </div>
            </div>
          </div>

          {/* Right Visual Card Column */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '460px',
                position: 'relative'
              }}
            >
              {/* Virtual Titanium Debit Card Mockup */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '2rem',
                  color: 'var(--white)',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={28} color="var(--blue-400)" />
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>SecureBank</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--blue-300)' }}>
                    Platinum Elite
                  </span>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Available Primary Balance
                  </div>
                  <div style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--white)' }}>
                    $15,450.00 <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--blue-300)' }}>USD</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', textTransform: 'uppercase' }}>Card Holder</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Alexander Vance</div>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.1em' }}>
                    •••• 7465
                  </div>
                </div>
              </div>

              {/* Floating Real-Time Transfer Pill */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-25px',
                  right: '-15px',
                  backgroundColor: 'var(--white)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.85rem 1.25rem',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  border: '1px solid var(--slate-200)',
                  color: 'var(--navy-950)'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--emerald-50)',
                    color: 'var(--emerald-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>Real-Time Transfer</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--emerald-600)' }}>+$1,200.00 Received</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="features" style={{ padding: '6rem 2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ color: 'var(--blue-600)', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Comprehensive Solutions
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.5rem' }}>
            Everything You Need for Digital Finance
          </h2>
          <p style={{ maxWidth: '650px', margin: '0.75rem auto 0', color: 'var(--slate-600)' }}>
            Engineered with institutional-grade architecture to satisfy modern customers, frontline tellers, and branch directors alike.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Feature 1 */}
          <div className="card">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--blue-50)', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Instant Atomic Transfers</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Execute internal transfers between accounts with atomic row locking and double-entry ledger bookkeeping. Balances reflect immediately without risk of double-spending.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <CreditCard size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Account &amp; Deposit Management</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Manage Savings and Current accounts, open new Fixed Deposits, view masked account numbers, and download complete account statements in CSV format anytime.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--purple-50)', color: 'var(--purple-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Building2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Branch Staff Workflows</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Empower branch employees to assist customer onboarding, review KYC identification documents, manage customer service tickets, and inspect transaction histories.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="card">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--amber-50)', color: 'var(--amber-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <UserCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Maker-Checker Approval Controls</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Enforce strict segregation of duties. High-risk actions and loan disbursements require dual sign-off where the initiator is programmatically barred from approving their own request.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="card">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Lock size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Three Independent Login Portals</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Strictly segregated authentication routes for Customers (`/customer/login`), Employees (`/employee/login`), and Branch Managers (`/manager/login`) with backend permission enforcement.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="card">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--blue-50)', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <RefreshCw size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Live WebSockets &amp; Alerts</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Never manually refresh. Live notifications, instant balance refreshes, and manager approval alerts stream in real time powered by Django Channels.
            </p>
          </div>
        </div>
      </section>

      {/* How Online Banking Works */}
      <section id="how-it-works" style={{ backgroundColor: 'var(--white)', padding: '5.5rem 2rem', borderTop: '1px solid var(--slate-200)', borderBottom: '1px solid var(--slate-200)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ color: 'var(--blue-600)', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Simple 3-Step Process
            </span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.5rem' }}>
              How Online Banking Works
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--blue-600)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, margin: '0 auto 1.5rem', boxShadow: 'var(--shadow-glow)' }}>
                1
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Select Your Portal</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', lineHeight: 1.6 }}>
                Navigate to your dedicated portal: Customer Banking, Employee Operations, or Branch Manager Administration.
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--navy-800)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, margin: '0 auto 1.5rem' }}>
                2
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Authenticate Securely</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', lineHeight: 1.6 }}>
                Sign in with your Customer/Employee ID or registered email. All passwords are encrypted with PBKDF2 hashing.
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--emerald-600)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, margin: '0 auto 1.5rem' }}>
                3
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Transact &amp; Manage in Real Time</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', lineHeight: 1.6 }}>
                Send money, pay bills, approve loans, and monitor audit trails with real-time WebSocket balance updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy Banner */}
      <section id="security" style={{ backgroundColor: 'var(--navy-900)', color: 'var(--white)', padding: '5.5rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--emerald-400)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '1rem' }}>
              <ShieldCheck size={18} /> Zero-Trust Financial Architecture
            </div>
            <h2 style={{ color: 'var(--white)', fontSize: '2.25rem', marginBottom: '1.25rem' }}>
              Security &amp; Privacy By Design
            </h2>
            <p style={{ color: 'var(--slate-300)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Every transfer in SecureBank follows double-entry ledger verification. Balances are derived directly from the SQL database — never from browser local storage.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={20} color="var(--emerald-400)" />
                <span style={{ fontSize: '0.95rem' }}>Idempotency keys prevent duplicate transfer retries</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={20} color="var(--emerald-400)" />
                <span style={{ fontSize: '0.95rem' }}>Database row locking (<code style={{ color: 'var(--blue-400)' }}>select_for_update</code>) blocks race conditions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={20} color="var(--emerald-400)" />
                <span style={{ fontSize: '0.95rem' }}>Branch-level access filtering restricts cross-branch snooping</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={20} color="var(--emerald-400)" />
                <span style={{ fontSize: '0.95rem' }}>Comprehensive immutable audit trails for every staff decision</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="card-navy" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', maxWidth: '420px', width: '100%' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--white)' }}>Security Highlights</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-md)' }}>
                  <strong>Authentication:</strong> Django Session + Token auth with password hashing
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-md)' }}>
                  <strong>Data Privacy:</strong> Sensitive account numbers masked in UI (<code style={{ color: 'var(--blue-300)' }}>•••• 7465</code>)
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-md)' }}>
                  <strong>Maker-Checker:</strong> Mandatory dual authorization for high-risk operations
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials (clearly labeled demo content) */}
      <section style={{ padding: '5.5rem 2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ color: 'var(--blue-600)', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Client Feedback
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.5rem' }}>
            Trusted by Individuals &amp; Businesses
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginTop: '0.35rem' }}>
            (Sample / Demo Testimonial Profiles)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          <div className="card">
            <p style={{ fontStyle: 'italic', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              "The speed of fund transfers and instant receipt generation give me complete peace of mind when allocating vendor payments for my software consultancy."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--blue-600)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                A
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy-950)' }}>Alexander Vance</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Tech Founder &bull; Customer Account CUST1001</div>
              </div>
            </div>
          </div>

          <div className="card">
            <p style={{ fontStyle: 'italic', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              "The branch management dashboard gives our leadership live operational visibility across customer volume, loan applications, and employee audit trails."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--navy-800)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                M
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy-950)' }}>Marcus Sterling</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Branch Director &bull; Metro Main Branch</div>
              </div>
            </div>
          </div>

          <div className="card">
            <p style={{ fontStyle: 'italic', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              "Managing customer KYC reviews and checking service requests is streamlined and responsive. The WebSocket notifications keep our staff in sync."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--purple-600)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                E
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy-950)' }}>Elena Rostova</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Senior Banking Specialist &bull; Staff EMP2001</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" style={{ backgroundColor: 'var(--white)', padding: '5.5rem 2rem', borderTop: '1px solid var(--slate-200)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ color: 'var(--blue-600)', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Common Inquiries
            </span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.5rem' }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  transition: 'var(--transition)'
                }}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: openFaq === idx ? 'var(--slate-50)' : 'var(--white)',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--navy-950)'
                  }}
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={20} color="var(--blue-600)" /> : <ChevronDown size={20} color="var(--slate-400)" />}
                </button>
                {openFaq === idx && (
                  <div style={{ padding: '1rem 1.5rem 1.5rem', backgroundColor: 'var(--slate-50)', color: 'var(--slate-600)', fontSize: '0.925rem', lineHeight: 1.6, borderTop: '1px solid var(--slate-200)' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--navy-800))', color: 'var(--white)', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--white)', fontSize: '2.25rem', marginBottom: '1rem' }}>
            Ready to Experience Modern Banking?
          </h2>
          <p style={{ color: 'var(--blue-100)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            Launch your account or explore the employee and managerial administration portals now with pre-seeded demo credentials.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/customer/open-account" className="btn btn-primary btn-lg" style={{ backgroundColor: 'var(--emerald-600)', borderColor: 'var(--emerald-500)' }}>
              <UserPlus size={18} /> Open a New Bank Account
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg" style={{ backgroundColor: 'var(--white)', color: 'var(--navy-950)' }}>
              Get Started Now <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
