import React, { useState, useEffect } from 'react';
import {
  UserCheck, ShieldCheck, CheckCircle2, AlertCircle, Building, User,
  Search, RefreshCw, X, Eye, FileText, Check, AlertTriangle,
  Clock, XCircle, Send, HelpCircle, ShieldAlert, ChevronRight, Lock
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import Footer from '../components/Footer';
import { verificationService } from '../services/verificationService';
import { authService } from '../services/auth';
import { wsService } from '../services/websocket';

export default function EmployeeCustomerVerification() {
  const [applications, setApplications] = useState([]);
  const [kpis, setKpis] = useState({
    total_pending: 0,
    verified_accounts: 0,
    rejected_applications: 0,
    additional_info_required: 0,
    total_applications: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected application for review dossier modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Action dialogs
  const [actionType, setActionType] = useState(null); // 'APPROVE', 'REJECT', 'REQUEST_INFO'
  const [actionNotes, setActionNotes] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const currentUser = authService.getCurrentUser() || {};

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await verificationService.getEmployeeApplications({
        status: statusFilter,
        search: searchQuery
      });
      setApplications(res.applications || []);
      if (res.kpis) {
        setKpis(res.kpis);
      }
    } catch (err) {
      console.error('Failed to load customer applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();

    // Real-time updates via WebSocket
    const unsubAlert = wsService.on('staff_alert', () => {
      fetchApplications();
    });

    return () => {
      unsubAlert();
    };
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications();
  };

  const handleOpenReview = async (appId) => {
    try {
      setReviewLoading(true);
      setActionError(null);
      const detail = await verificationService.getApplicationDetail(appId);
      setSelectedApp(detail);
      // Refresh list to reflect UNDER_REVIEW status if transition occurred
      fetchApplications();
    } catch (err) {
      alert(err.message || 'Failed to open application dossier.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!selectedApp) return;
    setActionSubmitting(true);
    setActionError(null);

    try {
      if (actionType === 'APPROVE') {
        await verificationService.approveApplication(selectedApp.application_id, actionNotes);
        setSuccessToast(`Application ${selectedApp.application_id} verified & activated successfully!`);
      } else if (actionType === 'REJECT') {
        if (!actionReason.trim()) {
          setActionError('Please specify the rejection reason.');
          setActionSubmitting(false);
          return;
        }
        await verificationService.rejectApplication(selectedApp.application_id, actionReason, actionNotes);
        setSuccessToast(`Application ${selectedApp.application_id} has been rejected.`);
      } else if (actionType === 'REQUEST_INFO') {
        if (!actionReason.trim()) {
          setActionError('Please specify the missing information or required documents.');
          setActionSubmitting(false);
          return;
        }
        await verificationService.requestInformation(selectedApp.application_id, actionReason, actionNotes);
        setSuccessToast(`Information request sent for application ${selectedApp.application_id}.`);
      }

      // Close action modal and refresh dossier
      setActionType(null);
      setActionNotes('');
      setActionReason('');

      // Refresh both detailed view and table
      const updated = await verificationService.getApplicationDetail(selectedApp.application_id);
      setSelectedApp(updated);
      fetchApplications();

      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      setActionError(err.message || 'Operation failed. Please verify employee permissions.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.65rem', borderRadius: '9999px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
            fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <CheckCircle2 size={12} /> Verified
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.65rem', borderRadius: '9999px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa',
            fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <Clock size={12} /> Under Review
          </span>
        );
      case 'ADDITIONAL_INFORMATION_REQUIRED':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.65rem', borderRadius: '9999px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24',
            fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <AlertTriangle size={12} /> Info Required
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.65rem', borderRadius: '9999px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171',
            fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.65rem', borderRadius: '9999px',
            backgroundColor: 'rgba(234, 179, 8, 0.12)', color: '#fde047',
            fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(234, 179, 8, 0.25)'
          }}>
            <Clock size={12} /> Pending Verification
          </span>
        );
    }
  };

  return (
    <DashboardLayout
      pageTitle="Customer Account Verification"
      subtitle={`Employee Operations • Branch ID: ${currentUser.branch_info?.code || 'METRO01'} • Verification Authority`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* Success Alert Banner */}
        {successToast && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#34d399'
          }}>
            <CheckCircle2 size={20} />
            <div style={{ flex: 1, fontWeight: 500 }}>{successToast}</div>
            <button
              onClick={() => setSuccessToast(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Total Pending */}
          <div style={{
            backgroundColor: 'var(--navy-900)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                Pending Verification
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--white)' }}>
                {kpis.total_pending}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#f59e0b' }}>
                Requires staff review
              </div>
            </div>
          </div>

          {/* Verified Accounts */}
          <div style={{
            backgroundColor: 'var(--navy-900)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                Verified Accounts
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--white)' }}>
                {kpis.verified_accounts}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#10b981' }}>
                Active & operational
              </div>
            </div>
          </div>

          {/* Additional Info Required */}
          <div style={{
            backgroundColor: 'var(--navy-900)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                Info Required
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--white)' }}>
                {kpis.additional_info_required}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#60a5fa' }}>
                Awaiting customer reply
              </div>
            </div>
          </div>

          {/* Rejected Applications */}
          <div style={{
            backgroundColor: 'var(--navy-900)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <XCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                Rejected Applications
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--white)' }}>
                {kpis.rejected_applications}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#f87171' }}>
                Inactive accounts
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search Control Bar */}
        <div style={{
          backgroundColor: 'var(--navy-900)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 320px' }}>
            <div style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--slate-400)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, ID, application ID, phone..."
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem 0.65rem 2.6rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--white)',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
              Search
            </button>
          </form>

          {/* Status Filter Dropdown & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--slate-400)' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.55rem 1rem',
                  color: 'var(--white)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Applications</option>
                <option value="PENDING">Pending Verification</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="ADDITIONAL_INFORMATION_REQUIRED">Additional Info Required</option>
                <option value="VERIFIED">Verified Accounts</option>
                <option value="REJECTED">Rejected Applications</option>
              </select>
            </div>

            <button
              onClick={fetchApplications}
              className="btn btn-secondary btn-sm"
              title="Refresh queue"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Verification Applications Table */}
        <div style={{
          backgroundColor: 'var(--navy-900)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--white)', margin: 0 }}>
                Verification Queue ({applications.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-400)', margin: '0.2rem 0 0' }}>
                All customer accounts awaiting branch employee review and KYC validation
              </p>
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--slate-400)' }}>
              Branch: <strong>{currentUser.branch_info?.name || 'Metropolis Main'}</strong>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: 'var(--slate-400)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Application ID</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Customer ID</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Customer Name</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Registration Date</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Contact Info (Masked)</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Documents</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>KYC Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Verification Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                      <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                      Loading verification queue from database...
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                      <UserCheck size={36} style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--slate-600)' }} />
                      No customer applications matching current filter.
                    </td>
                  </tr>
                ) : (
                  (Array.isArray(applications) ? applications : []).map((app) => (
                    <tr
                      key={app.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--blue-400)' }}>
                        {app.application_id}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--white)' }}>
                        {app.customer_id}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--white)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            backgroundColor: 'rgba(37, 99, 235, 0.2)', color: 'var(--blue-400)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 700
                          }}>
                            {app.customer_name ? app.customer_name[0] : 'C'}
                          </div>
                          <span>{app.customer_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', color: 'var(--slate-300)', fontSize: '0.825rem' }}>
                        {new Date(app.registration_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: 'var(--slate-300)' }}>
                        <div>{app.masked_email}</div>
                        <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>{app.masked_phone}</div>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', color: 'var(--slate-300)', fontSize: '0.8rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          padding: '0.2rem 0.5rem', borderRadius: '4px'
                        }}>
                          <FileText size={12} color="var(--blue-400)" />
                          {app.submitted_documents_status}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: app.kyc_status === 'VERIFIED' ? '#34d399' : (app.kyc_status === 'REJECTED' ? '#f87171' : '#fde047')
                        }}>
                          {app.kyc_status}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        {renderStatusBadge(app.account_verification_status)}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenReview(app.application_id)}
                          className="btn btn-primary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.8rem'
                          }}
                        >
                          <Eye size={14} /> Review Application
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Application Review Dossier Modal */}
        {selectedApp && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1000,
            overflowY: 'auto'
          }}>
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-xl)',
              width: '100%',
              maxWidth: '920px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
              overflow: 'hidden'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(37, 99, 235, 0.2)', color: 'var(--blue-400)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--white)', margin: 0 }}>
                      Customer Application Dossier
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                      Application Ref: <strong>{selectedApp.application_id}</strong> • Submitted: {new Date(selectedApp.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {renderStatusBadge(selectedApp.status)}
                  <button
                    onClick={() => setSelectedApp(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--slate-400)',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      borderRadius: '4px'
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body (Scrollable) */}
              <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Duplicate Application Warning Alerts */}
                {selectedApp.duplicate_warnings && selectedApp.duplicate_warnings.length > 0 && (
                  <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 700, fontSize: '0.9rem' }}>
                      <ShieldAlert size={18} />
                      Duplicate Application Warning
                    </div>
                    {selectedApp.duplicate_warnings.map((w, idx) => (
                      <div key={idx} style={{ fontSize: '0.825rem', color: '#fca5a5', paddingLeft: '1.65rem' }}>
                        • <strong>{w.field}:</strong> {w.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Section 1: Personal, Contact & Address Information */}
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} color="var(--blue-400)" /> Customer Profile Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.75rem' }}>Full Legal Name</span>
                      <strong style={{ color: 'var(--white)' }}>{selectedApp.customer?.full_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.75rem' }}>Customer ID</span>
                      <strong style={{ color: 'var(--white)' }}>{selectedApp.customer?.customer_id}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.75rem' }}>Assigned Branch</span>
                      <strong style={{ color: 'var(--white)' }}>{selectedApp.customer?.branch_name || selectedApp.branch_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.75rem' }}>Email Address</span>
                      <strong style={{ color: 'var(--white)' }}>{selectedApp.customer?.email}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.75rem' }}>Contact Phone</span>
                      <strong style={{ color: 'var(--white)' }}>{selectedApp.customer?.phone || 'Not Provided'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.75rem' }}>Residential Address</span>
                      <strong style={{ color: 'var(--white)' }}>{selectedApp.customer?.address || 'Not Provided'}</strong>
                    </div>
                  </div>
                </div>

                {/* Section 2: Submitted Verification Documents */}
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} color="var(--blue-400)" /> Submitted Verification Documents ({selectedApp.documents?.length || 0})
                  </h4>

                  {!selectedApp.documents || selectedApp.documents.length === 0 ? (
                    <div style={{ color: 'var(--slate-400)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                      No documents have been uploaded by the customer yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedApp.documents.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.85rem 1rem',
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 'var(--radius-md)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'rgba(37, 99, 235, 0.15)', color: 'var(--blue-400)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <FileText size={16} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--white)' }}>
                                {doc.document_name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                                Type: {doc.document_type} {doc.document_number ? `• Doc #: ${doc.document_number}` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 600,
                              color: doc.status === 'VERIFIED' ? '#34d399' : (doc.status === 'REJECTED' ? '#f87171' : '#fde047')
                            }}>
                              {doc.status}
                            </span>
                            <a
                              href={`/api/v1/employee/customer-verification/${selectedApp.application_id}/documents/${doc.id}/`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                            >
                              View Secure File
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Compliance & Verification Checklist */}
                {selectedApp.missing_or_invalid && (
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} color="var(--blue-400)" /> Compliance & Document Verification Checklist
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedApp.missing_or_invalid.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            backgroundColor: item.is_valid ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                            border: `1px solid ${item.is_valid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.825rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {item.is_valid ? (
                              <CheckCircle2 size={15} color="#10b981" />
                            ) : (
                              <AlertCircle size={15} color="#f59e0b" />
                            )}
                            <span style={{ color: item.is_valid ? 'var(--white)' : '#fbbf24', fontWeight: 500 }}>
                              {item.item}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: item.is_valid ? '#34d399' : '#f59e0b' }}>
                            {item.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: Customer Resubmission (if applicable) */}
                {selectedApp.submitted_information && (
                  <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.5rem' }}>
                      Customer Resubmitted Response
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--slate-200)', lineHeight: 1.5, margin: 0 }}>
                      "{selectedApp.submitted_information}"
                    </p>
                  </div>
                )}

                {/* Section 5: Verification Audit History Timeline */}
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} color="var(--blue-400)" /> Verification Decision History
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {selectedApp.verification_history?.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          padding: '0.75rem 1rem',
                          borderLeft: '3px solid var(--blue-500)',
                          backgroundColor: 'rgba(15, 23, 42, 0.4)',
                          borderRadius: '0 6px 6px 0',
                          fontSize: '0.825rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--white)' }}>
                            {h.action.replace('_', ' ')}: {h.previous_status} → {h.new_status}
                          </span>
                          <span style={{ fontSize: '0.725rem', color: 'var(--slate-400)' }}>
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ color: 'var(--slate-300)', fontSize: '0.8rem' }}>
                          By: <strong>{h.employee_name || 'System / Customer'}</strong>
                        </div>
                        {h.reason && (
                          <div style={{ color: 'var(--slate-400)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            Reason / Instructions: {h.reason}
                          </div>
                        )}
                        {h.internal_notes && (
                          <div style={{ color: 'var(--blue-300)', marginTop: '0.25rem', fontSize: '0.775rem' }}>
                            [Staff Internal Note]: {h.internal_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Actions Footer: 3 Review Actions */}
              <div style={{
                padding: '1.25rem 1.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.875rem' }}
                >
                  Close Dossier
                </button>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {/* Action 1: Request Additional Info */}
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('REQUEST_INFO');
                      setActionReason('');
                      setActionNotes('');
                      setActionError(null);
                    }}
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      padding: '0.65rem 1.15rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <HelpCircle size={16} /> Request Additional Information
                  </button>

                  {/* Action 2: Reject Application */}
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('REJECT');
                      setActionReason('');
                      setActionNotes('');
                      setActionError(null);
                    }}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      padding: '0.65rem 1.15rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <XCircle size={16} /> Reject Application
                  </button>

                  {/* Action 3: Approve and Verify */}
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('APPROVE');
                      setActionNotes('');
                      setActionError(null);
                    }}
                    style={{
                      backgroundColor: 'var(--emerald-500, #10b981)',
                      border: 'none',
                      color: 'var(--white)',
                      padding: '0.65rem 1.35rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <CheckCircle2 size={16} /> Approve and Verify
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Confirmation Modal */}
        {actionType && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1100
          }}>
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: actionType === 'APPROVE' ? 'rgba(16, 185, 129, 0.2)' : (actionType === 'REJECT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'),
                  color: actionType === 'APPROVE' ? '#10b981' : (actionType === 'REJECT' ? '#ef4444' : '#f59e0b'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {actionType === 'APPROVE' ? <CheckCircle2 size={22} /> : (actionType === 'REJECT' ? <XCircle size={22} /> : <HelpCircle size={22} />)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--white)', margin: 0 }}>
                    {actionType === 'APPROVE' && 'Approve & Activate Customer Account'}
                    {actionType === 'REJECT' && 'Reject Customer Application'}
                    {actionType === 'REQUEST_INFO' && 'Request Additional Information'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                    Application: {selectedApp?.application_id} • Customer: {selectedApp?.customer?.full_name}
                  </div>
                </div>
              </div>

              {actionError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#f87171',
                  fontSize: '0.825rem'
                }}>
                  {actionError}
                </div>
              )}

              {actionType === 'APPROVE' && (
                <div style={{ fontSize: '0.875rem', color: 'var(--slate-300)', lineHeight: 1.5 }}>
                  <p>
                    You are confirming that this customer meets the configured banking KYC requirements.
                    Approving will:
                  </p>
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', color: '#34d399', fontSize: '0.825rem' }}>
                    <li>Update verification status to <strong>VERIFIED</strong>.</li>
                    <li>Activate customer accounts for full transactions.</li>
                    <li>Notify customer via WebSocket alert and in-app notice.</li>
                    <li>Record your staff ID in the branch verification audit trail.</li>
                  </ul>
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--slate-400)', marginBottom: '0.4rem' }}>
                      Optional Staff Approval Notes:
                    </label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="e.g. Identity verified against government database. Address matched utility bill."
                      rows={2}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--white)',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {actionType === 'REJECT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate-300)', margin: 0 }}>
                    Please specify the rejection reason. This reason will be communicated to the customer along with instructions.
                  </p>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#f87171', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Rejection Reason (Mandatory):
                    </label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="e.g. Expired identification documents provided; residential address does not match submitted proof."
                      rows={3}
                      required
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--white)',
                        padding: '0.65rem 0.75rem',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {actionType === 'REQUEST_INFO' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate-300)', margin: 0 }}>
                    Specify the missing documents or information the customer must provide. The customer will be able to upload documents or respond through their Customer Dashboard.
                  </p>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Requested Information / Missing Documents (Mandatory):
                    </label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="e.g. Please upload a clear photo of your passport bio page and a utility bill dated within the last 90 days."
                      rows={3}
                      required
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--white)',
                        padding: '0.65rem 0.75rem',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  disabled={actionSubmitting}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  disabled={actionSubmitting}
                  style={{
                    backgroundColor: actionType === 'APPROVE' ? '#10b981' : (actionType === 'REJECT' ? '#ef4444' : '#f59e0b'),
                    border: 'none',
                    color: 'var(--white)',
                    padding: '0.55rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: actionSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionSubmitting ? 'Processing Decision...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <Footer />
    </DashboardLayout>
  );
}
