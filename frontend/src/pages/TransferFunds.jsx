import React, { useState, useEffect } from 'react';
import { Send, ShieldCheck, AlertCircle, CheckCircle2, User, ArrowRight, Lock } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import ConfirmModal from '../components/ConfirmModal';
import ReceiptModal from '../components/ReceiptModal';
import { apiRequest } from '../services/api';
import { verificationService } from '../services/verificationService';

export default function TransferFunds() {
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptTxn, setReceiptTxn] = useState(null);
  const [verification, setVerification] = useState(null);

  // Generate unique idempotency key per transaction attempt
  const [idempotencyKey, setIdempotencyKey] = useState(`idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    async function loadData() {
      try {
        const [accData, benData, vData] = await Promise.all([
          apiRequest('/customer/accounts/').catch(() => []),
          apiRequest('/customer/beneficiaries/').catch(() => []),
          verificationService.getStatus().catch(() => null)
        ]);
        const accList = Array.isArray(accData) ? accData : (accData?.results || []);
        const benList = Array.isArray(benData) ? benData : (benData?.results || []);
        setAccounts(accList);
        if (accList.length > 0) {
          setSelectedAccountId(accList[0].id);
        }
        setBeneficiaries(benList);
        setVerification(vData);
      } catch (err) {
        setError('Failed to load accounts.');
      }
    }
    loadData();
  }, []);

  const selectedAccount = accounts.find((a) => String(a.id) === String(selectedAccountId));

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setError('');

    const transferAmt = parseFloat(amount);
    if (!transferAmt || transferAmt <= 0) {
      setError('Please enter a valid amount greater than $0.00.');
      return;
    }

    if (selectedAccount && parseFloat(selectedAccount.balance) < transferAmt) {
      setError(`Insufficient funds. Your available balance is $${selectedAccount.balance}.`);
      return;
    }

    if (!recipientAccount.trim()) {
      setError('Please provide a recipient account number.');
      return;
    }

    if (selectedAccount && selectedAccount.account_number === recipientAccount.trim()) {
      setError('Source and destination accounts cannot be identical.');
      return;
    }

    setConfirmOpen(true);
  };

  const handleExecuteTransfer = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest('/customer/transfers/', {
        method: 'POST',
        idempotencyKey: idempotencyKey,
        body: {
          from_account_id: selectedAccountId,
          to_account_number: recipientAccount.trim(),
          amount: amount,
          description: description || 'Internal Transfer',
          idempotency_key: idempotencyKey
        }
      });

      setConfirmOpen(false);

      // Open receipt voucher modal
      setReceiptTxn({
        reference_number: response.reference_number,
        amount: response.amount,
        status: response.status,
        timestamp: response.timestamp,
        from_account_masked: response.from_account_masked,
        to_account_masked: response.to_account_masked,
        description: response.description,
        transaction_type: 'TRANSFER'
      });

      // Reset form & generate fresh idempotency key
      setAmount('');
      setDescription('');
      setRecipientAccount('');
      setIdempotencyKey(`idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

      // Refresh accounts to reflect updated balance
      const updatedAccounts = await apiRequest('/customer/accounts/');
      setAccounts(updatedAccounts);
    } catch (err) {
      setConfirmOpen(false);
      setError(err.message || 'Transfer failed. Please check beneficiary details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBeneficiary = (accNum) => {
    setRecipientAccount(accNum);
  };

  return (
    <DashboardLayout pageTitle="Transfer Money" subtitle="Internal atomic money transfer with instant confirmation">
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {/* Security Notification Banner */}
        <div
          style={{
            backgroundColor: 'var(--blue-50)',
            border: '1px solid var(--blue-100)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}
        >
          <ShieldCheck size={24} color="var(--blue-600)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--blue-900)', lineHeight: 1.5 }}>
            <strong>Protected by SecureBank Transfer Service:</strong> Transactions execute atomically with double-entry ledger bookkeeping. Balances update immediately with verified idempotency protection.
          </div>
        </div>

        {verification && verification.status !== 'VERIFIED' && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem'
            }}
          >
            <Lock size={24} color="#d97706" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: 1.5 }}>
              <strong>Transfer Temporarily Restricted:</strong> Your account is currently {verification.status.replace(/_/g, ' ')}. In accordance with banking regulations, money transfers will be unlocked once bank staff verifies your KYC profile.
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: 'var(--rose-50)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--rose-600)',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div className="card" style={{ padding: '2.25rem 2rem', borderRadius: 'var(--radius-xl)' }}>
          <form onSubmit={handlePreSubmit}>
            {/* Source Account */}
            <div className="form-group">
              <label className="form-label" htmlFor="source-account">Select Source Account</label>
              <select
                id="source-account"
                className="form-control"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_type.replace('_', ' ')} — {acc.masked_account_number} (Available: ${acc.balance} {acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Beneficiary Picker */}
            {beneficiaries.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                  Quick Select Beneficiary:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {beneficiaries.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBeneficiary(b.account_number)}
                      style={{
                        backgroundColor: recipientAccount === b.account_number ? 'var(--blue-600)' : 'var(--slate-100)',
                        color: recipientAccount === b.account_number ? 'var(--white)' : 'var(--slate-700)',
                        border: '1px solid var(--slate-200)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'var(--transition)'
                      }}
                    >
                      {b.name} ({b.nickname || b.account_number.slice(-4)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recipient Account Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="recipient-account">Recipient Account Number</label>
              <input
                id="recipient-account"
                type="text"
                className="form-control"
                placeholder="Enter 12-digit account number (e.g. 100554433221)"
                value={recipientAccount}
                onChange={(e) => setRecipientAccount(e.target.value)}
                required
              />
            </div>

            {/* Transfer Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-amount">Amount (USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--slate-400)' }}>
                  $
                </span>
                <input
                  id="transfer-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="50000.00"
                  className="form-control"
                  style={{ paddingLeft: '2.25rem', fontSize: '1.25rem', fontWeight: 700 }}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                Daily limit: $50,000.00 &bull; No transfer transaction fees
              </span>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-description">Description / Reference Note</label>
              <input
                id="transfer-description"
                type="text"
                className="form-control"
                placeholder="e.g. Invoice payment, project reimbursement"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
                disabled={loading || (verification && verification.status !== 'VERIFIED')}
              >
                {verification && verification.status !== 'VERIFIED' ? (
                  <>Awaiting Account Verification <Lock size={18} /></>
                ) : (
                  <>Review &amp; Transfer Funds <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Authorize Internal Transfer"
        message={`Are you sure you want to transfer $${amount} from account ${selectedAccount?.masked_account_number} to recipient ${recipientAccount}? This action will immediately debit your account and credit the beneficiary.`}
        confirmLabel="Confirm & Transfer"
        isLoading={loading}
        onConfirm={handleExecuteTransfer}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Receipt Modal */}
      {receiptTxn && (
        <ReceiptModal
          transaction={receiptTxn}
          onClose={() => setReceiptTxn(null)}
        />
      )}
    </DashboardLayout>
  );
}
