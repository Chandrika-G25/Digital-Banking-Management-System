import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Send, Zap, DollarSign,
  Download, PlusCircle, TrendingUp, TrendingDown, RefreshCw, Eye, EyeOff,
  Clock, ShieldAlert, CheckCircle2, XCircle, UploadCloud, FileText, AlertTriangle, Lock
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatCard from '../components/StatCard';
import TransactionTable from '../components/TransactionTable';
import ReceiptModal from '../components/ReceiptModal';
import { apiRequest } from '../services/api';
import { authService } from '../services/auth';
import { wsService } from '../services/websocket';
import { verificationService } from '../services/verificationService';

export default function CustomerDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [maskNumbers, setMaskNumbers] = useState(true);
  const [verification, setVerification] = useState(null);
  const [loadingVerification, setLoadingVerification] = useState(true);
  
  // Resubmission state for additional information
  const [resubmitInfo, setResubmitInfo] = useState('');
  const [resubmitDocType, setResubmitDocType] = useState('PROOF_OF_ADDRESS');
  const [resubmitDocName, setResubmitDocName] = useState('');
  const [resubmitFile, setResubmitFile] = useState(null);
  const [submittingInfo, setSubmittingInfo] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const user = authService.getCurrentUser() || {};

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/customer/dashboard-summary/');
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      setLoadingVerification(true);
      const data = await verificationService.getStatus();
      setVerification(data);
    } catch (err) {
      console.error('Failed to load verification status:', err);
    } finally {
      setLoadingVerification(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchVerificationStatus();

    // Listen for live balance and verification updates via WebSocket!
    const unsubBalance = wsService.on('BALANCE_UPDATED', () => {
      fetchSummary();
    });

    const unsubTxn = wsService.on('TRANSACTION_EVENT', () => {
      fetchSummary();
    });

    const unsubVerify1 = wsService.on('verification_status_update', () => {
      fetchVerificationStatus();
      fetchSummary();
    });

    const unsubVerify2 = wsService.on('VERIFICATION_STATUS_CHANGED', () => {
      fetchVerificationStatus();
      fetchSummary();
    });

    return () => {
      unsubBalance();
      unsubTxn();
      unsubVerify1();
      unsubVerify2();
    };
  }, []);

  const handleDownloadStatement = async () => {
    try {
      const blob = await apiRequest('/customer/statements/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SecureBank_Statement_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert('Failed to generate statement.');
    }
  };

  const handleAdditionalInfoSubmit = async (e) => {
    e.preventDefault();
    if (!resubmitInfo.trim()) {
      setSubmitFeedback({ type: 'error', text: 'Please enter a description or explanation.' });
      return;
    }
    try {
      setSubmittingInfo(true);
      setSubmitFeedback(null);
      const formData = new FormData();
      formData.append('information_response', resubmitInfo);
      if (resubmitFile) {
        formData.append('document_file', resubmitFile);
        formData.append('document_type', resubmitDocType);
        formData.append('document_name', resubmitDocName || resubmitFile.name);
      }
      await verificationService.submitAdditionalInfo(formData);
      setSubmitFeedback({
        type: 'success',
        text: 'Additional documents submitted successfully! Bank staff will review your updates.'
      });
      setResubmitInfo('');
      setResubmitFile(null);
      setResubmitDocName('');
      setShowUploadForm(false);
      await fetchVerificationStatus();
    } catch (err) {
      setSubmitFeedback({
        type: 'error',
        text: err?.message || 'Failed to submit additional information. Please check the files and try again.'
      });
    } finally {
      setSubmittingInfo(false);
    }
  };

  const handleDocumentUploadOnly = async (e) => {
    e.preventDefault();
    if (!resubmitFile) {
      setSubmitFeedback({ type: 'error', text: 'Please select a document file to upload.' });
      return;
    }
    try {
      setSubmittingInfo(true);
      setSubmitFeedback(null);
      const formData = new FormData();
      formData.append('file', resubmitFile);
      formData.append('document_type', resubmitDocType);
      formData.append('document_name', resubmitDocName || resubmitFile.name);
      await verificationService.uploadDocument(formData);
      setSubmitFeedback({
        type: 'success',
        text: 'Document uploaded successfully! It is now attached to your pending verification dossier.'
      });
      setResubmitFile(null);
      setResubmitDocName('');
      setShowUploadForm(false);
      await fetchVerificationStatus();
    } catch (err) {
      setSubmitFeedback({
        type: 'error',
        text: err?.message || 'Failed to upload document.'
      });
    } finally {
      setSubmittingInfo(false);
    }
  };

  if (loading && !summary) {
    return (
      <DashboardLayout pageTitle="Customer Dashboard">
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--slate-500)' }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
          Loading your financial overview...
        </div>
      </DashboardLayout>
    );
  }

  const accounts = summary?.accounts || [];
  const savings = summary?.savings_account;
  const current = summary?.current_account;
  const financial = summary?.financial_summary || { total_income: '0.00', total_expenses: '0.00' };
  const userAccNumbers = accounts.map((a) => a.account_number);

  const incomeVal = parseFloat(financial.total_income || 0);
  const expenseVal = parseFloat(financial.total_expenses || 0);
  const totalFlow = incomeVal + expenseVal || 1;
  const incomePct = Math.round((incomeVal / totalFlow) * 100);
  const expensePct = 100 - incomePct;

  const isVerified = verification?.status === 'VERIFIED';
  const isPending = verification?.status === 'PENDING' || verification?.status === 'UNDER_REVIEW';
  const isActionRequired = verification?.status === 'ADDITIONAL_INFORMATION_REQUIRED';
  const isRejected = verification?.status === 'REJECTED';

  return (
    <DashboardLayout
      pageTitle={`Welcome, ${user.first_name || user.username}!`}
      subtitle={`Customer ID: ${user.customer_id || 'CUST1001'} • ${new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
    >
      {/* Quick Action Top Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {isVerified ? (
            <Link to="/customer/transfers" className="btn btn-primary btn-sm">
              <Send size={15} /> Transfer Money
            </Link>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              disabled
              title="Transfers unlocked after account verification"
              style={{ opacity: 0.65, cursor: 'not-allowed' }}
            >
              <Lock size={14} style={{ marginRight: '4px' }} /> Transfer Money
            </button>
          )}

          {isVerified ? (
            <Link to="/customer/bills" className="btn btn-secondary btn-sm">
              <Zap size={15} /> Pay Utility Bill
            </Link>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              disabled
              title="Bill payments unlocked after account verification"
              style={{ opacity: 0.65, cursor: 'not-allowed' }}
            >
              <Lock size={14} style={{ marginRight: '4px' }} /> Pay Utility Bill
            </button>
          )}

          {isVerified ? (
            <Link to="/customer/loans" className="btn btn-secondary btn-sm">
              <DollarSign size={15} /> Request Loan
            </Link>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              disabled
              title="Loan requests unlocked after account verification"
              style={{ opacity: 0.65, cursor: 'not-allowed' }}
            >
              <Lock size={14} style={{ marginRight: '4px' }} /> Request Loan
            </button>
          )}

          <button onClick={handleDownloadStatement} className="btn btn-secondary btn-sm">
            <Download size={15} /> Download CSV Statement
          </button>
        </div>

        <button
          onClick={() => setMaskNumbers(!maskNumbers)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--slate-500)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          {maskNumbers ? <Eye size={15} /> : <EyeOff size={15} />}
          {maskNumbers ? 'Show Full Numbers' : 'Mask Account Numbers'}
        </button>
      </div>

      {/* Prominent Verification Status Section */}
      {verification && (
        <div
          className="card"
          style={{
            marginTop: '1.25rem',
            marginBottom: '0.5rem',
            border: isVerified
              ? '1px solid #10b981'
              : isActionRequired
              ? '1px solid #f59e0b'
              : isRejected
              ? '1px solid #ef4444'
              : '1px solid var(--blue-400)',
            background: isVerified
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.08))'
              : isActionRequired
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(217, 119, 6, 0.1))'
              : isRejected
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 38, 0.08))'
              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.09))',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isVerified ? '#d1fae5' : isActionRequired ? '#fef3c7' : isRejected ? '#fee2e2' : '#dbeafe',
                  color: isVerified ? '#059669' : isActionRequired ? '#d97706' : isRejected ? '#dc2626' : '#2563eb'
                }}
              >
                {isVerified ? <CheckCircle2 size={24} /> : isActionRequired ? <AlertTriangle size={24} /> : isRejected ? <XCircle size={24} /> : <Clock size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                  My Verification Status
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                  Application Ref: <strong style={{ fontFamily: 'monospace' }}>{verification.application_id || 'PENDING'}</strong> &bull; Assigned Branch: {verification.branch_name || 'Metropolis Main'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`badge ${isVerified ? 'badge-success' : isActionRequired ? 'badge-warning' : isRejected ? 'badge-danger' : 'badge-info'}`}>
                Account: {verification.status?.replace(/_/g, ' ') || 'PENDING'}
              </span>
              <span className={`badge ${verification.kyc_status === 'VERIFIED' ? 'badge-success' : verification.kyc_status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                KYC: {verification.kyc_status || 'PENDING'}
              </span>
              <span className={`badge ${verification.account_status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                Account Status: {verification.account_status || 'PENDING_VERIFICATION'}
              </span>
            </div>
          </div>

          {/* Standard Required Status Notice */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid rgba(0,0,0,0.06)',
              marginBottom: '1rem'
            }}
          >
            {isPending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: '#1e40af' }}>
                <Clock size={22} className="animate-spin" style={{ animationDuration: '6s', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.98rem' }}>
                    Your account is awaiting verification by our bank staff. You will be notified once the verification process is complete.
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                    Our branch staff reviews submitted documents to comply with banking regulations. Until verified, outgoing transfers and loans are restricted.
                  </p>
                </div>
              </div>
            )}

            {isActionRequired && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>
                  <AlertTriangle size={20} /> Action Required: Additional Information Requested
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem 1rem', margin: '0.5rem 0' }}>
                  <strong style={{ color: '#92400e', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bank Specialist Note:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#78350f', fontSize: '0.92rem' }}>
                    {verification.requested_information || 'Please provide updated identification or address verification documents.'}
                  </p>
                </div>
              </div>
            )}

            {isVerified && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: '#065f46' }}>
                <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.98rem' }}>
                    Your account is fully verified and active.
                  </p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                    All digital banking features including instant fund transfers, bill pay, and loans are unlocked.
                  </p>
                </div>
              </div>
            )}

            {isRejected && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', color: '#991b1b' }}>
                <XCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.98rem' }}>
                    Application Verification Rejected
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem' }}>
                    <strong>Reason:</strong> {verification.rejection_reason || 'Verification criteria could not be satisfied. Please consult your branch manager.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Verification Feedback Banner */}
          {submitFeedback && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: submitFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: submitFeedback.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${submitFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`
              }}
            >
              {submitFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {submitFeedback.text}
            </div>
          )}

          {/* Documents Dossier & Upload Section */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)' }}>
              <span>Submitted Documents: <strong>{verification.documents?.length || 0}</strong> file(s) attached</span>
              {verification.documents && verification.documents.length > 0 && (
                <span style={{ marginLeft: '0.75rem' }}>
                  ({verification.documents.map(d => d.document_name || d.document_type).join(', ')})
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(isActionRequired || isPending) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  style={{ fontSize: '0.8rem' }}
                >
                  <UploadCloud size={14} style={{ marginRight: '4px' }} />
                  {showUploadForm ? 'Hide Document Upload' : isActionRequired ? 'Submit Requested Documents' : 'Upload Additional Document'}
                </button>
              )}
            </div>
          </div>

          {/* Interactive Document Submission Form */}
          {showUploadForm && (
            <form
              onSubmit={isActionRequired ? handleAdditionalInfoSubmit : handleDocumentUploadOnly}
              style={{
                marginTop: '1rem',
                padding: '1.25rem',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid var(--slate-200)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                {isActionRequired ? 'Submit Requested Information & Supporting Documents' : 'Upload Supporting KYC Document'}
              </h4>

              {isActionRequired && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
                    Response / Clarification *
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Enter your response explaining the requested details..."
                    value={resubmitInfo}
                    onChange={(e) => setResubmitInfo(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '0.88rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
                    Document Type
                  </label>
                  <select
                    className="form-control"
                    value={resubmitDocType}
                    onChange={(e) => setResubmitDocType(e.target.value)}
                    style={{ width: '100%', fontSize: '0.88rem' }}
                  >
                    <option value="PROOF_OF_ADDRESS">Proof of Address (Utility Bill, Bank Statement)</option>
                    <option value="GOVERNMENT_ID">Government Photo ID (Passport, Driving License)</option>
                    <option value="PROOF_OF_INCOME">Proof of Income (Paystub, Tax Return)</option>
                    <option value="OTHER">Other Compliance Document</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
                    Document Name / Description
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Electric Bill Sept 2026"
                    value={resubmitDocName}
                    onChange={(e) => setResubmitDocName(e.target.value)}
                    style={{ width: '100%', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
                  Select File (PDF, PNG, JPG) {isActionRequired ? '(Optional if answering text only)' : '*'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="form-control"
                  onChange={(e) => setResubmitFile(e.target.files[0] || null)}
                  required={!isActionRequired}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowUploadForm(false)}
                  disabled={submittingInfo}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submittingInfo}
                >
                  {submittingInfo ? 'Submitting...' : isActionRequired ? 'Submit Response' : 'Upload Document'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Account Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Total Available Net Balance */}
        <div
          className="card card-navy"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--blue-300)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Total Net Liquidity
              </span>
              <Wallet size={22} color="var(--blue-400)" />
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--white)', letterSpacing: '-0.02em' }}>
              ${summary?.total_balance || '0.00'}
              <span style={{ fontSize: '1rem', color: 'var(--blue-300)', fontWeight: 500, marginLeft: '0.4rem' }}>USD</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--slate-300)' }}>
            <span>Active Accounts: <strong>{accounts.length}</strong></span>
            <span>Status: <strong style={{ color: isVerified ? 'var(--emerald-400)' : isActionRequired ? '#f59e0b' : isRejected ? '#ef4444' : '#60a5fa' }}>{isVerified ? 'Active • Verified' : isActionRequired ? 'Action Required' : isRejected ? 'Rejected' : 'Pending Verification'}</strong></span>
          </div>
        </div>

        {/* Primary Savings Account */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 'var(--radius-xl)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                Primary Savings Account
              </span>
              <span className={`badge ${savings?.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                {savings?.status?.replace(/_/g, ' ') || 'Pending Verification'}
              </span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy-950)' }}>
              ${savings ? savings.balance : '0.00'}
            </div>
            <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--slate-500)', marginTop: '0.35rem' }}>
              {savings ? (maskNumbers ? savings.masked_account_number : savings.account_number) : 'No account'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-100)', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--emerald-600)', fontWeight: 600 }}>Earns 4.25% APY Interest</span>
            {isVerified ? (
              <Link to="/customer/transfers" style={{ fontWeight: 600, color: 'var(--blue-600)' }}>Transfer &rarr;</Link>
            ) : (
              <span style={{ color: 'var(--slate-400)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Lock size={12} /> Awaiting Verification
              </span>
            )}
          </div>
        </div>

        {/* Current Checking Account */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 'var(--radius-xl)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                Current Checking Account
              </span>
              <span className="badge badge-info">Checking</span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy-950)' }}>
              ${current ? current.balance : '0.00'}
            </div>
            <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--slate-500)', marginTop: '0.35rem' }}>
              {current ? (maskNumbers ? current.masked_account_number : current.account_number) : 'No account'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-100)', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--slate-500)' }}>Zero Maintenance Fee</span>
            <Link to="/customer/bills" style={{ fontWeight: 600, color: 'var(--blue-600)' }}>Pay Bill &rarr;</Link>
          </div>
        </div>
      </div>

      {/* Income vs Expenses Visual Breakdown & Quick Stat Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Income vs Expenses Visual Gauge Card */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Income vs Expenses Flow</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>30-Day Activity</span>
          </div>

          {/* Progress bar visual */}
          <div style={{ height: '14px', width: '100%', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--slate-100)', display: 'flex', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ width: `${incomePct}%`, backgroundColor: 'var(--emerald-500)', transition: 'width 0.5s ease' }} title={`Income: ${incomePct}%`} />
            <div style={{ width: `${expensePct}%`, backgroundColor: 'var(--slate-800)', transition: 'width 0.5s ease' }} title={`Expenses: ${expensePct}%`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Total Deposits</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--emerald-600)' }}>
                  +${financial.total_income}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--slate-100)', color: 'var(--slate-800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Total Outflow</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  -${financial.total_expenses}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Beneficiaries & Transfer Shortcut */}
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Quick Transfer Hub</h3>
              <Link to="/customer/beneficiaries" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--blue-600)' }}>
                Manage All
              </Link>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Fast-track instant money transfers to verified recipients using double-entry ledger settlement.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/customer/transfers" className="btn btn-primary" style={{ flex: 1 }}>
              <Send size={16} /> Send Money Now
            </Link>
            <Link to="/customer/beneficiaries" className="btn btn-secondary">
              <PlusCircle size={16} /> Add Contact
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--navy-950)' }}>Recent Transactions</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Live ledger entries recorded from database</p>
          </div>
          <Link to="/customer/transactions" className="btn btn-secondary btn-sm">
            View All Transactions &rarr;
          </Link>
        </div>

        <TransactionTable
          transactions={summary?.recent_transactions || []}
          userAccountNumbers={userAccNumbers}
          onViewReceipt={(txn) => setSelectedTxn(txn)}
        />
      </div>

      {/* Receipt Modal */}
      {selectedTxn && (
        <ReceiptModal
          transaction={selectedTxn}
          onClose={() => setSelectedTxn(null)}
        />
      )}
    </DashboardLayout>
  );
}
