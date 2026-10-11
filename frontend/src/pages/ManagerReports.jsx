import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, CreditCard, Download, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatCard from '../components/StatCard';
import { apiRequest } from '../services/api';

export default function ManagerReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const data = await apiRequest('/manager/reports/');
        setReports(data);
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const accountsBreakdown = reports?.accounts_breakdown || { savings: 0, current: 0, fixed_deposit: 0 };

  return (
    <DashboardLayout pageTitle="Branch Performance Analytics" subtitle="Aggregate liquidity, underwriting statistics, and portfolio balances">
      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard
          title="Total Branch Liquidity"
          value={`$${parseFloat(reports?.total_deposits_managed || 0).toLocaleString()}`}
          subtitle="Managed in Branch Accounts"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Completed Transactions"
          value={reports?.total_transactions_completed || 0}
          subtitle="All Time Settlements"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Approved Underwritten Loans"
          value={`$${parseFloat(reports?.approved_loans_volume || 0).toLocaleString()}`}
          subtitle="Disbursed Credit Facilities"
          icon={CreditCard}
          color="purple"
        />
      </div>

      {/* Account Categories Breakdown */}
      <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
        <h3 style={{ fontSize: '1.25rem', color: 'var(--navy-950)', marginBottom: '1.5rem' }}>
          Deposit Portfolio Breakdown
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>High-Yield Savings Accounts</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-900)', marginTop: '0.25rem' }}>
              {accountsBreakdown.savings}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--emerald-600)', marginTop: '0.25rem' }}>4.25% Interest Rate Class</div>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Current Checking Portfolios</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-900)', marginTop: '0.25rem' }}>
              {accountsBreakdown.current}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--blue-600)', marginTop: '0.25rem' }}>Daily Transactional Liquidity</div>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Term Fixed Deposits</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-900)', marginTop: '0.25rem' }}>
              {accountsBreakdown.fixed_deposit}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--purple-600)', marginTop: '0.25rem' }}>5.50% Fixed APY Maturity</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
