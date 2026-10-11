import React, { useState, useEffect } from 'react';
import { CreditCard, PlusCircle, CheckCircle2, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { apiRequest } from '../services/api';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [accType, setAccType] = useState('SAVINGS');
  const [deposit, setDeposit] = useState('250.00');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/customer/accounts/');
      const list = Array.isArray(data) ? data : (data?.results || []);
      setAccounts(list);
    } catch {
      setError('Failed to fetch accounts.');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const data = await apiRequest('/customer/accounts/', {
        method: 'POST',
        body: {
          account_type: accType,
          initial_deposit: deposit
        }
      });
      setSuccess(`Account ${data.account_number} created successfully with balance $${deposit}!`);
      setOpenModal(false);
      fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to open account.');
    }
  };

  return (
    <DashboardLayout pageTitle="Accounts &amp; Deposits" subtitle="Manage your checking, high-yield savings, and fixed term deposits">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Active Deposit Portfolios</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Total Registered Accounts: {accounts.length}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpenModal(true)}>
          <PlusCircle size={16} /> Open New Account / Fixed Deposit
        </button>
      </div>

      {success && (
        <div style={{ backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Accounts List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {accounts.map((acc) => (
          <div key={acc.id} className="card" style={{ padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 'var(--radius-xl)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span className="badge badge-info">
                  {acc.account_type.replace('_', ' ')}
                </span>
                <span className={`badge ${acc.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                  {acc.status}
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Account Balance
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.25rem' }}>
                ${acc.balance} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--slate-500)' }}>{acc.currency}</span>
              </div>

              <div style={{ marginTop: '1rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--slate-500)' }}>Account Number:</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--navy-900)' }}>{acc.account_number}</strong>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
              <span>Opened {new Date(acc.created_at).toLocaleDateString()}</span>
              <span style={{ color: 'var(--emerald-600)', fontWeight: 600 }}>Zero Ledger Deficit</span>
            </div>
          </div>
        ))}
      </div>

      {/* Open Account Modal */}
      {openModal && (
        <div className="modal-backdrop" onClick={() => setOpenModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Open New Bank Account / FD</h3>
              <button onClick={() => setOpenModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleCreateAccount}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Account Category</label>
                  <select
                    className="form-control"
                    value={accType}
                    onChange={(e) => setAccType(e.target.value)}
                  >
                    <option value="SAVINGS">High-Yield Savings Account (4.25% APY)</option>
                    <option value="CURRENT">Current / Checking Business Account (0.00% fee)</option>
                    <option value="FIXED_DEPOSIT">Fixed Term Deposit (5.50% APY / 12 Months)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Opening Deposit (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    className="form-control"
                    placeholder="250.00"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setOpenModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Open Account Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
