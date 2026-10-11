import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FileCheck, ClipboardList, TrendingUp, Building,
  ArrowRight, RefreshCw, UserPlus, Search, Clock
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatCard from '../components/StatCard';
import { apiRequest } from '../services/api';
import { authService } from '../services/auth';

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = authService.getCurrentUser() || {};

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/employee/dashboard/');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <DashboardLayout
      pageTitle="Staff Operations Dashboard"
      subtitle={`${data?.branch?.name || 'Main Branch'} • Staff ID: ${user.employee_id || 'EMP2001'}`}
    >
      {/* Top Stat Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <StatCard
          title="Assigned Branch Customers"
          value={data?.assigned_customer_count || 0}
          subtitle="Registered in Branch"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Pending KYC Verifications"
          value={data?.pending_kyc_verifications || 0}
          subtitle="Requires ID Validation"
          icon={FileCheck}
          color="amber"
        />
        <StatCard
          title="Open Service Requests"
          value={data?.pending_customer_requests || 0}
          subtitle="Customer Support Tickets"
          icon={ClipboardList}
          color="purple"
        />
        <StatCard
          title="Today's Branch Transactions"
          value={data?.today_transaction_count || 0}
          subtitle="Processed Today"
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Quick Operation Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--blue-200)', backgroundColor: 'rgba(37, 99, 235, 0.02)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--navy-900)' }}>
              <Building size={20} color="var(--blue-600)" />
              <h3 style={{ fontSize: '1.15rem' }}>Branch Cash Deposit</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Process physical counter cash deposits for walk-in customers with atomic ledger posting and printable receipts.
            </p>
          </div>
          <Link to="/employee/cash-deposit" className="btn btn-primary" style={{ width: '100%' }}>
            Process Cash Deposit &rarr;
          </Link>
        </div>

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--navy-900)' }}>
              <UserPlus size={20} color="var(--blue-600)" />
              <h3 style={{ fontSize: '1.15rem' }}>Customer Onboarding</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Assist in-branch walk-in customers to open a new savings or checking account with demo funds.
            </p>
          </div>
          <Link to="/employee/onboard" className="btn btn-secondary" style={{ width: '100%' }}>
            Onboard New Customer &rarr;
          </Link>
        </div>

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--navy-900)' }}>
              <FileCheck size={20} color="var(--amber-500)" />
              <h3 style={{ fontSize: '1.15rem' }}>KYC Review Queue</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Inspect and verify submitted government identity documents to upgrade customer privileges.
            </p>
          </div>
          <Link to="/employee/kyc" className="btn btn-secondary" style={{ width: '100%' }}>
            Review KYC Documents &rarr;
          </Link>
        </div>

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--navy-900)' }}>
              <Search size={20} color="var(--purple-600)" />
              <h3 style={{ fontSize: '1.15rem' }}>Transaction Investigation</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Look up transaction references and trace ledger double-entries across accounts.
            </p>
          </div>
          <Link to="/employee/transactions" className="btn btn-secondary" style={{ width: '100%' }}>
            Inspect Transactions &rarr;
          </Link>
        </div>
      </div>

      {/* Recent Activity Audit Feed */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--navy-950)', marginBottom: '1rem' }}>
          Branch Operational Activity Log
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(data?.recent_activities || []).map((act) => (
            <div
              key={act.id}
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--slate-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem'
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{act.action}</span>
                <span style={{ color: 'var(--slate-500)', marginLeft: '0.5rem' }}>by <strong>{act.actor}</strong></span>
                <div style={{ color: 'var(--slate-600)', marginTop: '0.2rem' }}>{act.details}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={12} /> {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
