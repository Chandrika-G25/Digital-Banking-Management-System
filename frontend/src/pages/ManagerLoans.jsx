import React, { useState, useEffect } from 'react';
import { DollarSign, Check, X, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { apiRequest } from '../services/api';

export default function ManagerLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/manager/loans/');
      const list = Array.isArray(data) ? data : (data?.results || []);
      setLoans(list);
    } catch {
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleDecision = async (action) => {
    if (!selectedLoan) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiRequest('/manager/loans/', {
        method: 'POST',
        body: {
          id: selectedLoan.id,
          action: action,
          notes: notes
        }
      });
      setSuccess(`Loan application #${selectedLoan.id} for $${selectedLoan.amount} marked as ${action}D! ${action === 'APPROVE' ? 'Funds disbursed automatically to customer account.' : ''}`);
      setSelectedLoan(null);
      setNotes('');
      fetchLoans();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Loan Underwriting Reviews" subtitle="Review branch mortgage and personal loan applications with automatic fund disbursement">
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

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>App ID</th>
              <th>Customer</th>
              <th>Product Type</th>
              <th>Principal Amount</th>
              <th>Term</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Underwriting Action</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--blue-600)' }}>#{l.id}</strong>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{l.customer_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{l.customer_id}</div>
                </td>
                <td>
                  <span className="badge badge-info">{l.loan_type_display || l.loan_type}</span>
                </td>
                <td>
                  <strong style={{ fontSize: '1rem', color: 'var(--navy-950)' }}>${l.amount}</strong>
                </td>
                <td>{l.term_months} Mos</td>
                <td style={{ maxWidth: '220px', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                  {l.purpose}
                </td>
                <td>
                  <StatusBadge status={l.status} />
                </td>
                <td>
                  {l.status === 'PENDING' ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setSelectedLoan(l)}
                    >
                      Underwrite &amp; Decide
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                      {l.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Decision Modal */}
      {selectedLoan && (
        <div className="modal-backdrop" onClick={() => setSelectedLoan(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Loan Review: {selectedLoan.customer_name}</h3>
              <button onClick={() => setSelectedLoan(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
            </div>

            <div className="modal-body">
              <div style={{ backgroundColor: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                <div>Amount: <strong style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>${selectedLoan.amount} USD</strong></div>
                <div>Product: <strong>{selectedLoan.loan_type_display || selectedLoan.loan_type}</strong></div>
                <div>Customer ID: <strong>{selectedLoan.customer_id}</strong></div>
                <div style={{ marginTop: '0.5rem' }}>Purpose: "{selectedLoan.purpose}"</div>
              </div>

              <div className="form-group">
                <label className="form-label">Underwriter Risk Evaluation / Comments</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="e.g. Credit score verified, debt-to-income ratio meets institutional guidelines..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-danger"
                onClick={() => handleDecision('REJECT')}
                disabled={submitting}
              >
                <X size={16} /> Decline Application
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleDecision('APPROVE')}
                disabled={submitting}
              >
                <Check size={16} /> Approve &amp; Disburse Funds
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
