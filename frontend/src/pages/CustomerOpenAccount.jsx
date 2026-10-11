import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, User, CreditCard, FileCheck, Lock, CheckCircle2,
  ArrowRight, ArrowLeft, UploadCloud, Eye, EyeOff, AlertCircle,
  Building, Copy, Check, Clock, ShieldAlert, Sparkles, HelpCircle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authService } from '../services/auth';

export default function CustomerOpenAccount() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('PREFER_NOT_TO_SAY');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Step 2: Account Information
  const [accountType, setAccountType] = useState('SAVINGS'); // SAVINGS or CURRENT
  const [branchId, setBranchId] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('SPOUSE');
  const [nomineePhone, setNomineePhone] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('500.00');

  // Step 3: Identity & Verification Documents
  const [identityType, setIdentityType] = useState('PASSPORT');
  const [identityNumber, setIdentityNumber] = useState('');
  const [identityFile, setIdentityFile] = useState(null);
  const [addressProofType, setAddressProofType] = useState('UTILITY_BILL');
  const [addressProofFile, setAddressProofFile] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Step 4: Security & Password Setup
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 5: Confirmation / Result
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        setLoadingBranches(true);
        const data = await authService.getBranches();
        const list = Array.isArray(data) ? data : data.branches || [];
        setBranches(list);
        if (list.length > 0) {
          setBranchId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setLoadingBranches(false);
      }
    }
    loadBranches();
  }, []);

  // Password validation rules
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[\W_]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const getPasswordStrength = () => {
    let score = 0;
    if (hasMinLength) score += 25;
    if (hasUpper && hasLower) score += 25;
    if (hasNumber) score += 25;
    if (hasSymbol) score += 25;
    return score;
  };

  const strengthScore = getPasswordStrength();
  const getStrengthLabel = () => {
    if (strengthScore <= 25) return { label: 'Weak', color: '#ef4444' };
    if (strengthScore <= 50) return { label: 'Fair', color: '#f59e0b' };
    if (strengthScore <= 75) return { label: 'Good', color: '#3b82f6' };
    return { label: 'Strong & Compliant', color: '#10b981' };
  };

  // Step Navigators & Form Validations
  const validateStep1 = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Please enter your full first and last name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter a valid mobile number.');
      return;
    }
    if (!dateOfBirth) {
      setErrorMsg('Please enter your date of birth.');
      return;
    }
    if (!address.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setErrorMsg('Please complete your full residential address, city, state, and postal code.');
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep2 = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const deposit = parseFloat(initialDeposit);
    if (isNaN(deposit) || deposit < 100) {
      setErrorMsg('Initial deposit amount must be at least $100.00.');
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep3 = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identityNumber.trim()) {
      setErrorMsg('Please provide your identity document number.');
      return;
    }
    if (!identityFile) {
      setErrorMsg('Please upload a copy of your identity document (Passport, National ID, or Driving License).');
      return;
    }
    if (!addressProofFile) {
      setErrorMsg('Please upload a copy of your residential address proof document.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('You must accept the terms and declarations to proceed.');
      return;
    }
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      setErrorMsg('Password does not satisfy all complexity requirements (12+ characters, upper, lower, number, symbol).');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password confirmation does not match.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('first_name', firstName.trim());
      formData.append('last_name', lastName.trim());
      formData.append('email', email.trim());
      formData.append('phone', phone.trim());
      formData.append('date_of_birth', dateOfBirth);
      formData.append('gender', gender);
      formData.append('address', address.trim());
      formData.append('city', city.trim());
      formData.append('state', state.trim());
      formData.append('postal_code', postalCode.trim());

      formData.append('account_type', accountType);
      if (branchId) formData.append('branch_id', branchId);
      formData.append('nominee_name', nomineeName.trim());
      formData.append('nominee_relationship', nomineeRelationship);
      formData.append('nominee_phone', nomineePhone.trim());
      formData.append('initial_deposit', initialDeposit);

      formData.append('identity_type', identityType);
      formData.append('identity_number', identityNumber.trim());
      if (identityFile) formData.append('identity_document', identityFile);

      formData.append('address_proof_type', addressProofType);
      if (addressProofFile) formData.append('address_proof_document', addressProofFile);

      formData.append('terms_accepted', 'true');
      formData.append('password', password);
      formData.append('confirm_password', confirmPassword);

      const res = await authService.openAccount(formData);

      setCreatedResult({
        customer_id: res.customer_id,
        application_id: res.application_id,
        registration_date: res.registration_date || new Date().toISOString(),
        status: res.verification_status || 'PENDING',
        account_number: res.account_number,
        message: res.message
      });
      setStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMsg(err.message || 'Account registration failed. Please review the form and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCustomerId = () => {
    if (createdResult?.customer_id) {
      navigator.clipboard.writeText(createdResult.customer_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 3000);
    }
  };

  const stepsHeader = [
    { num: 1, label: 'Personal Information', icon: User },
    { num: 2, label: 'Account Information', icon: CreditCard },
    { num: 3, label: 'Identity & Documents', icon: FileCheck },
    { num: 4, label: 'Security & Password', icon: Lock },
    { num: 5, label: 'Confirmation', icon: CheckCircle2 }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--slate-50)' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2.5rem 1rem 4rem' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', width: '100%' }}>
          
          {/* Header Title */}
          <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--blue-600)',
                padding: '0.35rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.825rem',
                fontWeight: 700,
                marginBottom: '0.75rem'
              }}
            >
              <ShieldCheck size={16} /> Official Online Application
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.35rem)', fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
              Open a New Bank Account
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--slate-500)', maxWidth: '580px', margin: '0 auto' }}>
              Submit your account opening application in 4 simple steps. Your unique Customer ID and secure credentials will be generated immediately.
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              position: 'relative',
              marginBottom: '2.5rem',
              padding: '0 1rem'
            }}
          >
            {/* Background connection line */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '40px',
                right: '40px',
                height: '3px',
                backgroundColor: 'var(--slate-200)',
                zIndex: 1
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${((step - 1) / 4) * 100}%`,
                  backgroundColor: 'var(--blue-600)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>

            {stepsHeader.map((s) => {
              const IconComp = s.icon;
              const isPassed = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div
                  key={s.num}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.4rem',
                    flex: 1
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      transition: 'all 0.3s ease',
                      backgroundColor: isPassed ? 'var(--emerald-600)' : isCurrent ? 'var(--blue-600)' : 'var(--white)',
                      color: isPassed || isCurrent ? 'var(--white)' : 'var(--slate-400)',
                      border: isPassed ? '2px solid var(--emerald-600)' : isCurrent ? '2px solid var(--blue-600)' : '2px solid var(--slate-300)',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none'
                    }}
                  >
                    {isPassed ? <Check size={18} /> : <IconComp size={18} />}
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'var(--navy-950)' : isPassed ? 'var(--slate-700)' : 'var(--slate-400)',
                      textAlign: 'center',
                      display: 'none',
                      whiteSpace: 'nowrap'
                    }}
                    className="step-label"
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                backgroundColor: 'var(--rose-50)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: 'var(--rose-700)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9rem'
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Card */}
          <div
            className="card"
            style={{
              padding: '2.5rem',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              backgroundColor: 'var(--white)'
            }}
          >
            {/* STEP 1: Personal Information */}
            {step === 1 && (
              <form onSubmit={validateStep1}>
                <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 0.25rem' }}>
                    Step 1: Personal Information
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
                    Please enter your verified personal and contact details for KYC identification.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Eleanor"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Vance"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Date of Birth *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-control"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                      <option value="OTHER">Other / Non-Binary</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. +1 (555) 345-6789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. eleanor.vance@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Residential Address *</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Street address, building name, flat / apartment number"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Metropolis"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State / Province *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. NY"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Postal / ZIP Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 10001"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--slate-100)', paddingTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem 1.75rem' }}>
                    Continue to Account Preferences <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Account Information */}
            {step === 2 && (
              <form onSubmit={validateStep2}>
                <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 0.25rem' }}>
                    Step 2: Account Preferences
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
                    Select your preferred account product, home servicing branch, and optional nominee.
                  </p>
                </div>

                {/* Account Type Selection Tiles */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.75rem' }}>Account Product Type *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div
                      onClick={() => setAccountType('SAVINGS')}
                      style={{
                        border: accountType === 'SAVINGS' ? '2px solid var(--blue-600)' : '1px solid var(--slate-200)',
                        backgroundColor: accountType === 'SAVINGS' ? 'rgba(37, 99, 235, 0.04)' : 'var(--white)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--navy-950)', fontSize: '1.05rem' }}>
                          Primary Savings Account
                        </span>
                        <span className="badge badge-success">4.25% APY</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: 0 }}>
                        High-yield personal savings with compound interest accrual, unlimited incoming transfers, and digital bill pay.
                      </p>
                    </div>

                    <div
                      onClick={() => setAccountType('CURRENT')}
                      style={{
                        border: accountType === 'CURRENT' ? '2px solid var(--blue-600)' : '1px solid var(--slate-200)',
                        backgroundColor: accountType === 'CURRENT' ? 'rgba(37, 99, 235, 0.04)' : 'var(--white)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--navy-950)', fontSize: '1.05rem' }}>
                          Current Checking Account
                        </span>
                        <span className="badge badge-info">Zero Overdraft</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: 0 }}>
                        Designed for high-frequency day-to-day transactions, commercial wires, and active payments.
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Preferred Servicing Branch *</label>
                    <select
                      className="form-control"
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      required
                    >
                      {loadingBranches ? (
                        <option value="">Loading branch directory...</option>
                      ) : (
                        branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.city}) &bull; {b.code}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Opening Deposit (USD) *</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--slate-400)' }}>
                        $
                      </span>
                      <input
                        type="number"
                        step="50"
                        min="100"
                        className="form-control"
                        style={{ paddingLeft: '2rem' }}
                        value={initialDeposit}
                        onChange={(e) => setInitialDeposit(e.target.value)}
                        required
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                      Minimum initial deposit: $100.00. Provisioned upon employee verification approval.
                    </span>
                  </div>
                </div>

                {/* Nominee Details Section */}
                <div style={{ backgroundColor: 'var(--slate-50)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)', marginBottom: '2rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                    Beneficiary Nominee (Optional)
                  </h4>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                    Designate an authorized legal nominee for your account assets in compliance with banking standards.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Nominee Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Jonathan Vance"
                        value={nomineeName}
                        onChange={(e) => setNomineeName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Relationship</label>
                      <select
                        className="form-control"
                        value={nomineeRelationship}
                        onChange={(e) => setNomineeRelationship(e.target.value)}
                      >
                        <option value="SPOUSE">Spouse</option>
                        <option value="CHILD">Child / Dependent</option>
                        <option value="PARENT">Parent</option>
                        <option value="SIBLING">Sibling</option>
                        <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Nominee Contact Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="e.g. +1 (555) 889-1234"
                        value={nomineePhone}
                        onChange={(e) => setNomineePhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--slate-100)', paddingTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem 1.75rem' }}>
                    Continue to Document Upload <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Identity & Documents */}
            {step === 3 && (
              <form onSubmit={validateStep3}>
                <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 0.25rem' }}>
                    Step 3: Identity Verification &amp; Document Upload
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
                    Upload government-approved identity and address verification documents for bank staff KYC review.
                  </p>
                </div>

                {/* Identity Document Box */}
                <div style={{ backgroundColor: 'var(--slate-50)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <FileCheck size={20} color="var(--blue-600)" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                      1. Primary Photo Identification *
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Identification Document Type *</label>
                      <select
                        className="form-control"
                        value={identityType}
                        onChange={(e) => setIdentityType(e.target.value)}
                      >
                        <option value="PASSPORT">International Passport</option>
                        <option value="NATIONAL_ID">National Identity Card</option>
                        <option value="DRIVING_LICENSE">State Driving License</option>
                        <option value="GOVERNMENT_ID">Other Government Photo ID</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Document Identification Number *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. PASS-98765432"
                        value={identityNumber}
                        onChange={(e) => setIdentityNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Upload Identity Document (PDF, PNG, JPG) *</label>
                    <div
                      style={{
                        border: '2px dashed var(--slate-300)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.5rem',
                        textAlign: 'center',
                        backgroundColor: 'var(--white)',
                        cursor: 'pointer'
                      }}
                      onClick={() => document.getElementById('id-doc-upload').click()}
                    >
                      <UploadCloud size={32} color="var(--blue-500)" style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy-900)' }}>
                        {identityFile ? identityFile.name : 'Click to select or drag and drop your photo ID file'}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                        {identityFile ? `${Math.round(identityFile.size / 1024)} KB &bull; File attached` : 'Supported formats: PDF, JPG, PNG (Max 10MB)'}
                      </span>
                      <input
                        id="id-doc-upload"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        onChange={(e) => setIdentityFile(e.target.files[0] || null)}
                      />
                    </div>
                  </div>
                </div>

                {/* Residential Address Proof Box */}
                <div style={{ backgroundColor: 'var(--slate-50)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)', marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Building size={20} color="var(--blue-600)" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                      2. Residential Address Proof *
                    </h3>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Proof of Address Document Type *</label>
                    <select
                      className="form-control"
                      value={addressProofType}
                      onChange={(e) => setAddressProofType(e.target.value)}
                    >
                      <option value="UTILITY_BILL">Electricity / Water / Gas Utility Bill</option>
                      <option value="BANK_STATEMENT">Recent Bank or Financial Statement</option>
                      <option value="LEASE_AGREEMENT">Residential Lease / Rental Agreement</option>
                      <option value="TAX_ASSESSMENT">Municipal Property Tax Assessment</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Upload Address Proof Document (PDF, PNG, JPG) *</label>
                    <div
                      style={{
                        border: '2px dashed var(--slate-300)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.5rem',
                        textAlign: 'center',
                        backgroundColor: 'var(--white)',
                        cursor: 'pointer'
                      }}
                      onClick={() => document.getElementById('addr-doc-upload').click()}
                    >
                      <UploadCloud size={32} color="var(--blue-500)" style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy-900)' }}>
                        {addressProofFile ? addressProofFile.name : 'Click to select or drag and drop your address proof file'}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                        {addressProofFile ? `${Math.round(addressProofFile.size / 1024)} KB &bull; File attached` : 'Must be dated within the last 90 days. Supported: PDF, JPG, PNG'}
                      </span>
                      <input
                        id="addr-doc-upload"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        onChange={(e) => setAddressProofFile(e.target.files[0] || null)}
                      />
                    </div>
                  </div>
                </div>

                {/* Declarations & Terms Checkbox */}
                <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.04)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(37, 99, 235, 0.2)', marginBottom: '2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: 'var(--blue-600)' }}
                      required
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--slate-700)', lineHeight: 1.5 }}>
                      <strong>Applicant Declaration:</strong> I hereby declare that all personal details, identity numbers, and documents provided are genuine, authentic, and accurate. I accept the SecureBank Account Opening Terms &amp; Conditions, AML Compliance Declarations, and Electronic Banking Disclosures.
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--slate-100)', paddingTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem 1.75rem' }}>
                    Continue to Password Setup <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Security & Password Setup */}
            {step === 4 && (
              <form onSubmit={handleFinalSubmit}>
                <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 0.25rem' }}>
                    Step 4: Establish Customer Password
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
                    Establish your confidential login password. You will use this password together with your generated Customer ID to sign in.
                  </p>
                </div>

                {/* Password Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-customer-password">
                      Create Password (Minimum 12 Characters) *
                    </label>
                    <div className="input-with-icon">
                      <Lock className="input-icon" size={18} />
                      <input
                        id="new-customer-password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Enter secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="input-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirm-customer-password">
                      Confirm Password *
                    </label>
                    <div className="input-with-icon">
                      <Lock className="input-icon" size={18} />
                      <input
                        id="confirm-customer-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Re-enter password to confirm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="input-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                <div style={{ backgroundColor: 'var(--slate-50)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                      Password Strength Guidance:
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: getStrengthLabel().color }}>
                      {getStrengthLabel().label}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div style={{ height: '6px', backgroundColor: 'var(--slate-200)', borderRadius: '3px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${strengthScore}%`,
                        backgroundColor: getStrengthLabel().color,
                        transition: 'width 0.3s ease, background-color 0.3s ease'
                      }}
                    />
                  </div>

                  {/* Checklist Rules */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasMinLength ? 'var(--emerald-600)' : 'var(--slate-500)' }}>
                      {hasMinLength ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                      Minimum 12 characters length
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasUpper ? 'var(--emerald-600)' : 'var(--slate-500)' }}>
                      {hasUpper ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                      At least one uppercase letter (A-Z)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasLower ? 'var(--emerald-600)' : 'var(--slate-500)' }}>
                      {hasLower ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                      At least one lowercase letter (a-z)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasNumber ? 'var(--emerald-600)' : 'var(--slate-500)' }}>
                      {hasNumber ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                      At least one numeric digit (0-9)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasSymbol ? 'var(--emerald-600)' : 'var(--slate-500)' }}>
                      {hasSymbol ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                      At least one special symbol (!@#$%^&*)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: passwordsMatch ? 'var(--emerald-600)' : 'var(--slate-500)' }}>
                      {passwordsMatch ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                      Passwords match perfectly
                    </div>
                  </div>
                </div>

                {/* Security Advisory */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                  <ShieldCheck size={20} color="var(--emerald-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                    <strong>Cryptographic Protection:</strong> Passwords are never saved in plaintext or transmitted in URLs/logs. Your banking credentials are salted and hashed using Django's PBKDF2 cryptography.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--slate-100)', paddingTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(3)} disabled={submitting}>
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
                    disabled={submitting}
                  >
                    {submitting ? 'Provisioning Account...' : 'Submit Account Opening Application'} <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 5: Registration Confirmation Page */}
            {step === 5 && createdResult && (
              <div>
                {/* Big Celebration Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'var(--white)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1.25rem',
                      boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <CheckCircle2 size={36} />
                  </div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                    Application Submitted Successfully!
                  </h2>
                  <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
                    Verification Status: PENDING
                  </span>
                </div>

                {/* Customer ID Display Box (Highlighted) */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, var(--navy-950), var(--navy-900))',
                    color: 'var(--white)',
                    padding: '2rem',
                    borderRadius: 'var(--radius-xl)',
                    marginBottom: '2rem',
                    textAlign: 'center',
                    boxShadow: 'var(--shadow-xl)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--blue-400)', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Your Official Unique Customer ID
                  </div>

                  <div
                    style={{
                      fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      letterSpacing: '0.05em',
                      color: 'var(--white)',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <span>{createdResult.customer_id}</span>
                    <button
                      type="button"
                      onClick={handleCopyCustomerId}
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.45rem',
                        cursor: 'pointer',
                        color: 'var(--white)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Copy Customer ID"
                    >
                      {copiedId ? <Check size={20} color="var(--emerald-400)" /> : <Copy size={20} />}
                    </button>
                  </div>

                  {copiedId && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--emerald-400)', fontWeight: 600 }}>
                      Customer ID copied to clipboard!
                    </span>
                  )}

                  <p style={{ margin: '0.75rem auto 0', fontSize: '0.88rem', color: 'var(--slate-300)', maxWidth: '520px' }}>
                    Please write down or save your Customer ID. You will use <strong>{createdResult.customer_id}</strong> and your password to sign in to SecureBank.
                  </p>
                </div>

                {/* Example Specification Message Card */}
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.75rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem'
                  }}
                >
                  <Clock size={24} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#92400e' }}>
                      Application Status Notice
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#78350f', lineHeight: 1.5 }}>
                      "Your SecureBank application has been submitted successfully. Your Customer ID is <strong>{createdResult.customer_id}</strong>. Your application is awaiting verification by our bank staff. You can use your Customer ID and password to log in and track your application."
                    </p>
                  </div>
                </div>

                {/* Application Metadata Grid */}
                <div
                  style={{
                    backgroundColor: 'var(--slate-50)',
                    border: '1px solid var(--slate-200)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem 1.5rem',
                    marginBottom: '2rem'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.775rem', textTransform: 'uppercase', fontWeight: 600 }}>
                        Application Reference
                      </span>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--navy-950)' }}>
                        {createdResult.application_id}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.775rem', textTransform: 'uppercase', fontWeight: 600 }}>
                        Registration Date
                      </span>
                      <strong style={{ color: 'var(--navy-950)' }}>
                        {new Date(createdResult.registration_date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.775rem', textTransform: 'uppercase', fontWeight: 600 }}>
                        Account Status
                      </span>
                      <strong style={{ color: '#d97706' }}>
                        Pending Staff Verification
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Next Steps for Employee Verification */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ margin: '0 0 0.85rem', fontSize: '1rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                    Next Steps for Verification:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.6 }}>
                    <li>An authorized branch banking specialist will review your submitted KYC documents and identity proof.</li>
                    <li>For your security, initial financial operations (such as transfers, payments, and loans) remain restricted until staff approval is finalized.</li>
                    <li>You can log in at any time with your Customer ID and password to check your live application status or upload additional documents if requested.</li>
                  </ul>
                </div>

                {/* Action CTA Button */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    style={{ padding: '0.9rem 2.25rem', fontSize: '1.05rem', minWidth: '240px' }}
                    onClick={() => navigate('/customer/login', { state: { prefilledId: createdResult.customer_id } })}
                  >
                    Go to Customer Login <ArrowRight size={18} />
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-lg"
                    style={{ padding: '0.9rem 1.75rem' }}
                    onClick={() => navigate('/customer/verification-status')}
                  >
                    Track Application Status
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
