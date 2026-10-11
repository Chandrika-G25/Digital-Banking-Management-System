import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Zap, RefreshCw, FileText } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function TransactionTable({ transactions = [], userAccountNumbers = [], onViewReceipt }) {
  const list = Array.isArray(transactions) ? transactions : (transactions?.results || []);
  if (!list || list.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
        <div style={{ color: 'var(--slate-400)', marginBottom: '0.5rem' }}>
          <RefreshCw size={36} strokeWidth={1.5} style={{ margin: '0 auto', display: 'block' }} />
        </div>
        <h4 style={{ color: 'var(--navy-900)', marginBottom: '0.25rem' }}>No Transactions Found</h4>
        <p style={{ fontSize: '0.875rem' }}>Transactions and transfers will appear here once executed.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Description &amp; Reference</th>
            <th>Accounts</th>
            <th>Date &amp; Time</th>
            <th>Amount</th>
            <th>Status</th>
            {onViewReceipt && <th>Receipt</th>}
          </tr>
        </thead>
        <tbody>
          {list.map((t) => {
            // Determine whether this transaction is incoming (credit) or outgoing (debit)
            const isDeposit = t.transaction_type === 'CASH_DEPOSIT' || t.transaction_type === 'DEPOSIT';
            const isDebit = !isDeposit && (userAccountNumbers.includes(t.from_account_number) || (!t.from_account && t.transaction_type === 'BILL_PAYMENT'));
            const isCredit = isDeposit || userAccountNumbers.includes(t.to_account_number);

            let Icon = ArrowDownLeft;
            let iconBg = 'var(--emerald-50)';
            let iconColor = 'var(--emerald-600)';

            if (isDebit) {
              Icon = ArrowUpRight;
              iconBg = 'var(--slate-100)';
              iconColor = 'var(--slate-700)';
            } else if (t.transaction_type === 'BILL_PAYMENT') {
              Icon = Zap;
              iconBg = 'var(--purple-50)';
              iconColor = 'var(--purple-600)';
            } else if (isDeposit) {
              Icon = ArrowDownLeft;
              iconBg = 'var(--emerald-100)';
              iconColor = 'var(--emerald-700)';
            }

            const currencySymbol = '₹';

            return (
              <tr key={t.id || t.reference_number}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: iconBg,
                        color: iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--navy-900)' }}>
                      {t.transaction_type === 'CASH_DEPOSIT' ? 'Cash Deposit' : (t.transaction_type ? t.transaction_type.replace('_', ' ') : 'Transfer')}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.875rem' }}>
                    {t.description || 'SecureBank Transfer'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontFamily: 'monospace' }}>
                    {t.reference_number}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>
                    <div>From: <span style={{ fontFamily: 'monospace' }}>{t.transaction_type === 'CASH_DEPOSIT' ? 'Branch Cash Counter' : (t.from_account_masked || t.from_account_number || 'External')}</span></div>
                    <div>To: <span style={{ fontFamily: 'monospace' }}>{t.to_account_masked || t.to_account_number || 'Biller'}</span></div>
                  </div>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>
                  {new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  <div style={{ fontSize: '0.725rem', color: 'var(--slate-400)' }}>
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: isDebit ? 'var(--slate-900)' : 'var(--emerald-600)'
                    }}
                  >
                    {isDebit ? `-${currencySymbol}${t.amount}` : `+${currencySymbol}${t.amount}`}
                  </span>
                </td>
                <td>
                  <StatusBadge status={t.status} />
                </td>
                {onViewReceipt && (
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onViewReceipt(t)}
                      title="View printable receipt"
                    >
                      <FileText size={14} /> Receipt
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
