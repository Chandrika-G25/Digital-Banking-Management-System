import React, { useState } from 'react';
import { UserPlus, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { apiRequest } from '../services/api';

export default function EmployeeOnboard() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    initial_deposit: '500.00'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await apiRequest('/employee/onboard-customer/', {
        method: 'POST',
        body: formData
      });
      setResult(res);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        initial_deposit: '500.00'
      });
    } catch (err) {
      setError(err.message || 'Onboarding failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Customer Onboarding Assistant" subtitle="Register a new customer account directly from branch operations">
      <div style={{ maxWidth: '650px', margin: '0 auto', width: '100%' }}>
        {result && (
          <div
            style={{
              backgroundColor: 'var(--emerald-50)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--emerald-600)', marginBottom: '0.75rem' }}>
              <CheckCircle2 size={22} />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--emerald-700)' }}>Customer Successfully Onboarded!</h3>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--slate-700)', lineHeight: 1.6 }}>
              <div>Assigned Customer ID: <strong style={{ fontFamily: 'monospace' }}>{result.customer_id}</strong></div>
              <div>Generated Username: <strong>{result.username}</strong></div>
              <div>Primary Account Number: <strong style={{ fontFamily: 'monospace' }}>{result.account_number}</strong></div>
              <div>Initial Balance: <strong>${result.initial_balance} USD</strong></div>
              <div style={{ marginTop: '0.5rem', color: 'var(--blue-700)', fontWeight: 600 }}>{result.message}</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Residential Address</label>
              <textarea
                className="form-control"
                rows="2"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Opening Deposit ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.00"
                className="form-control"
                value={formData.initial_deposit}
                onChange={(e) => setFormData({ ...formData, initial_deposit: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Creating Customer Profile...' : 'Complete In-Branch Onboarding'} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
