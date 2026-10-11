import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { apiRequest } from '../services/api';

export default function EmployeeServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/employee/service-requests/');
      const list = Array.isArray(data) ? data : (data?.results || []);
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await apiRequest('/employee/service-requests/', {
        method: 'POST',
        body: { id, status: newStatus }
      });
      fetchRequests();
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  return (
    <DashboardLayout pageTitle="Service Requests" subtitle="Manage customer inquiry tickets, card requests, and cheque books">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Customer</th>
              <th>Request Type</th>
              <th>Subject &amp; Description</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((sr) => (
              <tr key={sr.id}>
                <td>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--blue-600)' }}>SR-{sr.id}</strong>
                </td>
                <td>
                  <div>{sr.customer_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{sr.customer_id}</div>
                </td>
                <td>
                  <span className="badge badge-info">{sr.request_type_display || sr.request_type}</span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{sr.subject}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>{sr.description}</div>
                </td>
                <td style={{ fontSize: '0.85rem' }}>
                  {sr.assigned_to_name || 'Unassigned'}
                </td>
                <td>
                  <StatusBadge status={sr.status} />
                </td>
                <td>
                  <select
                    className="form-control"
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                    value={sr.status}
                    onChange={(e) => handleUpdateStatus(sr.id, e.target.value)}
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
