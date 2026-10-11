import React, { useState } from 'react';
import {
  Search, ShieldCheck, CheckCircle2, AlertCircle, Building, User,
  CreditCard, ArrowRight, DollarSign, RefreshCw, Check, FileText, Info
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DepositReceiptModal from '../components/DepositReceiptModal';
import { depositService } from '../services/depositService';
import { authService } from '../services/auth';

export default function EmployeeCashDeposit() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = authService.getCurrentUser() || {};

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form state
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount] = useState('');
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [depositorName, setDepositorName] = useState('');
  const [depositorPhone, setDepositorPhone] = useState('');
  const [remarks, setRemarks] = useState('');
  const [verificationConfirmed, setVerificationConfirmed] = useState(false);

  // Submission state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const quickAmounts = ['1000', '5000', '10000', '25000', '50000'];

  // Handle Search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchError('Please enter at least 2 characters to search.');
      return;
    }

    setSearching(true);
    setSearchError('');
    setSelectedCustomer(null);
    setSelectedAccount(null);

    try {
      const results = await depositService.searchCustomers(searchQuery);
      setCustomers(results);
      if (results.length === 0) {
        setSearchError('No matching eligible customer accounts found in your branch.');
      } else if (results.length === 1) {
        // Auto-select single matching customer
        selectCustomer(results[0]);
      }
    } catch (err) {
      setSearchError(err.message || 'Failed to search customers. Please check permissions.');
      setCustomers([]);
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = (cust) => {
    setSelectedCustomer(cust);
    // Auto-select first active account if available
    const activeAcc = cust.accounts.find(a => a.is_eligible);
    setSelectedAccount(activeAcc || (cust.accounts.length > 0 ? cust.accounts[0] : null));
    setDepositorName(cust.full_name);
    setIsThirdParty(false);
  };

  // Open Confirmation Modal
  const handleOpenConfirm = (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedCustomer) {
      setSubmitError('Please search and select a verified customer.');
      return;
    }

    if (!selectedAccount) {
      setSubmitError('Please select a destination account.');
      return;
    }

    if (!selectedAccount.is_eligible) {
      setSubmitError(`Selected account is ${selectedAccount.status} and cannot receive deposits.`);
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSubmitError('Please enter a valid deposit amount greater than zero.');
      return;
    }

    if (!verificationConfirmed) {
      setSubmitError('You must check the verification declaration before processing.');
      return;
    }

    setConfirmModalOpen(true);
  };

  // Submit Deposit
  const handleSubmitDeposit = async () => {
    setSubmitting(true);
    setSubmitError('');

    const idempotencyKey = `DEP-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    try {
      const payload = {
        account_id: selectedAccount.id,
        amount: parseFloat(amount).toFixed(2),
        depositor_name: isThirdParty ? depositorName.trim() : (selectedCustomer.full_name || ''),
        depositor_phone: isThirdParty ? depositorPhone.trim() : (selectedCustomer.phone || ''),
        remarks: remarks.trim() || 'Counter cash deposit',
        verification_confirmed: verificationConfirmed,
        idempotency_key: idempotencyKey
      };

      const result = await depositService.processDeposit(payload, idempotencyKey);
      
      setConfirmModalOpen(false);
      setCompletedReceipt(result);
      setReceiptModalOpen(true);

      // Update local account balance view
      if (selectedAccount && result.new_balance) {
        setSelectedAccount(prev => ({
          ...prev,
          balance: result.new_balance,
          balance_formatted: result.new_balance_formatted || `₹${result.new_balance}`
        }));
      }
    } catch (err) {
      setSubmitError(err.message || 'Counter cash deposit processing failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Form for next transaction
  const handleReset = () => {
    setSelectedCustomer(null);
    setSelectedAccount(null);
    setSearchQuery('');
    setCustomers([]);
    setAmount('');
    setIsThirdParty(false);
    setDepositorName('');
    setDepositorPhone('');
    setRemarks('');
    setVerificationConfirmed(false);
    setCompletedReceipt(null);
    setSubmitError('');
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="dashboard-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <div className="dashboard-content" style={{ padding: '2.5rem 2rem 5rem' }}>
          {/* Header */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--blue-600)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Building size={16} /> Branch Counter Operations
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.25rem', letterSpacing: '-0.025em' }}>
              Branch Counter Cash Deposit
            </h1>
            <p style={{ color: 'var(--slate-600)', fontSize: '0.975rem', marginTop: '0.35rem' }}>
              Accept and credit physical cash deposits at the teller counter with instant double-entry ledger posting and real-time customer notification.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
            {/* Left Column: Search & Deposit Form */}
            <div>
              {/* Step 1: Customer & Account Search */}
              <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)', marginBottom: '1.75rem', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--blue-600)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                    1
                  </div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                    Customer Lookup &amp; Verification
                  </h2>
                </div>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by Customer ID (e.g. CUST1001), Account Number, or Phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '2.75rem' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={searching}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                  >
                    {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />} Search
                  </button>
                </form>

                {searchError && (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} /> {searchError}
                  </div>
                )}

                {/* Search Results list if multiple customers found */}
                {customers.length > 1 && !selectedCustomer && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-500)' }}>
                      Found {customers.length} matching customers in your branch:
                    </div>
                    {customers.map((c) => (
                      <div
                        key={c.customer_id}
                        onClick={() => selectCustomer(c)}
                        style={{
                          padding: '1rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--slate-200)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: 'var(--slate-50)',
                          transition: 'var(--transition)'
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--navy-950)' }}>{c.full_name}</strong>
                          <div style={{ fontSize: '0.775rem', color: 'var(--slate-500)' }}>
                            ID: <code style={{ fontFamily: 'monospace' }}>{c.customer_id}</code> | Phone: {c.phone} | Branch: {c.branch.name}
                          </div>
                        </div>
                        <button type="button" className="btn btn-sm btn-outline">
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Customer Card */}
                {selectedCustomer && (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: 'var(--blue-50)',
                      border: '1px solid var(--blue-200)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--blue-600)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          <User size={20} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                            {selectedCustomer.full_name}
                          </h3>
                          <div style={{ fontSize: '0.8rem', color: 'var(--blue-700)', fontFamily: 'monospace' }}>
                            ID: {selectedCustomer.customer_id}
                          </div>
                        </div>
                      </div>
                      <span className={`badge ${selectedCustomer.kyc_status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
                        KYC {selectedCustomer.kyc_status_display}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--slate-600)', borderTop: '1px solid rgba(37, 99, 235, 0.15)', paddingTop: '0.75rem' }}>
                      <div>Phone: <strong>{selectedCustomer.phone || 'N/A'}</strong></div>
                      <div>Email: <strong>{selectedCustomer.email || 'N/A'}</strong></div>
                      <div>Branch: <strong>{selectedCustomer.branch.name} ({selectedCustomer.branch.code})</strong></div>
                      <div>Active Accounts: <strong>{selectedCustomer.accounts.length}</strong></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Account Selection */}
              {selectedCustomer && (
                <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)', marginBottom: '1.75rem', boxShadow: 'var(--shadow-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--blue-600)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                      2
                    </div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                      Select Destination Account
                    </h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedCustomer.accounts.map((acc) => {
                      const isSelected = selectedAccount?.id === acc.id;
                      return (
                        <div
                          key={acc.id}
                          onClick={() => acc.is_eligible && setSelectedAccount(acc)}
                          style={{
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${isSelected ? 'var(--blue-600)' : 'var(--slate-200)'}`,
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'var(--white)',
                            cursor: acc.is_eligible ? 'pointer' : 'not-allowed',
                            opacity: acc.is_eligible ? 1 : 0.6,
                            transition: 'var(--transition)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: 'var(--radius-full)',
                                border: `2px solid ${isSelected ? 'var(--blue-600)' : 'var(--slate-400)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {isSelected && (
                                <div style={{ width: '12px', height: '12px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--blue-600)' }} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--navy-950)', fontSize: '0.95rem' }}>
                                {acc.account_type_display}
                              </div>
                              <div style={{ fontSize: '0.825rem', color: 'var(--slate-500)', fontFamily: 'monospace' }}>
                                {acc.masked_account_number}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                              Available Balance
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--blue-700)' }}>
                              {acc.balance_formatted || `₹${acc.balance}`}
                            </div>
                            <span className={`badge ${acc.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.675rem' }}>
                              {acc.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Deposit Particulars */}
              {selectedCustomer && selectedAccount && (
                <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)', marginBottom: '1.75rem', boxShadow: 'var(--shadow-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--blue-600)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                      3
                    </div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                      Deposit Particulars &amp; Amount
                    </h2>
                  </div>

                  <form onSubmit={handleOpenConfirm}>
                    {/* Amount Input with prominent Rupee formatting */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                        Cash Deposit Amount (INR) <span style={{ color: 'var(--rose-500)' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: '1.25rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontWeight: 900,
                            fontSize: '1.5rem',
                            color: 'var(--blue-700)'
                          }}
                        >
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          max="100000"
                          className="form-control"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          style={{
                            paddingLeft: '3rem',
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            color: 'var(--navy-950)',
                            letterSpacing: '-0.02em',
                            height: '56px'
                          }}
                        />
                      </div>

                      {/* Quick Chips */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                        {quickAmounts.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setAmount(q)}
                            className="btn btn-sm btn-outline"
                            style={{
                              fontSize: '0.775rem',
                              fontWeight: 700,
                              borderColor: amount === q ? 'var(--blue-600)' : 'var(--slate-200)',
                              backgroundColor: amount === q ? 'var(--blue-50)' : 'transparent',
                              color: amount === q ? 'var(--blue-700)' : 'var(--slate-600)'
                            }}
                          >
                            + ₹{parseInt(q).toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Depositor Toggle (Self vs Third Party) */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        Depositor Information
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input
                            type="radio"
                            name="depositor_type"
                            checked={!isThirdParty}
                            onChange={() => {
                              setIsThirdParty(false);
                              setDepositorName(selectedCustomer.full_name);
                            }}
                          />
                          <span>Account Holder (Self)</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input
                            type="radio"
                            name="depositor_type"
                            checked={isThirdParty}
                            onChange={() => {
                              setIsThirdParty(true);
                              setDepositorName('');
                            }}
                          />
                          <span>Third-Party Representative</span>
                        </label>
                      </div>

                      {isThirdParty && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <div>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Depositor Full Name *"
                              value={depositorName}
                              onChange={(e) => setDepositorName(e.target.value)}
                              required={isThirdParty}
                            />
                          </div>
                          <div>
                            <input
                              type="tel"
                              className="form-control"
                              placeholder="Depositor Mobile Number"
                              value={depositorPhone}
                              onChange={(e) => setDepositorPhone(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remarks Input */}
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        Deposit Reference / Counter Remarks
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. In-branch cash deposit, walk-in counter counterfoil"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>

                    {/* Identity Verification Pledge */}
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--amber-50)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        marginBottom: '1.5rem'
                      }}
                    >
                      <label style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={verificationConfirmed}
                          onChange={(e) => setVerificationConfirmed(e.target.checked)}
                          style={{ marginTop: '0.2rem' }}
                          required
                        />
                        <span style={{ fontSize: '0.825rem', color: 'var(--amber-900)', lineHeight: 1.4 }}>
                          <strong>Mandatory Teller Verification:</strong> I confirm that I have physically counted the legal cash currency and verified the customer's identity and account ownership according to SecureBank counter verification guidelines.
                        </span>
                      </label>
                    </div>

                    {submitError && (
                      <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={16} /> {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!verificationConfirmed || !amount || parseFloat(amount) <= 0}
                      style={{
                        width: '100%',
                        padding: '0.9rem',
                        fontSize: '1rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      Review &amp; Process Deposit <ArrowRight size={18} />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Right Column: Live Summary & Policies Card */}
            <div>
              {/* Live Transaction Preview Card */}
              <div
                className="card"
                style={{
                  padding: '1.75rem',
                  borderRadius: 'var(--radius-xl)',
                  marginBottom: '1.5rem',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--slate-200)',
                  backgroundColor: 'var(--white)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--navy-950)' }}>
                  <FileText size={20} color="var(--blue-600)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                    Live Deposit Summary
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Branch Location:</span>
                    <strong style={{ color: 'var(--navy-950)' }}>
                      {currentUser.branch_info?.name || 'Main Branch'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Processing Teller:</span>
                    <strong style={{ color: 'var(--navy-950)' }}>
                      {currentUser.employee_id || currentUser.username}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Selected Customer:</span>
                    <strong style={{ color: selectedCustomer ? 'var(--navy-950)' : 'var(--slate-400)' }}>
                      {selectedCustomer ? selectedCustomer.full_name : 'None selected'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Account Number:</span>
                    <strong style={{ fontFamily: 'monospace', color: selectedAccount ? 'var(--navy-950)' : 'var(--slate-400)' }}>
                      {selectedAccount ? selectedAccount.masked_account_number : '—'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Current Balance:</span>
                    <span style={{ color: 'var(--blue-700)', fontWeight: 700 }}>
                      {selectedAccount ? selectedAccount.balance_formatted : '—'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Deposit Amount:</span>
                    <strong style={{ fontSize: '1.25rem', color: amount ? 'var(--emerald-600)' : 'var(--slate-400)', fontWeight: 800 }}>
                      {amount && !isNaN(parseFloat(amount)) ? `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                    </strong>
                  </div>

                  {selectedAccount && amount && !isNaN(parseFloat(amount)) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: 'var(--blue-50)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ color: 'var(--blue-800)', fontWeight: 600 }}>Projected New Balance:</span>
                      <strong style={{ color: 'var(--blue-900)', fontSize: '1.05rem' }}>
                        ₹{(parseFloat(selectedAccount.balance) + parseFloat(amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Policy & Operational Limits */}
              <div
                className="card"
                style={{
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-xl)',
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  fontSize: '0.8rem',
                  color: 'var(--slate-600)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: '0.75rem' }}>
                  <ShieldCheck size={18} color="var(--blue-600)" />
                  Branch Teller Counter Guidelines
                </div>
                <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6 }}>
                  <li>Single counter deposit limit without manager override is <strong>₹1,00,000.00</strong>.</li>
                  <li>Deposits exceeding <strong>₹50,000.00</strong> automatically trigger an executive alert in the Branch Manager oversight feed.</li>
                  <li>All balances and double-entry general ledger entries are atomically updated with row locks.</li>
                  <li>Customers receive immediate real-time push alerts via WebSockets.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="modal-backdrop" onClick={() => setConfirmModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--blue-50)', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                Confirm Cash Deposit
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                Please review transaction details before committing to the core general ledger.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--slate-50)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Account Holder:</span>
                <strong style={{ color: 'var(--navy-950)' }}>{selectedCustomer?.full_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Account Number:</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedAccount?.masked_account_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Depositor:</span>
                <strong>{isThirdParty ? depositorName : `${selectedCustomer?.full_name} (Self)`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Deposit Amount:</span>
                <strong style={{ color: 'var(--emerald-600)', fontSize: '1.2rem' }}>
                  ₹{parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {submitError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitDeposit}
                disabled={submitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                {submitting ? 'Committing Transaction...' : 'Confirm & Process Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Receipt Modal */}
      <DepositReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          handleReset();
        }}
        receipt={completedReceipt}
      />
    </div>
  );
}
