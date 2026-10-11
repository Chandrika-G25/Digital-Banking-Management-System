import React, { useState, useEffect } from 'react';
import { Search, Users, Mail, Phone, Shield, ArrowRight } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { apiRequest } from '../services/api';

export default function EmployeeCustomers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/employee/customers/?search=${encodeURIComponent(search)}`);
      const list = Array.isArray(data) ? data : (data?.results || []);
      setCustomers(list);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  return (
    <DashboardLayout pageTitle="Customer Directory" subtitle="Searchable branch customer records with masked account information">
      {/* Search Header */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="input-with-icon" style={{ flex: 1 }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by customer name, ID, email, or account number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search Directory
          </button>
        </form>
      </div>

      {/* Customers Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Customer ID</th>
              <th>Contact Info</th>
              <th>KYC Status</th>
              <th>Accounts (Masked)</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{c.email}</div>
                </td>
                <td>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--blue-600)' }}>{c.customer_id}</strong>
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                  <div>{c.phone || 'No phone'}</div>
                </td>
                <td>
                  <StatusBadge status={c.kyc_status} />
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                    {c.accounts.map((a) => (
                      <div key={a.id} style={{ fontFamily: 'monospace' }}>
                        {a.type}: <strong>{a.account_number_masked}</strong> (${a.balance})
                      </div>
                    ))}
                  </div>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  {c.created_at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
