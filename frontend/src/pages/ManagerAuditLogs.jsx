import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, RefreshCw, Clock } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { apiRequest } from '../services/api';

export default function ManagerAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);
      params.append('limit', '50');

      const data = await apiRequest(`/manager/audit-logs/?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data?.results || []);
      setLogs(list);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <DashboardLayout pageTitle="Branch Audit Trail" subtitle="Immutable, chronological records of staff operations, transfers, and system events">
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="input-with-icon" style={{ flex: 1, minWidth: '240px' }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-control"
              placeholder="Search audit details or target ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '200px' }}>
            <select
              className="form-control"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Action Types</option>
              <option value="USER_LOGIN">User Logins</option>
              <option value="FUNDS_TRANSFER">Funds Transfers</option>
              <option value="KYC_STATUS_UPDATED">KYC Actions</option>
              <option value="LOAN_">Loan Decisions</option>
              <option value="APPROVAL_">Maker-Checker Approvals</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Filter Logs
          </button>
        </form>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action Flag</th>
              <th>Target Entity</th>
              <th>Audit Trail Details</th>
              <th>Branch</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} />
                    {new Date(l.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </td>
                <td>
                  <strong style={{ color: 'var(--navy-900)' }}>{l.actor_name}</strong>
                </td>
                <td>
                  <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>
                    {l.action}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {l.target_model}:{l.target_id}
                </td>
                <td style={{ fontSize: '0.875rem', color: 'var(--slate-700)' }}>
                  {l.details}
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  {l.branch_name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
