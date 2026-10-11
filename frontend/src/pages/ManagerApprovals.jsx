import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ShieldAlert, Check, X, AlertCircle } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { apiRequest } from '../services/api';
import { authService } from '../services/auth';

export default function ManagerApprovals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentUser = authService.getCurrentUser() || {};

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/manager/approvals/');
      const list = Array.isArray(data) ? data : (data?.results || []);
      setApprovals(list);
    } catch {
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (decision) => {
    if (!selectedApproval) return;
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      await apiRequest('/manager/approvals/', {
        method: 'POST',
        body: {
          id: selectedApproval.id,
          decision: decision,
          decision_notes: decisionNotes
        }
      });
      setSuccessMsg(`Approval #${selectedApproval.id} successfully marked as ${decision}!`);
      setSelectedApproval(null);
      setDecisionNotes('');
      fetchApprovals();
    } catch (err) {
      setErrorMsg(err.message || 'Operation rejected by security governance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Maker-Checker Approval Center" subtitle="Dual-control segregation of duties: Initiators cannot self-approve restricted operations">
      {/* Explanation Banner */}
      <div
        style={{
          backgroundColor: 'var(--amber-50)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <ShieldAlert size={28} color="var(--amber-600)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.875rem', color: 'var(--slate-800)', lineHeight: 1.5 }}>
          <strong>Segregation of Duties Enforced:</strong> Under Maker-Checker protocol, high-value transfers, loan releases, and account freezes require two distinct staff members. The maker who initiated the request cannot serve as the checker.
        </div>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Operation Type</th>
              <th>Details &amp; Subject</th>
              <th>Maker (Initiator)</th>
              <th>Status</th>
              <th>Date</th>
              <th>Dual Control Action</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((app) => {
              const isInitiator = currentUser.username === app.initiated_by_name || currentUser.id === app.initiated_by;
              return (
                <tr key={app.id}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--blue-600)' }}>#{app.id}</strong>
                  </td>
                  <td>
                    <span className="badge badge-info">{app.request_type_display || app.request_type}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{app.details}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontFamily: 'monospace' }}>Ref: {app.entity_id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{app.initiated_by_name}</div>
                    {isInitiator && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--rose-600)', fontWeight: 700 }}>(You Initiated This)</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={app.status} />
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {app.status === 'PENDING' ? (
                      isInitiator ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--rose-600)', fontWeight: 700 }}>
                          Self-approval Blocked
                        </span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSelectedApproval(app)}
                        >
                          Review &amp; Decide
                        </button>
                      )
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                        {app.status} by {app.approved_by_name || 'System'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Decision Modal */}
      {selectedApproval && (
        <div className="modal-backdrop" onClick={() => setSelectedApproval(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Authorize Approval #{selectedApproval.id}</h3>
              <button onClick={() => setSelectedApproval(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
            </div>

            <div className="modal-body">
              <div style={{ backgroundColor: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                <div>Operation: <strong>{selectedApproval.request_type_display || selectedApproval.request_type}</strong></div>
                <div>Initiated by: <strong>{selectedApproval.initiated_by_name}</strong></div>
                <div style={{ marginTop: '0.5rem' }}>Details: {selectedApproval.details}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Managerial Decision Notes / Audit Justification</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Record formal justification for this decision..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-danger"
                onClick={() => handleDecision('REJECTED')}
                disabled={submitting}
              >
                <X size={16} /> Reject Request
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleDecision('APPROVED')}
                disabled={submitting}
              >
                <Check size={16} /> Authorize &amp; Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
