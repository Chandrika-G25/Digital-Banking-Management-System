import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, Send, Users, FileText, Zap, DollarSign,
  UserCheck, ShieldCheck, FileCheck, CheckCircle2, UserPlus,
  ClipboardList, Search, BarChart3, LogOut, Building, User
} from 'lucide-react';
import { authService } from '../services/auth';
import { wsService } from '../services/websocket';

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const user = authService.getCurrentUser() || {};
  const role = user.role || 'CUSTOMER';

  const handleLogout = async () => {
    wsService.disconnect();
    await authService.logout();
    navigate('/login');
  };

  const customerLinks = [
    { to: '/customer/dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { to: '/customer/verification-status', label: 'Verification Status', icon: UserCheck },
    { to: '/customer/accounts', label: 'Accounts & Deposits', icon: CreditCard },
    { to: '/customer/transfers', label: 'Transfer Money', icon: Send },
    { to: '/customer/beneficiaries', label: 'Saved Beneficiaries', icon: Users },
    { to: '/customer/transactions', label: 'Statements & History', icon: FileText },
    { to: '/customer/bills', label: 'Pay Utility Bills', icon: Zap },
    { to: '/customer/loans', label: 'Loan Services', icon: DollarSign },
    { to: '/customer/profile', label: 'Profile & Security', icon: User },
  ];

  const employeeLinks = [
    { to: '/employee/dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
    { to: '/employee/customer-verification', label: 'Customer Verification', icon: UserCheck },
    { to: '/employee/cash-deposit', label: 'Cash Deposit', icon: DollarSign },
    { to: '/employee/cash-deposit-history', label: 'Deposit History', icon: FileText },
    { to: '/employee/customers', label: 'Customer Directory', icon: Users },
    { to: '/employee/kyc', label: 'KYC Document Review', icon: FileCheck },
    { to: '/employee/service-requests', label: 'Service Requests', icon: ClipboardList },
    { to: '/employee/transactions', label: 'Transaction Lookup', icon: Search },
    { to: '/employee/onboard', label: 'Onboard Customer', icon: UserPlus },
  ];

  const managerLinks = [
    { to: '/manager/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { to: '/employee/customer-verification', label: 'Customer Verification', icon: UserCheck },
    { to: '/manager/cash-deposits', label: 'Cash Deposit Monitoring', icon: DollarSign },
    { to: '/manager/approvals', label: 'Maker-Checker Center', icon: CheckCircle2 },
    { to: '/manager/loans', label: 'Loan Underwriting', icon: DollarSign },
    { to: '/manager/employees', label: 'Staff & Roles', icon: Users },
    { to: '/manager/audit-logs', label: 'Branch Audit Trail', icon: ShieldCheck },
    { to: '/manager/reports', label: 'Branch Analytics', icon: BarChart3 },
  ];

  let links = customerLinks;
  let roleTitle = 'Customer Portal';
  let badgeColor = 'var(--blue-500)';

  if (role === 'EMPLOYEE') {
    links = employeeLinks;
    roleTitle = 'Employee Operations';
    badgeColor = 'var(--purple-600)';
  } else if (role === 'BRANCH_MANAGER') {
    links = managerLinks;
    roleTitle = 'Branch Administration';
    badgeColor = 'var(--amber-500)';
  }

  const branchName = user.branch_info ? user.branch_info.name : 'Main Branch';
  const displayId = user.customer_id || user.employee_id || user.username;

  return (
    <aside className={`dashboard-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--blue-600), var(--blue-400))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--white)',
            flexShrink: 0
          }}
        >
          <ShieldCheck size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--white)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            SecureBank
          </div>
          <div style={{ fontSize: '0.675rem', color: 'var(--blue-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {roleTitle}
          </div>
        </div>
      </div>

      {/* User Info Capsule */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: badgeColor,
              color: 'var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            {(user.first_name || user.username || 'U')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username}
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--slate-400)', fontFamily: 'monospace' }}>
              ID: {displayId}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.725rem', color: 'var(--slate-400)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Building size={12} color="var(--blue-400)" />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {branchName}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          overflowY: 'auto'
        }}
      >
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to.endsWith('dashboard')}
              onClick={() => onClose && onClose()}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.7rem 0.95rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--white)' : 'var(--slate-300)',
                backgroundColor: isActive ? 'var(--blue-600)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                textDecoration: 'none',
                transition: 'var(--transition)'
              })}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Action */}
      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.65rem',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            color: 'var(--rose-400)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'var(--transition)'
          }}
        >
          <LogOut size={16} /> Secure Sign Out
        </button>
      </div>
    </aside>
  );
}
