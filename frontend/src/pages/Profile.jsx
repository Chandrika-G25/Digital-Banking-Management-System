import React, { useState, useEffect } from 'react';
import { User, Shield, Lock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { apiRequest } from '../services/api';
import { authService } from '../services/auth';

export default function Profile() {
  const [user, setUser] = useState(authService.getCurrentUser() || {});
  const [profileData, setProfileData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
    address: ''
  });

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // KYC fields
  const [kycRecords, setKycRecords] = useState([]);
  const [docType, setDocType] = useState('PASSPORT');
  const [docNum, setDocNum] = useState('');

  // Messages
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [kycMsg, setKycMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const me = await apiRequest('/auth/me/');
        if (me.user) {
          setUser(me.user);
          setProfileData({
            first_name: me.user.first_name || '',
            last_name: me.user.last_name || '',
            phone: me.user.phone || '',
            address: ''
          });
        }
        const kyc = await apiRequest('/customer/kyc/');
        setKycRecords(kyc);
      } catch {
        // Ignore
      }
    }
    loadData();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      const res = await apiRequest('/auth/me/', {
        method: 'PUT',
        body: profileData
      });
      setUser(res.user);
      authService.setCurrentUser(res.user);
      setProfileMsg('Personal details updated successfully!');
    } catch {
      alert('Failed to update profile.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    try {
      await authService.changePassword(oldPassword, newPassword);
      setPwMsg('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    }
  };

  const handleSubmitKYC = async (e) => {
    e.preventDefault();
    setKycMsg('');
    try {
      const record = await apiRequest('/customer/kyc/', {
        method: 'POST',
        body: {
          document_type: docType,
          document_number: docNum
        }
      });
      setKycRecords([record, ...kycRecords]);
      setDocNum('');
      setKycMsg('Identity document submitted for review!');
    } catch {
      alert('Failed to submit document.');
    }
  };

  return (
    <DashboardLayout pageTitle="Profile &amp; Security" subtitle="Manage credentials, residential address, and KYC verification">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Profile Card */}
        <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--navy-950)' }}>
            Personal Identification
          </h3>

          {profileMsg && (
            <div style={{ backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {profileMsg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mailing Address</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Residential street, apartment, city..."
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Save Profile Updates
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--navy-950)' }}>
            Security &amp; Password
          </h3>

          {pwMsg && (
            <div style={{ backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {pwMsg}
            </div>
          )}
          {pwError && (
            <div style={{ backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {pwError}
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-control"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password (Min 8 Characters)</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
              Update Security Password
            </button>
          </form>
        </div>

        {/* KYC Verification Card */}
        <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--navy-950)' }}>
            KYC Identification Documents
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '1.5rem' }}>
            Submit valid government-issued identification to unlock high-limit transactions.
          </p>

          {kycMsg && (
            <div style={{ backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              {kycMsg}
            </div>
          )}

          <form onSubmit={handleSubmitKYC} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Document Type</label>
              <select
                className="form-control"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="PASSPORT">Passport</option>
                <option value="NATIONAL_ID">National Identity Card</option>
                <option value="DRIVING_LICENSE">Driver's License</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Document Serial / Identification Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. US-PASS-98271034"
                value={docNum}
                onChange={(e) => setDocNum(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Submit Document for Review
            </button>
          </form>

          {/* Existing KYC Records */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {kycRecords.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-200)',
                  backgroundColor: 'var(--slate-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                    {r.document_type_display || r.document_type}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontFamily: 'monospace' }}>
                    {r.document_number} &bull; Submitted {new Date(r.created_at).toLocaleDateString()}
                  </div>
                  {r.remarks && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', marginTop: '0.25rem' }}>
                      Staff Remark: {r.remarks}
                    </div>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
