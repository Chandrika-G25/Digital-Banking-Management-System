import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, Clock, AlertTriangle, XCircle, CheckCircle2,
  FileText, UploadCloud, RefreshCw, ArrowRight, Building, User, Info,
  Copy, Check, FileCheck, Phone, Mail, HelpCircle
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { verificationService } from '../services/verificationService';
import { authService } from '../services/auth';
import { wsService } from '../services/websocket';

export default function CustomerVerificationStatus() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Additional info form state
  const [infoResponse, setInfoResponse] = useState('');
  const [docType, setDocType] = useState('PROOF_OF_ADDRESS');
  const [docFile, setDocFile] = useState(null);
  const [submittingInfo, setSubmittingInfo] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const currentUser = authService.getCurrentUser() || {};

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const statusData = await verificationService.getStatus();
      setData(statusData);
    } catch (err) {
      console.error('Failed to load customer verification status:', err);
      setError(err?.message || 'Failed to load verification status. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();

    // Listen for live websocket updates
    const unsub1 = wsService.on('verification_status_update', () => {
      loadStatus();
    });
    const unsub2 = wsService.on('VERIFICATION_STATUS_CHANGED', () => {
      loadStatus();
    });
    const unsub3 = wsService.on('CUSTOMER_VERIFIED', () => {
      loadStatus();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const handleCopyCustomerId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleAdditionalInfoSubmit = async (e) => {
    e.preventDefault();
    if (!infoResponse.trim() && !docFile) {
      setActionFeedback({ type: 'error', text: 'Please provide either a written response or an updated document.' });
      return;
    }

    try {
      setSubmittingInfo(true);
      setActionFeedback(null);
      const formData = new FormData();
      formData.append('information_response', infoResponse || 'Document attached by applicant.');
      if (docFile) {
        formData.append('document_file', docFile);
        formData.append('document_type', docType);
        formData.append('document_name', docFile.name);
      }

      await verificationService.submitAdditionalInfo(formData);
      setActionFeedback({
        type: 'success',
        text: 'Additional information and documents submitted successfully. Our branch staff will resume review shortly.'
      });
      setInfoResponse('');
      setDocFile(null);
      setShowUploadModal(false);
      await loadStatus();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err?.message || 'Failed to submit additional information. Please check file format and try again.'
      });
    } finally {
      setSubmittingInfo(false);
    }
  };

  const status = data?.status || 'PENDING';
  const isVerified = status === 'VERIFIED';
  const isPending = status === 'PENDING' || status === 'UNDER_REVIEW';
  const isActionRequired = status === 'ADDITIONAL_INFORMATION_REQUIRED';
  const isRejected = status === 'REJECTED';

  const getStatusBadge = () => {
    if (isVerified) {
      return (
        <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
          <CheckCircle2 size={16} /> Verified &amp; Active
        </span>
      );
    }
    if (isActionRequired) {
      return (
        <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
          <AlertTriangle size={16} /> Action Required
        </span>
      );
    }
    if (isRejected) {
      return (
        <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
          <XCircle size={16} /> Application Rejected
        </span>
      );
    }
    return (
      <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
        <Clock size={16} /> Verification Pending
      </span>
    );
  };

  return (
    <DashboardLayout
      pageTitle="Account Verification Status"
      subtitle="Track your SecureBank application and KYC compliance status in real time"
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* Top Header Card */}
        <div
          className="card"
          style={{
            padding: '1.75rem 2rem',
            borderRadius: 'var(--radius-xl)',
            background: isVerified
              ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
              : 'linear-gradient(135deg, var(--navy-950) 0%, var(--navy-900) 100%)',
            color: 'var(--white)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'var(--shadow-xl)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--blue-300)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Application Reference
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--white)', fontSize: '0.95rem' }}>
                  {data?.application_id || 'PENDING'}
                </span>
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--white)', margin: 0 }}>
                {data?.customer_name || currentUser.first_name || 'SecureBank Applicant'}
              </h1>
              <p style={{ color: 'var(--slate-300)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
                Assigned Branch: <strong>{data?.branch_name || 'Metro Main Branch'}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
              <div>{getStatusBadge()}</div>

              {/* Customer ID Copyable Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-300)', textTransform: 'uppercase' }}>
                  Customer ID:
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', color: 'var(--white)' }}>
                  {data?.customer_id || currentUser.customer_id || 'Generating...'}
                </span>
                <button
                  onClick={() => handleCopyCustomerId(data?.customer_id || currentUser.customer_id)}
                  title="Copy Customer ID"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copiedId ? 'var(--emerald-400)' : 'var(--blue-300)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem'
                  }}
                >
                  {copiedId ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Status Banner */}
        {isVerified && (
          <div
            style={{
              backgroundColor: 'var(--emerald-50)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}
          >
            <CheckCircle2 size={28} color="var(--emerald-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--emerald-800)', margin: '0 0 0.4rem 0' }}>
                Application Approved &amp; Account Verified!
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--emerald-700)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                Congratulations! Our bank staff has completed the verification of your application and KYC identity credentials. Your bank account is now fully active, unlocking instant fund transfers, bill payments, and online statements.
              </p>
              <Link to="/customer/dashboard" className="btn btn-primary btn-sm">
                Go to Banking Dashboard <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {isPending && (
          <div
            style={{
              backgroundColor: 'var(--amber-50)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}
          >
            <Clock size={28} color="var(--amber-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--amber-800)', margin: '0 0 0.4rem 0' }}>
                Application Awaiting Staff Verification
              </h3>
              <p style={{ fontSize: '0.925rem', color: 'var(--amber-700)', margin: '0 0 0.75rem 0', lineHeight: 1.6 }}>
                "Your account is awaiting verification by our bank staff. You will be notified once the verification process is complete."
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', margin: 0, lineHeight: 1.5 }}>
                Your Customer ID is <strong>{data?.customer_id || currentUser.customer_id}</strong>. You can use your Customer ID and password to log in and track your application status at any time. Financial operations (such as outgoing fund transfers and bill payments) remain restricted until verification is complete.
              </p>
            </div>
          </div>
        )}

        {isActionRequired && (
          <div
            style={{
              backgroundColor: 'var(--blue-50)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}
          >
            <AlertTriangle size={28} color="var(--blue-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--blue-900)', margin: '0 0 0.4rem 0' }}>
                Action Required: Additional Information Requested
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--blue-800)', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
                Our bank verification officer reviewed your application and requested additional information or an updated document before approving your account.
              </p>
              {data?.requested_information && (
                <div
                  style={{
                    backgroundColor: 'var(--white)',
                    border: '1px solid var(--blue-200)',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    color: 'var(--navy-900)'
                  }}
                >
                  <strong>Officer Note:</strong> {data.requested_information}
                </div>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn btn-primary btn-sm"
              >
                <UploadCloud size={16} /> Submit Requested Information &amp; Documents
              </button>
            </div>
          </div>
        )}

        {isRejected && (
          <div
            style={{
              backgroundColor: 'var(--rose-50)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}
          >
            <XCircle size={28} color="var(--rose-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--rose-800)', margin: '0 0 0.4rem 0' }}>
                Application Could Not Be Approved
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--rose-700)', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
                We regret to inform you that your account opening application was not approved during our verification review.
              </p>
              {data?.rejection_reason && (
                <div
                  style={{
                    backgroundColor: 'var(--white)',
                    border: '1px solid var(--rose-200)',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    color: 'var(--rose-900)'
                  }}
                >
                  <strong>Reason Stated:</strong> {data.rejection_reason}
                </div>
              )}
              <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                <strong>Next Permitted Steps:</strong>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
                  <li>You may visit your assigned branch (<strong>{data?.branch_name || 'Main Branch'}</strong>) with original identity and residential documents to request an in-person review.</li>
                  <li>Alternatively, you can open a new online application with corrected documentation.</li>
                  <li>Contact customer service at 1-800-SECURE-BANK for additional guidance.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            style={{
              backgroundColor: actionFeedback.type === 'success' ? 'var(--emerald-50)' : 'var(--rose-50)',
              border: `1px solid ${actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              color: actionFeedback.type === 'success' ? 'var(--emerald-700)' : 'var(--rose-700)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem'
            }}
          >
            {actionFeedback.text}
          </div>
        )}

        {/* Application Status Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          {/* Card 1: Key Status Indicators */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: '1.25rem' }}>
              Verification Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.65rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Account Verification:</span>
                <span style={{ fontWeight: 700, color: isVerified ? 'var(--emerald-600)' : 'var(--amber-600)' }}>
                  {data?.status || 'PENDING'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.65rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>KYC Verification:</span>
                <span style={{ fontWeight: 700, color: data?.kyc_status === 'VERIFIED' ? 'var(--emerald-600)' : 'var(--amber-600)' }}>
                  {data?.kyc_status || 'PENDING'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.65rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Banking Account Status:</span>
                <span style={{ fontWeight: 700, color: data?.account_status === 'ACTIVE' ? 'var(--emerald-600)' : 'var(--amber-600)' }}>
                  {data?.account_status || 'PENDING_VERIFICATION'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--slate-500)' }}>Submission Date:</span>
                <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                  {data?.created_at ? new Date(data.created_at).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Next Steps & Timeline */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: '1.25rem' }}>
              Verification Process Workflow
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>
                  <Check size={14} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>1. Online Application Submitted</div>
                  <div style={{ color: 'var(--slate-500)', fontSize: '0.775rem' }}>Personal details and credentials generated.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: isVerified ? 'var(--emerald-50)' : 'var(--amber-50)', color: isVerified ? 'var(--emerald-600)' : 'var(--amber-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>
                  {isVerified ? <Check size={14} /> : '2'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>2. Bank Staff Review</div>
                  <div style={{ color: 'var(--slate-500)', fontSize: '0.775rem' }}>
                    {isVerified ? 'Completed by banking specialist.' : 'Branch officer verifies ID and address documents.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: isVerified ? 'var(--emerald-50)' : 'var(--slate-100)', color: isVerified ? 'var(--emerald-600)' : 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>
                  {isVerified ? <Check size={14} /> : '3'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>3. Full Account Activation</div>
                  <div style={{ color: 'var(--slate-500)', fontSize: '0.775rem' }}>
                    {isVerified ? 'Active! All banking features unlocked.' : 'Transfers and payments unlock after approval.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Uploaded Documents Dossier */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                Submitted Verification Documents
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                Identity proofs and address records stored securely in compliance with banking regulations.
              </p>
            </div>
            {!isVerified && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn btn-secondary btn-sm"
              >
                <UploadCloud size={15} /> Upload Additional Document
              </button>
            )}
          </div>

          {data?.documents && data.documents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.documents.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.15rem',
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-200)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--blue-50)',
                        color: 'var(--blue-600)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy-950)' }}>
                        {doc.document_name || doc.document_type.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                        Type: {doc.document_type} &bull; Uploaded {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'During registration'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`badge ${doc.status === 'VERIFIED' ? 'badge-success' : doc.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {doc.status || 'PENDING'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
              <FileCheck size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              No documents attached yet.
            </div>
          )}
        </div>

        {/* Verification History Log */}
        {data?.history && data.history.length > 0 && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: '1.25rem' }}>
              Application History &amp; Audit Log
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.history.map((record, idx) => (
                <div
                  key={record.id || idx}
                  style={{
                    padding: '0.85rem 1rem',
                    borderLeft: `3px solid ${record.new_status === 'VERIFIED' ? 'var(--emerald-500)' : record.new_status === 'REJECTED' ? 'var(--rose-500)' : 'var(--blue-500)'}`,
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                      {record.action?.replace(/_/g, ' ') || 'Status Updated'} &bull; Status: {record.new_status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      {record.created_at ? new Date(record.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  {record.reason && (
                    <div style={{ color: 'var(--slate-600)', marginTop: '0.35rem', fontSize: '0.8rem' }}>
                      {record.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refresh & Support Footer */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
          <button
            onClick={loadStatus}
            className="btn btn-secondary btn-sm"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Status
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--slate-500)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Phone size={14} /> Branch Helpline: 1-800-SECURE-BANK
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={14} /> support@securebank.com
            </span>
          </div>
        </div>

      </div>

      {/* Upload Additional Information Modal */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: '0.5rem' }}>
              Submit Additional Information
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '1.5rem' }}>
              Upload any requested documents or provide written clarifications to assist our staff in approving your application.
            </p>

            <form onSubmit={handleAdditionalInfoSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="info-response">Applicant Note / Explanation</label>
                <textarea
                  id="info-response"
                  className="form-control"
                  rows={3}
                  placeholder="e.g. Attached my utility bill for address confirmation as requested."
                  value={infoResponse}
                  onChange={(e) => setInfoResponse(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="doc-type-select">Document Category</label>
                <select
                  id="doc-type-select"
                  className="form-control"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="PROOF_OF_ADDRESS">Proof of Address (Utility Bill, Bank Statement)</option>
                  <option value="IDENTITY_PROOF">Proof of Identity (Passport, Driver License, National ID)</option>
                  <option value="INCOME_PROOF">Proof of Income / Employment Letter</option>
                  <option value="OTHER">Other Clarification Document</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="doc-file-input">Select Document File</label>
                <input
                  id="doc-file-input"
                  type="file"
                  className="form-control"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setDocFile(e.target.files[0] || null)}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.25rem' }}>
                  Supported formats: PDF, JPG, PNG (Max 5MB)
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submittingInfo}
                >
                  {submittingInfo ? 'Submitting...' : 'Upload & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
