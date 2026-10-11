import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertTriangle, DollarSign, TrendingUp, Users,
  Building, RefreshCw, AlertCircle, CheckCircle2, RotateCcw, X, FileText
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StatCard from '../components/StatCard';
import DepositReceiptModal from '../components/DepositReceiptModal';
import { depositService } from '../services/depositService';
import { authService } from '../services/auth';

export default function ManagerCashDeposits() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = authService.getCurrentUser() || {};

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reversal Modal state
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [targetDeposit, setTargetDeposit] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const [reversalError, setReversalError] = useState('');
  const [reversalSuccess, setReversalSuccess] = useState('');

  // Receipt Modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await depositService.getManagerSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve manager deposit monitoring data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleOpenReversal = (deposit) => {
    setTargetDeposit(deposit);
    setReversalReason('');
    setReversalError('');
    setReversalSuccess('');
    setReversalModalOpen(true);
  };

  const handleExecuteReversal = async (e) => {
    e.preventDefault();
    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      setReversalError('A comprehensive justification (minimum 5 characters) is required for audit compliance.');
      return;
    }

    setReversing(true);
    setReversalError('');

    try {
      await depositService.reverseDeposit(targetDeposit.reference_number, reversalReason);
      setReversalSuccess(`Deposit ${targetDeposit.reference_number} successfully reversed. Offsetting ledger debit entry posted.`);
      setTimeout(() => {
        setReversalModalOpen(false);
        fetchSummary();
      }, 1500);
    } catch (err) {
      setReversalError(err.message || 'Reversal failed. Check account balance or permissions.');
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="dashboard-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <div className="dashboard-content" style={{ padding: '2.5rem 2rem 5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--amber-600)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <ShieldCheck size={16} /> Branch Administration &amp; Oversight
              </div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.25rem', letterSpacing: '-0.025em' }}>
                Cash Deposit Monitoring
              </h1>
              <p style={{ color: 'var(--slate-600)', fontSize: '0.975rem', marginTop: '0.35rem' }}>
                Real-time branch cash flow analytics, teller performance, high-value deposit oversight, and authorized reversal governance.
              </p>
            </div>

            <button
              onClick={fetchSummary}
              className="btn btn-outline"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Analytics
            </button>
          </div>

          {error && (
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {loading && !summary ? (
            <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--slate-500)' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--blue-600)' }} />
              <div>Aggregating branch cash counter metrics...</div>
            </div>
          ) : summary ? (
            <>
              {/* Stat Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.25rem' }}>
                <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Today's Deposit Volume
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--emerald-600)', margin: '0.35rem 0' }}>
                    {summary.today.total_formatted}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                    Total Today: <strong>{summary.today.total_count} transactions</strong>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Branch Cumulative Volume
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--blue-700)', margin: '0.35rem 0' }}>
                    {summary.all_time.total_formatted}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                    All-Time Deposits: <strong>{summary.all_time.total_count}</strong>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Active Counter Tellers
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--purple-700)', margin: '0.35rem 0' }}>
                    {summary.employee_breakdown.length}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                    Branch: <strong>{summary.branch.name}</strong>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Review Threshold
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--amber-600)', margin: '0.35rem 0' }}>
                    {summary.limits.requires_approval_formatted}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                    Daily Branch Cap: <strong>{summary.limits.daily_branch_formatted}</strong>
                  </div>
                </div>
              </div>

              {/* Unusual / High-Value Review Panel */}
              {summary.unusual_activity && summary.unusual_activity.length > 0 && (
                <div
                  className="card"
                  style={{
                    padding: '1.75rem',
                    borderRadius: 'var(--radius-xl)',
                    marginBottom: '2.25rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.04)',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', color: 'var(--amber-800)' }}>
                    <AlertTriangle size={22} color="var(--amber-600)" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                      Unusual &amp; High-Value Counter Activity (Requiring Manager Review)
                    </h3>
                  </div>

                  <div className="table-responsive">
                    <table className="table" style={{ margin: 0, backgroundColor: 'var(--white)', borderRadius: 'var(--radius-md)' }}>
                      <thead>
                        <tr>
                          <th>Ref Number</th>
                          <th>Date &amp; Time</th>
                          <th>Customer ID</th>
                          <th>Account (Masked)</th>
                          <th>Amount (INR)</th>
                          <th>Teller ID</th>
                          <th>Investigation Note</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.unusual_activity.map((un) => (
                          <tr key={un.reference_number}>
                            <td><code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{un.reference_number}</code></td>
                            <td style={{ fontSize: '0.85rem' }}>{un.created_at}</td>
                            <td><code style={{ fontFamily: 'monospace' }}>{un.customer_id}</code></td>
                            <td><code style={{ fontFamily: 'monospace' }}>{un.account_number_masked}</code></td>
                            <td><strong style={{ color: 'var(--emerald-600)' }}>{un.amount_formatted}</strong></td>
                            <td><span style={{ fontFamily: 'monospace', color: 'var(--purple-700)' }}>{un.teller_id}</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--amber-800)' }}>{un.reason}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                style={{ color: 'var(--rose-600)', borderColor: 'var(--rose-300)' }}
                                onClick={() => handleOpenReversal(un)}
                              >
                                Reversal Workflow
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Two Column Layout: Teller Breakdown & Recent Stream */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
                {/* Teller Breakdown */}
                <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <Users size={20} color="var(--blue-600)" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                      Deposit Volume by Teller / Employee
                    </h3>
                  </div>

                  {summary.employee_breakdown.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-400)', fontSize: '0.85rem' }}>
                      No teller deposits recorded yet for this branch.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Teller Name</th>
                            <th>Employee ID</th>
                            <th>Deposit Count</th>
                            <th style={{ textAlign: 'right' }}>Total Volume (INR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.employee_breakdown.map((emp) => (
                            <tr key={emp.employee_id}>
                              <td><strong style={{ color: 'var(--navy-950)' }}>{emp.name}</strong></td>
                              <td><code style={{ fontFamily: 'monospace', color: 'var(--purple-700)' }}>{emp.employee_id}</code></td>
                              <td><span className="badge badge-info">{emp.count} processed</span></td>
                              <td style={{ textAlign: 'right' }}>
                                <strong style={{ color: 'var(--emerald-600)' }}>{emp.total_formatted}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Branch Limits & Policy Overview */}
                <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <Building size={20} color="var(--blue-600)" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                      Configurable Branch Deposit Limits
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                      <span style={{ color: 'var(--slate-500)' }}>Assigned Branch:</span>
                      <strong style={{ color: 'var(--navy-950)' }}>{summary.branch.name} ({summary.branch.code})</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                      <span style={{ color: 'var(--slate-500)' }}>Max Single Deposit (Teller):</span>
                      <strong style={{ color: 'var(--navy-950)' }}>{summary.limits.max_single_formatted}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                      <span style={{ color: 'var(--slate-500)' }}>Manager Review Threshold:</span>
                      <strong style={{ color: 'var(--amber-700)' }}>{summary.limits.requires_approval_formatted}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                      <span style={{ color: 'var(--slate-500)' }}>Daily Cumulative Branch Cap:</span>
                      <strong style={{ color: 'var(--blue-700)' }}>{summary.limits.daily_branch_formatted}</strong>
                    </div>

                    <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--slate-50)', border: '1px solid var(--slate-200)', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--slate-500)', lineHeight: 1.5 }}>
                      <strong>Governance Protocol:</strong> Counter deposits exceeding limits require formal supervisory review. All changes are immutable; reversals generate offsetting ledger records with complete audit trails.
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <Footer />
      </div>

      {/* Reversal Workflow Modal */}
      {reversalModalOpen && targetDeposit && (
        <div className="modal-backdrop" onClick={() => setReversalModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--rose-600)' }}>
                <RotateCcw size={22} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--navy-950)' }}>
                  Authorize Deposit Reversal
                </h3>
              </div>
              <button onClick={() => setReversalModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--rose-50)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.825rem', color: 'var(--rose-900)' }}>
              <strong>Caution:</strong> Reversing this cash deposit will immediately deduct the credit amount from the customer's account and post an offsetting immutable debit ledger entry. This action is permanently audited.
            </div>

            <div style={{ backgroundColor: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Transaction Ref:</span>
                <strong style={{ fontFamily: 'monospace' }}>{targetDeposit.reference_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Reversal Amount:</span>
                <strong style={{ color: 'var(--rose-600)', fontSize: '1.1rem' }}>{targetDeposit.amount_formatted}</strong>
              </div>
            </div>

            <form onSubmit={handleExecuteReversal}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Mandatory Reversal Justification Reason <span style={{ color: 'var(--rose-500)' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Detail the authorized audit justification for reversing this counter deposit (e.g. Counter error, teller denomination dispute, fraudulent deposit)..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  required
                />
              </div>

              {reversalError && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {reversalError}
                </div>
              )}

              {reversalSuccess && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-700)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {reversalSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setReversalModalOpen(false)}
                  disabled={reversing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reversing || !reversalReason.trim()}
                  style={{ backgroundColor: 'var(--rose-600)', borderColor: 'var(--rose-600)' }}
                >
                  {reversing ? 'Processing Reversal...' : 'Authorize Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
