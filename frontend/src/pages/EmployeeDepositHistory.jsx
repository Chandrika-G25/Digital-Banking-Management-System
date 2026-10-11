import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Calendar, FileText, Printer, Download,
  CheckCircle, ArrowLeft, ArrowRight, RefreshCw, AlertCircle, Building, User
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DepositReceiptModal from '../components/DepositReceiptModal';
import { depositService } from '../services/depositService';
import { authService } from '../services/auth';

export default function EmployeeDepositHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = authService.getCurrentUser() || {};

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [tellerFilter, setTellerFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Receipt Modal state
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await depositService.getDepositHistory({
        search,
        status: statusFilter,
        from_date: fromDate,
        to_date: toDate,
        teller: tellerFilter,
        page: currentPage
      });

      if (data.results) {
        setDeposits(data.results);
        setTotalCount(data.count || data.results.length);
        setHasNext(Boolean(data.next));
        setHasPrev(Boolean(data.previous));
      } else if (Array.isArray(data)) {
        setDeposits(data);
        setTotalCount(data.length);
        setHasNext(false);
        setHasPrev(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve deposit history.');
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentPage, statusFilter]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchHistory();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setTellerFilter('');
    setCurrentPage(1);
    setTimeout(fetchHistory, 0);
  };

  const handleViewReceipt = (dep) => {
    setSelectedReceipt({
      reference_number: dep.reference_number,
      amount: dep.amount,
      amount_formatted: dep.amount_formatted,
      account_number: dep.account_number,
      account_number_masked: dep.account_number_masked,
      account_type: dep.account_type,
      customer_id: dep.customer_id,
      customer_name: dep.customer_name,
      customer_phone: dep.customer_phone,
      depositor_name: dep.depositor_name,
      remarks: dep.remarks,
      status: dep.status,
      timestamp: dep.created_at,
      formatted_date: dep.formatted_date,
      branch: {
        name: dep.branch_name,
        code: dep.branch_code
      },
      teller: {
        employee_id: dep.teller_id,
        name: dep.teller_name,
        teller_reference: `Teller ${dep.teller_id} (${dep.branch_name})`
      }
    });
    setReceiptModalOpen(true);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="dashboard-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <div className="dashboard-content" style={{ padding: '2.5rem 2rem 5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--blue-600)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Building size={16} /> Branch Audit &amp; Counter Ledger
              </div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.25rem', letterSpacing: '-0.025em' }}>
                Cash Deposit History
              </h1>
              <p style={{ color: 'var(--slate-600)', fontSize: '0.975rem', marginTop: '0.35rem' }}>
                Search, filter, and audit all physical counter cash deposits processed within your assigned branch.
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Assigned Branch:</div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--navy-950)' }}>
                {currentUser.branch_info?.name || 'Central Metro Branch'} ({currentUser.branch_info?.code || 'SB-001'})
              </strong>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', marginBottom: '1.75rem', boxShadow: 'var(--shadow-sm)' }}>
            <form onSubmit={handleFilterSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) repeat(4, minmax(0, 1fr)) auto', gap: '0.75rem', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search Ref, Customer ID, Account..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REVERSED">Reversed</option>
                </select>
              </div>

              {/* From Date */}
              <div>
                <input
                  type="date"
                  className="form-control"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              {/* To Date */}
              <div>
                <input
                  type="date"
                  className="form-control"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              {/* Teller filter */}
              <div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Teller ID..."
                  value={tellerFilter}
                  onChange={(e) => setTellerFilter(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              {/* Filter Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.65rem 1rem' }}>
                  Filter
                </button>
                <button type="button" className="btn btn-outline" onClick={handleClearFilters} style={{ fontSize: '0.85rem', padding: '0.65rem 0.85rem' }}>
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Results Table */}
          <div className="card" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--blue-600)' }} />
                <div>Loading branch cash deposits...</div>
              </div>
            ) : error ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--rose-600)' }}>
                <AlertCircle size={28} style={{ margin: '0 auto 0.5rem' }} />
                <div>{error}</div>
              </div>
            ) : deposits.length === 0 ? (
              <div style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                <FileText size={42} style={{ margin: '0 auto 1rem', color: 'var(--slate-300)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: '0.25rem' }}>
                  No Deposit Records Found
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', maxWidth: '420px', margin: '0 auto' }}>
                  There are no counter cash deposits matching your query in this branch. Try clearing your filters or process a new deposit.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Ref Number</th>
                      <th>Date &amp; Time</th>
                      <th>Customer</th>
                      <th>Account (Masked)</th>
                      <th>Amount (INR)</th>
                      <th>Depositor</th>
                      <th>Teller</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((dep) => (
                      <tr key={dep.id || dep.reference_number}>
                        <td>
                          <code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue-700)' }}>
                            {dep.reference_number}
                          </code>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                          {dep.formatted_date || dep.created_at}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--navy-950)' }}>{dep.customer_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontFamily: 'monospace' }}>
                            {dep.customer_id}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {dep.account_number_masked}
                          </span>
                          <div style={{ fontSize: '0.725rem', color: 'var(--slate-400)' }}>
                            {dep.account_type}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--emerald-600)', fontSize: '0.95rem' }}>
                            {dep.amount_formatted || `₹${dep.amount}`}
                          </strong>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                          {dep.depositor_name || dep.customer_name}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--purple-700)', fontWeight: 600 }}>
                            {dep.teller_id}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${dep.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                            {dep.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => handleViewReceipt(dep)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Printer size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {deposits.length > 0 && (
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--slate-200)',
                  backgroundColor: 'var(--slate-50)'
                }}
              >
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                  Total records found: <strong>{totalCount}</strong>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={!hasPrev || currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <ArrowLeft size={14} /> Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem' }}>
                    Page {currentPage}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={!hasNext}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>

      {/* Printable Receipt Modal */}
      <DepositReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={selectedReceipt}
      />
    </div>
  );
}
