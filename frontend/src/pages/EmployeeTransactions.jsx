import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, ArrowLeft } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import TransactionTable from '../components/TransactionTable';
import ReceiptModal from '../components/ReceiptModal';
import { apiRequest } from '../services/api';

export default function EmployeeTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/employee/transactions/?search=${encodeURIComponent(search)}`);
      setTransactions(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  return (
    <DashboardLayout pageTitle="Transaction Investigation" subtitle="Inspect branch-level transaction references and trace ledger double entries">
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="input-with-icon" style={{ flex: 1 }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-control"
              placeholder="Search reference number, sender account, or recipient account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Trace Transaction
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <TransactionTable
          transactions={transactions}
          onViewReceipt={(txn) => setSelectedTxn(txn)}
        />
      </div>

      {selectedTxn && (
        <ReceiptModal
          transaction={selectedTxn}
          onClose={() => setSelectedTxn(null)}
        />
      )}
    </DashboardLayout>
  );
}
