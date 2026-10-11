import React from 'react';
import { Printer, Download, CheckCircle, X, ShieldCheck, Building, User, Calendar, CreditCard, FileText } from 'lucide-react';

export default function DepositReceiptModal({ isOpen, onClose, receipt }) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const receiptText = `
============================================================
              SECUREBANK — CASH DEPOSIT RECEIPT
============================================================
Transaction Reference : ${receipt.reference_number}
Date & Time           : ${receipt.formatted_date || receipt.timestamp}
Status                : ${receipt.status || 'COMPLETED'}

BRANCH INFORMATION
------------------------------------------------------------
Branch Name           : ${receipt.branch?.name || 'Main Branch'}
Branch Code           : ${receipt.branch?.code || 'SB-001'}
City / Location       : ${receipt.branch?.city || 'Metro'}

ACCOUNT & BENEFICIARY
------------------------------------------------------------
Customer ID           : ${receipt.customer_id}
Customer Name         : ${receipt.customer_name}
Account Number        : ${receipt.account_number_masked || receipt.account_number}
Account Type          : ${receipt.account_type || 'Savings'}

DEPOSIT PARTICULARS
------------------------------------------------------------
Amount Deposited      : ${receipt.amount_formatted || `₹${receipt.amount}`}
Depositor Name        : ${receipt.depositor_name || receipt.customer_name}
Remarks               : ${receipt.remarks || 'Counter cash deposit'}

TELLER VERIFICATION
------------------------------------------------------------
Processed By          : ${receipt.teller?.teller_reference || receipt.teller?.name || 'Authorized Teller'}
Digital Signature     : AUTHENTICATED ELECTRONIC TRANSACTION
============================================================
Thank you for banking with SecureBank.
Support: support@securebank.demo
============================================================
    `.trim();

    const element = document.createElement('a');
    const file = new Blob([receiptText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `SecureBank_Deposit_${receipt.reference_number}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '95%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '2rem',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-2xl)',
          backgroundColor: 'var(--white)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn-icon"
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10 }}
          aria-label="Close Receipt"
        >
          <X size={20} />
        </button>

        {/* Printable Receipt Container */}
        <div id="printable-deposit-receipt">
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--slate-200)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--emerald-50)',
                color: 'var(--emerald-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}
            >
              <CheckCircle size={30} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: '0.2rem' }}>
              SecureBank
            </h2>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--blue-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Branch Counter Deposit Receipt
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
              {receipt.branch?.name || 'Main Branch'} ({receipt.branch?.code || 'SB-001'})
            </div>
          </div>

          {/* Amount Badge Banner */}
          <div
            style={{
              backgroundColor: 'var(--emerald-50)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--emerald-700)', letterSpacing: '0.04em' }}>
              Cash Credited Successfully
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--emerald-700)', margin: '0.25rem 0' }}>
              {receipt.amount_formatted || `₹${receipt.amount}`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--emerald-800)', fontFamily: 'monospace' }}>
              Ref: <strong>{receipt.reference_number}</strong>
            </div>
          </div>

          {/* Key Particulars Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
              <span style={{ color: 'var(--slate-500)' }}>Customer Name:</span>
              <strong style={{ color: 'var(--navy-950)' }}>{receipt.customer_name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
              <span style={{ color: 'var(--slate-500)' }}>Customer ID:</span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--navy-950)' }}>{receipt.customer_id}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
              <span style={{ color: 'var(--slate-500)' }}>Credited Account:</span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--navy-950)' }}>
                {receipt.account_number_masked || receipt.account_number}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
              <span style={{ color: 'var(--slate-500)' }}>Account Type:</span>
              <span style={{ color: 'var(--navy-950)', fontWeight: 600 }}>{receipt.account_type || 'Savings'}</span>
            </div>

            {receipt.new_balance_formatted && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                <span style={{ color: 'var(--slate-500)' }}>Updated Balance:</span>
                <strong style={{ color: 'var(--blue-700)' }}>{receipt.new_balance_formatted}</strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
              <span style={{ color: 'var(--slate-500)' }}>Depositor (Counter):</span>
              <strong style={{ color: 'var(--navy-950)' }}>{receipt.depositor_name || receipt.customer_name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
              <span style={{ color: 'var(--slate-500)' }}>Transaction Date:</span>
              <span style={{ color: 'var(--navy-950)' }}>{receipt.formatted_date || receipt.timestamp}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
              <span style={{ color: 'var(--slate-500)' }}>Teller Reference:</span>
              <span style={{ color: 'var(--navy-950)', fontWeight: 600 }}>
                {receipt.teller?.teller_reference || receipt.teller?.name || 'Staff Teller'}
              </span>
            </div>

            {receipt.remarks && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                <span style={{ color: 'var(--slate-500)' }}>Remarks:</span>
                <span style={{ color: 'var(--slate-700)', fontStyle: 'italic' }}>{receipt.remarks}</span>
              </div>
            )}
          </div>

          {/* Security & Watermark Note */}
          <div
            style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--slate-50)',
              border: '1px solid var(--slate-200)',
              textAlign: 'center',
              fontSize: '0.725rem',
              color: 'var(--slate-500)',
              marginBottom: '1.5rem'
            }}
          >
            <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: 'var(--emerald-600)' }} />
            Authenticated counter deposit record generated by SecureBank Core Ledger. Real-time updates delivered via WebSockets.
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownload}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <Download size={16} /> Download
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
