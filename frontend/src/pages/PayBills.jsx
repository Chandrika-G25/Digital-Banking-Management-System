import React, { useState, useEffect } from 'react';
import { Zap, Droplets, Wifi, Phone, CheckCircle2, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { apiRequest } from '../services/api';
import { verificationService } from '../services/verificationService';

export default function PayBills() {
  const [bills, setBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [billerCategory, setBillerCategory] = useState('ELECTRICITY');
  const [billerName, setBillerName] = useState('Metro Power Grid');
  const [billRef, setBillRef] = useState(`ELEC-${Math.floor(1000 + Math.random() * 9000)}`);
  const [amount, setAmount] = useState('125.50');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [verification, setVerification] = useState(null);

  const billers = {
    ELECTRICITY: ['Metro Power Grid', 'National Electric Co', 'Westside Green Energy'],
    WATER: ['Metropolis Pure Water', 'Municipal Sewage & Drainage'],
    INTERNET: ['Apex Fiber Broadband', 'Infinity Gigabit Wireless', 'Metro Net Fiber'],
    MOBILE: ['Verizon Wireless Postpaid', 'T-Mobile Elite Plan', 'AT&T Postpaid Direct']
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [billsData, accData, vData] = await Promise.all([
          apiRequest('/customer/bills/').catch(() => []),
          apiRequest('/customer/accounts/').catch(() => []),
          verificationService.getStatus().catch(() => null)
        ]);
        const billsList = Array.isArray(billsData) ? billsData : (billsData?.results || []);
        const accList = Array.isArray(accData) ? accData : (accData?.results || []);
        setBills(billsList);
        setAccounts(accList);
        if (accList.length > 0) {
          setSelectedAccountId(accList[0].id);
        }
        setVerification(vData);
      } catch {
        // Ignore
      }
    }
    loadData();
  }, []);

  const handleCategoryChange = (cat) => {
    setBillerCategory(cat);
    const names = billers[cat] || [];
    setBillerName(names[0] || '');
    setBillRef(`${cat.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handlePayBill = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      const data = await apiRequest('/customer/bills/', {
        method: 'POST',
        body: {
          account_id: selectedAccountId,
          biller_name: billerName,
          biller_category: billerCategory,
          bill_reference: billRef,
          amount: amount
        }
      });
      setSuccessMsg(`Paid $${amount} to ${billerName}! (Transaction Ref: ${data.reference_number})`);
      setBills([data.bill, ...bills]);
      setBillRef(`${billerCategory.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err) {
      setErrorMsg(err.message || 'Payment processing failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Utility Bill Payments" subtitle="Pay electricity, water, internet, and mobile bills instantly">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Bill Payment Form */}
        <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--navy-950)', marginBottom: '1.25rem' }}>
            Instant Utility Bill Payment
          </h3>

          {successMsg && (
            <div style={{ backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} /> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          {verification && verification.status !== 'VERIFIED' && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Lock size={20} color="#d97706" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
                <strong>Bill Pay Restricted:</strong> Your account status is {verification.status.replace(/_/g, ' ')}. Outgoing bill disbursements are disabled until staff verification is approved.
              </div>
            </div>
          )}

          <form onSubmit={handlePayBill}>
            {/* Pay From Account */}
            <div className="form-group">
              <label className="form-label">Pay From Account</label>
              <select
                className="form-control"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_type.replace('_', ' ')} — {a.masked_account_number} (${a.balance})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Select Buttons */}
            <div className="form-group">
              <label className="form-label">Biller Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('ELECTRICITY')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)',
                    backgroundColor: billerCategory === 'ELECTRICITY' ? 'var(--blue-50)' : 'var(--white)',
                    color: billerCategory === 'ELECTRICITY' ? 'var(--blue-600)' : 'var(--slate-700)',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  <Zap size={16} /> Electricity
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('WATER')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)',
                    backgroundColor: billerCategory === 'WATER' ? 'var(--blue-50)' : 'var(--white)',
                    color: billerCategory === 'WATER' ? 'var(--blue-600)' : 'var(--slate-700)',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  <Droplets size={16} /> Water
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('INTERNET')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)',
                    backgroundColor: billerCategory === 'INTERNET' ? 'var(--blue-50)' : 'var(--white)',
                    color: billerCategory === 'INTERNET' ? 'var(--blue-600)' : 'var(--slate-700)',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  <Wifi size={16} /> Broadband
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('MOBILE')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)',
                    backgroundColor: billerCategory === 'MOBILE' ? 'var(--blue-50)' : 'var(--white)',
                    color: billerCategory === 'MOBILE' ? 'var(--blue-600)' : 'var(--slate-700)',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  <Phone size={16} /> Mobile
                </button>
              </div>
            </div>

            {/* Biller Name */}
            <div className="form-group">
              <label className="form-label">Service Provider</label>
              <select
                className="form-control"
                value={billerName}
                onChange={(e) => setBillerName(e.target.value)}
                required
              >
                {(billers[billerCategory] || []).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Bill Reference Number */}
            <div className="form-group">
              <label className="form-label">Customer Bill / Consumer Number</label>
              <input
                type="text"
                className="form-control"
                value={billRef}
                onChange={(e) => setBillRef(e.target.value)}
                required
              />
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label">Invoice Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }}
              disabled={loading || (verification && verification.status !== 'VERIFIED')}
            >
              {verification && verification.status !== 'VERIFIED' ? (
                <>Awaiting Staff Verification <Lock size={18} /></>
              ) : loading ? (
                'Processing Debit...'
              ) : (
                <>Pay Bill Instantly <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>

        {/* Payment History Card */}
        <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--navy-950)', marginBottom: '1.25rem' }}>
            Recent Bill Payments
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {bills.length === 0 ? (
              <p style={{ color: 'var(--slate-400)', textAlign: 'center', padding: '2rem 0' }}>
                No past bill payments recorded.
              </p>
            ) : (
              bills.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-200)',
                    backgroundColor: 'var(--slate-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: '0.9rem' }}>
                      {b.biller_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      Ref: {b.bill_reference} &bull; {new Date(b.paid_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '0.95rem' }}>
                      ${b.amount}
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                      PAID
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
