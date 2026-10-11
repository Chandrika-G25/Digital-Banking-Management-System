import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, Building } from 'lucide-react';
import { authService } from '../services/auth';
import { apiRequest } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    branch_id: '',
  });
  const [branches, setBranches] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBranches() {
      try {
        const data = await apiRequest('/auth/branches/');
        setBranches(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, branch_id: data[0].id }));
        }
      } catch {
        // Ignore
      }
    }
    loadBranches();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.registerCustomer(formData);
      navigate(data.redirect_url || '/customer/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check form inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--slate-50)' }}>
      <Navbar />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '520px', width: '100%' }}>
          <Link
            to="/customer/login"
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
            <ArrowLeft size={16} /> Back to Customer Login
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
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                Open a SecureBank Account
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.35rem' }}>
                Join SecureBank today with an instant $1,000.00 demo deposit
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="first_name">First Name</label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    className="form-control"
                    placeholder="e.g. John"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="last_name">Last Name</label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Doe"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="username">Choose Username</label>
                <div className="input-with-icon">
                  <User className="input-icon" size={18} />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    className="form-control"
                    placeholder="e.g. john.doe"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div className="input-with-icon">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-control"
                    placeholder="e.g. john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">Phone Number</label>
                <div className="input-with-icon">
                  <Phone className="input-icon" size={18} />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="form-control"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="branch_id">Preferred Branch</label>
                <div className="input-with-icon">
                  <Building className="input-icon" size={18} />
                  <select
                    id="branch_id"
                    name="branch_id"
                    className="form-control"
                    value={formData.branch_id}
                    onChange={handleChange}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Security Password</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
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

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Complete Registration'} <ArrowRight size={18} />
              </button>
            </form>

            <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--slate-100)', paddingTop: '1.5rem', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
              Already registered?{' '}
              <Link to="/customer/login" style={{ color: 'var(--blue-600)', fontWeight: 700 }}>
                Sign In Instead
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
