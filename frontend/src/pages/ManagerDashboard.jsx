import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CreditCard, CheckCircle2, DollarSign, BarChart3,
  TrendingUp, ShieldCheck, ArrowRight, Building, Clock
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatCard from '../components/StatCard';
import { apiRequest } from '../services/api';
import { authService } from '../services/auth';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = authService.getCurrentUser() || {};

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/manager/dashboard/');
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

  const chartData = data?.chart_data || [];
  const maxVol = Math.max(...chartData.map((d) => d.volume), 100);

  return (
    <DashboardLayout
      pageTitle="Branch Administration Dashboard"
      subtitle={`${data?.branch?.name || 'Main Branch'} (${data?.branch?.code || 'HQ'}) • Director: ${user.first_name || user.username}`}
    >
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <StatCard
          title="Branch Customer Base"
          value={data?.total_customers || 0}
          subtitle="Managed Customers"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Deposit Accounts"
          value={data?.total_active_accounts || 0}
          subtitle="Savings & Checking"
          icon={CreditCard}
          color="emerald"
        />
        <StatCard
          title="Pending Dual-Control Approvals"
          value={data?.pending_approvals || 0}
          subtitle="Maker-Checker Queue"
          icon={CheckCircle2}
          color="amber"
        />
        <StatCard
          title="Total Branch Volume"
          value={`$${parseFloat(data?.total_volume || 0).toLocaleString()}`}
          subtitle="Cumulative Completed Settlements"
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* 7-Day Transaction Trend Chart */}
      <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--navy-950)' }}>
              7-Day Transaction Settlement Volume Trend
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
              Daily cumulative settled money transfers for {data?.branch?.name}
            </p>
          </div>
          <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} /> Real-Time Analytics
          </span>
        </div>

        {/* SVG / Bar Chart Representation */}
        <div
          style={{
            height: '240px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '1.25rem',
            paddingTop: '2rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--slate-200)',
            overflowX: 'auto'
          }}
        >
          {chartData.map((d, i) => {
            const heightPct = Math.max(Math.round((d.volume / maxVol) * 100), 10);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: '50px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '0.4rem' }}>
                  ${Math.round(d.volume)}
                </div>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '44px',
                    height: `${heightPct}%`,
                    backgroundColor: 'var(--blue-600)',
                    background: 'linear-gradient(180deg, var(--blue-500) 0%, var(--navy-800) 100%)',
                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                    transition: 'height 0.4s ease'
                  }}
                  title={`${d.date}: $${d.volume}`}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.5rem', whiteSpace: 'nowrap' }}>
                  {d.date}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manager Operations Quick Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--amber-300)', backgroundColor: 'rgba(245, 158, 11, 0.02)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--navy-900)' }}>
              <ShieldCheck size={22} color="var(--amber-600)" />
              <h3 style={{ fontSize: '1.15rem' }}>Cash Deposit Monitoring</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Real-time branch cash flow monitoring, teller performance metrics, threshold flags, and reversal governance.
            </p>
          </div>
          <Link to="/manager/cash-deposits" className="btn btn-primary" style={{ width: '100%' }}>
            Cash Deposit Monitoring &rarr;
          </Link>
        </div>

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--navy-900)' }}>
              <CheckCircle2 size={22} color="var(--amber-500)" />
              <h3 style={{ fontSize: '1.15rem' }}>Maker-Checker Approval Hub</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Dual-control validation for high-value fund movements and loan disbursements.
            </p>
          </div>
          <Link to="/manager/approvals" className="btn btn-secondary" style={{ width: '100%' }}>
            Open Approval Center ({data?.pending_approvals || 0} Pending) &rarr;
          </Link>
        </div>

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--navy-900)' }}>
              <DollarSign size={22} color="var(--emerald-600)" />
              <h3 style={{ fontSize: '1.15rem' }}>Loan Underwriting Review</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Examine residential mortgages, commercial loans, and personal financing requests.
            </p>
          </div>
          <Link to="/manager/loans" className="btn btn-secondary" style={{ width: '100%' }}>
            Review Loans ({data?.pending_loans || 0} Pending) &rarr;
          </Link>
        </div>

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--navy-900)' }}>
              <ShieldCheck size={22} color="var(--blue-600)" />
              <h3 style={{ fontSize: '1.15rem' }}>Branch Audit Trail</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Inspect immutable audit records of all logins, fund transfers, and employee interventions.
            </p>
          </div>
          <Link to="/manager/audit-logs" className="btn btn-secondary" style={{ width: '100%' }}>
            View Immutable Logs &rarr;
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
