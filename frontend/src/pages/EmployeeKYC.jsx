import React, { useState, useEffect } from 'react';
import { FileCheck, Check, X, Shield, AlertCircle } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { apiRequest } from '../services/api';

export default function EmployeeKYC() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/employee/kyc/');
      const list = Array.isArray(data) ? data : (data?.results || []);
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDecision = async (status) => {
    if (!reviewModal) return;
    setSubmitting(true);

    try {
      await apiRequest('/employee/kyc/', {
        method: 'POST',
        body: {
          id: reviewModal.id,
          status: status,
          remarks: remarks
        }
      });
      setReviewModal(null);
      setRemarks('');
      fetchRecords();
    } catch (err) {
      alert(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="KYC Document Verification" subtitle="Review customer identity documentation and update verification status">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Customer ID</th>
              <th>Document Type</th>
              <th>Document Serial Number</th>
              <th>Status</th>
              <th>Submitted Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong style={{ color: 'var(--navy-900)' }}>{r.customer_name}</strong>
                </td>
                <td>
                  <code style={{ color: 'var(--blue-600)' }}>{r.customer_id}</code>
                </td>
                <td>
                  {r.document_type_display || r.document_type}
                </td>
                <td style={{ fontFamily: 'monospace' }}>
                  {r.document_number}
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td>
                  {r.status === 'PENDING' ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setReviewModal(r)}
                    >
                      Review &amp; Verify
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>Decision Logged</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="modal-backdrop" onClick={() => setReviewModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Review KYC: {reviewModal.customer_name}</h3>
              <button onClick={() => setReviewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
            </div>

            <div className="modal-body">
              <div style={{ backgroundColor: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                <div>Document: <strong>{reviewModal.document_type_display || reviewModal.document_type}</strong></div>
                <div>Serial: <strong style={{ fontFamily: 'monospace' }}>{reviewModal.document_number}</strong></div>
                <div>Customer ID: <strong>{reviewModal.customer_id}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Review Notes / Verification Remarks</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="e.g. Identity verified against government database..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-danger"
                onClick={() => handleDecision('REJECTED')}
                disabled={submitting}
              >
                <X size={16} /> Reject Document
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleDecision('APPROVED')}
                disabled={submitting}
              >
                <Check size={16} /> Approve &amp; Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
