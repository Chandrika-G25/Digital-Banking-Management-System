import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Key, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../services/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Request token, 2: Reset password
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestToken = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await authService.requestPasswordReset(email);
      if (data.reset_token) {
        setToken(data.reset_token); // Auto-fill token in demo mode
        setMessage(`Reset token generated: ${data.reset_token}`);
      } else {
        setMessage(data.message || 'If registered, a token has been generated.');
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to request reset token.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await authService.confirmPasswordReset(token, newPassword);
      setMessage(data.message || 'Password reset successfully!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your token.');
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
            <ArrowLeft size={16} /> Back to Sign In
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
                  backgroundColor: 'var(--blue-50)',
                  color: 'var(--blue-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}
              >
                <Key size={24} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                Account Recovery
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.35rem' }}>
                {step === 1 ? 'Enter your registered email to receive a reset token' : 'Enter your reset token and new security password'}
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

            {message && (
              <div
                style={{
                  backgroundColor: 'var(--emerald-50)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'var(--emerald-600)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{message}</span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleRequestToken}>
                <div className="form-group">
                  <label className="form-label" htmlFor="recovery-email">Registered Email</label>
                  <div className="input-with-icon">
                    <Mail className="input-icon" size={18} />
                    <input
                      id="recovery-email"
                      type="email"
                      className="form-control"
                      placeholder="e.g. customer@securebank.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Generate Reset Token'} <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset}>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-token">Reset Token</label>
                  <div className="input-with-icon">
                    <Key className="input-icon" size={18} />
                    <input
                      id="reset-token"
                      type="text"
                      className="form-control"
                      placeholder="Paste recovery token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="new-password">New Security Password</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="new-password"
                      type="password"
                      className="form-control"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
                  disabled={loading}
                >
                  {loading ? 'Updating Password...' : 'Reset Password'} <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
