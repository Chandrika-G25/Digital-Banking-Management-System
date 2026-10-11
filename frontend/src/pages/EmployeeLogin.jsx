import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { authService } from '../services/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(identifier, password, 'EMPLOYEE');
      navigate(data.redirect_url || '/employee/dashboard');
    } catch (err) {
      setError(err.message || 'Staff authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--slate-50)' }}>
      <Navbar />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '440px', width: '100%' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--slate-500)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={16} /> Back to Portal Selection
          </Link>

          <div
            className="card"
            style={{
              padding: '2.5rem 2rem',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--purple-50)',
                  color: 'var(--purple-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}
              >
                <Briefcase size={24} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                Employee Portal
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.35rem' }}>
                Internal branch operations &amp; customer service desk
              </p>
            </div>



            {error && (
              <div
                style={{
                  backgroundColor: 'var(--rose-50)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: 'var(--rose-600)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="employee-identifier">Employee ID or Corporate Email</label>
                <div className="input-with-icon">
                  <Briefcase className="input-icon" size={18} />
                  <input
                    id="employee-identifier"
                    type="text"
                    className="form-control"
                    placeholder="e.g. EMP2001 or employee@securebank.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="employee-password">Password</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="employee-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <Link to="/forgot-password" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In to Staff Portal'} <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
