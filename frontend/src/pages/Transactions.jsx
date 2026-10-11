import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Calendar, RefreshCw } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import TransactionTable from '../components/TransactionTable';
import ReceiptModal from '../components/ReceiptModal';
import { apiRequest } from '../services/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [txnType, setTxnType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (txnType) params.append('type', txnType);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      params.append('limit', '50');

      const data = await apiRequest(`/customer/transactions/?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data?.results || []);
      setTransactions(list);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [txnType, fromDate, toDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleDownloadCSV = async () => {
    try {
      const blob = await apiRequest('/customer/statements/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SecureBank_Statement_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert('Failed to generate CSV statement.');
    }
  };

  return (
    <DashboardLayout pageTitle="Transaction History" subtitle="Audit records and electronic transaction vouchers">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--navy-950)' }}>Historical Ledger Records</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Total Found: {transactions.length} records</p>
        </div>
        <button className="btn btn-secondary" onClick={handleDownloadCSV}>
          <Download size={16} /> Export Statement (CSV)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search Query</label>
            <div className="input-with-icon">
              <Search className="input-icon" size={16} />
              <input
                type="text"
                className="form-control"
                placeholder="Search reference or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Transaction Type</label>
            <select
              className="form-control"
              value={txnType}
              onChange={(e) => setTxnType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="TRANSFER">Internal Transfer</option>
              <option value="BILL_PAYMENT">Bill Payment</option>
              <option value="DEPOSIT">Direct Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
              <option value="LOAN_DISBURSEMENT">Loan Disbursement</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-control"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-control"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Filter
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setSearch(''); setTxnType(''); setFromDate(''); setToDate(''); }}
              title="Reset Filters"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* Transactions Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <TransactionTable
          transactions={transactions}
          onViewReceipt={(txn) => setSelectedTxn(txn)}
        />
      </div>

      {/* Receipt Modal */}
      {selectedTxn && (
        <ReceiptModal
          transaction={selectedTxn}
          onClose={() => setSelectedTxn(null)}
        />
      )}
    </DashboardLayout>
  );
}
