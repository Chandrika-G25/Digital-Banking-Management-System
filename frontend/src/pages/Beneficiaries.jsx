import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Trash2, Send, Building, AlertCircle, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { apiRequest } from '../services/api';

export default function Beneficiaries() {
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', account_number: '', nickname: '', bank_name: 'SecureBank' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/customer/beneficiaries/');
      const list = Array.isArray(data) ? data : (data?.results || []);
      setBeneficiaries(list);
    } catch {
      setError('Failed to fetch beneficiaries.');
      setBeneficiaries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiRequest('/customer/beneficiaries/', {
        method: 'POST',
        body: formData
      });
      setSuccess(`Beneficiary '${formData.name}' added successfully!`);
      setFormData({ name: '', account_number: '', nickname: '', bank_name: 'SecureBank' });
      setFormOpen(false);
      fetchBeneficiaries();
    } catch (err) {
      setError(err.message || 'Failed to save beneficiary.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this beneficiary?')) return;
    try {
      await apiRequest(`/customer/beneficiaries/${id}/`, { method: 'DELETE' });
      fetchBeneficiaries();
    } catch {
      alert('Failed to delete beneficiary.');
    }
  };

  const handleQuickTransfer = (accNum) => {
    navigate('/customer/transfers');
  };

  return (
    <DashboardLayout pageTitle="Saved Beneficiaries" subtitle="Manage your trusted contacts for 1-click money transfers">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Your Contact Directory</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Total Verified Recipients: {beneficiaries.length}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setFormOpen(!formOpen)}
        >
          <Plus size={16} /> {formOpen ? 'Cancel' : 'Add New Beneficiary'}
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      {/* Add Beneficiary Modal / Collapsible Form */}
      {formOpen && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.75rem', border: '2px solid var(--blue-100)' }}>
          <h4 style={{ marginBottom: '1.25rem', color: 'var(--navy-900)' }}>Register New Beneficiary</h4>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Sarah Jenkins"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 100554433221"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nickname / Note (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Sister, Freelance Partner"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bank Institution</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Beneficiary
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Beneficiaries Grid */}
      {beneficiaries.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
          <Users size={36} strokeWidth={1.5} style={{ margin: '0 auto 0.75rem', color: 'var(--slate-400)' }} />
          <h4 style={{ color: 'var(--navy-900)', marginBottom: '0.25rem' }}>No Saved Beneficiaries</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>Add trusted contacts to quickly send money in one click.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
            <Plus size={15} /> Add First Beneficiary
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {(Array.isArray(beneficiaries) ? beneficiaries : []).map((b) => (
          <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--blue-50)', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {b.name?.[0]?.toUpperCase() || 'B'}
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}
                  title="Delete Beneficiary"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h4 style={{ fontSize: '1.1rem', color: 'var(--navy-950)', marginBottom: '0.2rem' }}>
                {b.name}
              </h4>
              {b.nickname && (
                <div style={{ fontSize: '0.8rem', color: 'var(--blue-600)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  {b.nickname}
                </div>
              )}

              <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '0.35rem' }}>
                Account: <strong style={{ fontFamily: 'monospace' }}>{b.account_number}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                {b.bank_name} &bull; Added {new Date(b.created_at).toLocaleDateString()}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-100)' }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
                onClick={() => handleQuickTransfer(b.account_number)}
              >
                <Send size={14} /> Send Money
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
