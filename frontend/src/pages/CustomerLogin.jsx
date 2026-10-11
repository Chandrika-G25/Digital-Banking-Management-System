import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredNotice, setRegisteredNotice] = useState('');

  useEffect(() => {
    // Check if redirected from successful registration with prefilled Customer ID
    const prefilled = location.state?.prefilledId || location.state?.customerId;
    if (prefilled) {
      setIdentifier(prefilled);
      setRegisteredNotice(`Customer ID ${prefilled} is ready! Enter your secure password to log in.`);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use customer-specific authentication endpoint
      let data;
      try {
        data = await authService.customerLogin(identifier, password);
      } catch (authErr) {
        // Fallback to standard login
        data = await authService.login(identifier, password, 'CUSTOMER');
      }

      // Check verification routing
      const verificationStatus = data.verification_status || data.user?.verification_status;
      const redirectUrl = data.redirect_url;

      if (verificationStatus === 'REJECTED') {
        setError('Your application was not approved during bank verification. Redirecting to your verification status report...');
        setTimeout(() => {
          navigate('/customer/verification-status');
        }, 1500);
        return;
      }

      if (redirectUrl) {
        navigate(redirectUrl);
      } else if (verificationStatus === 'VERIFIED') {
        navigate('/customer/dashboard');
      } else {
        navigate('/customer/verification-status');
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please verify your Customer ID and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--slate-50)' }}>
      <Navbar />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '460px', width: '100%' }}>
          {/* Back link */}
          <Link
            to="/login"
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
            <ArrowLeft size={16} /> Back to Portal Selection
          </Link>

          <div
            className="card"
            style={{
              padding: '2.5rem 2rem',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              backgroundColor: 'var(--white)'
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--blue-50)',
                  color: 'var(--blue-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <User size={26} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                Customer Sign In
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.35rem' }}>
                Sign in with your Customer ID and password to access banking or track verification
              </p>
            </div>

            {/* Registration Success Alert */}
            {registeredNotice && (
              <div
                style={{
                  backgroundColor: 'var(--emerald-50)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'var(--emerald-700)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{registeredNotice}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                style={{
                  backgroundColor: 'var(--rose-50)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: 'var(--rose-600)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
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

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="customer-identifier">Customer ID or Registered Email</label>
                <div className="input-with-icon">
                  <User className="input-icon" size={18} />
                  <input
                    id="customer-identifier"
                    type="text"
                    className="form-control"
                    placeholder="e.g. SB100001 or email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="customer-password">Password</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="customer-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--slate-600)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--blue-600)' }}
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                id="btn-customer-login"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In to Banking'} <ArrowRight size={18} />
              </button>
            </form>

            {/* Open New Account Section */}
            <div
              style={{
                marginTop: '1.75rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--slate-100)',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '0.85rem' }}>
                New to SecureBank? Open an account in under 3 minutes.
              </div>
              <Link
                to="/customer/open-account"
                id="btn-open-new-account"
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--blue-600)',
                  borderColor: 'var(--blue-200)',
                  backgroundColor: 'var(--blue-50)'
                }}
              >
                <UserPlus size={18} /> Open a New Bank Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
