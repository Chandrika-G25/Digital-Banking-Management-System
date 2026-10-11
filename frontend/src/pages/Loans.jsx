import React, { useState, useEffect } from 'react';
import { DollarSign, PlusCircle, CheckCircle2, Clock, AlertCircle, Lock } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { apiRequest } from '../services/api';
import { verificationService } from '../services/verificationService';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [loanType, setLoanType] = useState('PERSONAL');
  const [amount, setAmount] = useState('5000.00');
  const [termMonths, setTermMonths] = useState(24);
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [verification, setVerification] = useState(null);

  const fetchLoans = async () => {
    try {
      const [data, vData] = await Promise.all([
        apiRequest('/customer/loans/').catch(() => []),
        verificationService.getStatus().catch(() => null)
      ]);
      const list = Array.isArray(data) ? data : (data?.results || []);
      setLoans(list);
      setVerification(vData);
    } catch {
      setLoans([]);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);

    try {
      await apiRequest('/customer/loans/', {
        method: 'POST',
        body: {
          loan_type: loanType,
          amount: amount,
          term_months: termMonths,
          purpose: purpose
        }
      });
      setSuccess('Loan application submitted successfully! It is now under review by your branch manager.');
      setOpenModal(false);
      setPurpose('');
      fetchLoans();
    } catch (err) {
      setError(err.message || 'Application failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Loan Services" subtitle="Apply for personal, home mortgage, auto, or education loans">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Your Loan Portfolios</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Submitted Applications: {loans.length}</p>
        </div>
        {verification && verification.status !== 'VERIFIED' ? (
          <button
            className="btn btn-secondary"
            disabled
            title="Loan applications unlocked after account verification"
            style={{ opacity: 0.65, cursor: 'not-allowed' }}
          >
            <Lock size={16} /> Awaiting Verification
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setOpenModal(true)}>
            <PlusCircle size={16} /> Apply for New Loan
          </button>
        )}
      </div>

      {verification && verification.status !== 'VERIFIED' && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Lock size={20} color="#d97706" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
            <strong>Loan Applications Restricted:</strong> Your account status is {verification.status.replace(/_/g, ' ')}. Loan applications are available once your account is verified by bank staff.
          </div>
        </div>
      )}

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

      {/* Loans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {loans.map((loan) => (
          <div key={loan.id} className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className="badge badge-info">{loan.loan_type_display || loan.loan_type}</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.35rem' }}>
                  ${loan.amount}
                </div>
              </div>
              <StatusBadge status={loan.status} />
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
              <div>Term: <strong>{loan.term_months} Months</strong></div>
              <div>Applied: <strong>{new Date(loan.applied_at).toLocaleDateString()}</strong></div>
              <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--slate-500)' }}>
                "{loan.purpose}"
              </div>
            </div>

            {loan.notes && (
              <div style={{ backgroundColor: 'var(--slate-50)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.775rem', border: '1px solid var(--slate-200)', color: 'var(--slate-600)' }}>
                <strong>Underwriter Note:</strong> {loan.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Apply Loan Modal */}
      {openModal && (
        <div className="modal-backdrop" onClick={() => setOpenModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Apply for Financing</h3>
              <button onClick={() => setOpenModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleApply}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Financing Product</label>
                  <select
                    className="form-control"
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                  >
                    <option value="PERSONAL">Personal Financing (6.5% APR)</option>
                    <option value="HOME">Home Mortgage Loan (4.9% APR)</option>
                    <option value="AUTO">Automotive Financing (5.2% APR)</option>
                    <option value="EDUCATION">Higher Education Tuition Loan (3.8% APR)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Principal Amount Requested ($)</label>
                  <input
                    type="number"
                    step="100.00"
                    min="500.00"
                    max="250000.00"
                    className="form-control"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Repayment Term (Months)</label>
                  <select
                    className="form-control"
                    value={termMonths}
                    onChange={(e) => setTermMonths(parseInt(e.target.value))}
                  >
                    <option value={12}>12 Months (1 Year)</option>
                    <option value={24}>24 Months (2 Years)</option>
                    <option value={36}>36 Months (3 Years)</option>
                    <option value={60}>60 Months (5 Years)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Detailed Purpose of Financing</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Describe how the funds will be deployed..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setOpenModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
