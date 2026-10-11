import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/auth';

// Public Pages
import Home from './pages/Home';
import RoleSelection from './pages/RoleSelection';
import CustomerLogin from './pages/CustomerLogin';
import EmployeeLogin from './pages/EmployeeLogin';
import ManagerLogin from './pages/ManagerLogin';
import CustomerRegister from './pages/CustomerRegister';
import CustomerOpenAccount from './pages/CustomerOpenAccount';
import CustomerVerificationStatus from './pages/CustomerVerificationStatus';
import ForgotPassword from './pages/ForgotPassword';

// Customer Pages
import CustomerDashboard from './pages/CustomerDashboard';
import TransferFunds from './pages/TransferFunds';
import Beneficiaries from './pages/Beneficiaries';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import PayBills from './pages/PayBills';
import Loans from './pages/Loans';
import Profile from './pages/Profile';

// Employee Pages
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeCustomers from './pages/EmployeeCustomers';
import EmployeeKYC from './pages/EmployeeKYC';
import EmployeeServiceRequests from './pages/EmployeeServiceRequests';
import EmployeeTransactions from './pages/EmployeeTransactions';
import EmployeeCashDeposit from './pages/EmployeeCashDeposit';
import EmployeeDepositHistory from './pages/EmployeeDepositHistory';
import EmployeeOnboard from './pages/EmployeeOnboard';
import EmployeeCustomerVerification from './pages/EmployeeCustomerVerification';

// Manager Pages
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerCashDeposits from './pages/ManagerCashDeposits';
import ManagerApprovals from './pages/ManagerApprovals';
import ManagerLoans from './pages/ManagerLoans';
import ManagerEmployees from './pages/ManagerEmployees';
import ManagerAuditLogs from './pages/ManagerAuditLogs';
import ManagerReports from './pages/ManagerReports';

// Role-based Protected Route Guard
function ProtectedRoute({ children, allowedRoles }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const role = authService.getRole();
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'EMPLOYEE') return <Navigate to="/employee/dashboard" replace />;
    if (role === 'BRANCH_MANAGER') return <Navigate to="/manager/dashboard" replace />;
    return <Navigate to="/customer/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<RoleSelection />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/employee/login" element={<EmployeeLogin />} />
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/customer/register" element={<CustomerRegister />} />
        <Route path="/customer/open-account" element={<CustomerOpenAccount />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Customer Protected Routes */}
        <Route
          path="/customer/verification-status"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <CustomerVerificationStatus />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/transfers"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <TransferFunds />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/beneficiaries"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <Beneficiaries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/transactions"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/accounts"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <Accounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/bills"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <PayBills />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/loans"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <Loans />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Employee Protected Routes */}
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'BRANCH_MANAGER']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/customer-verification"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'BRANCH_MANAGER']}>
              <EmployeeCustomerVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/customers"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'BRANCH_MANAGER']}>
              <EmployeeCustomers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/kyc"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'BRANCH_MANAGER']}>
              <EmployeeKYC />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/service-requests"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'BRANCH_MANAGER']}>
              <EmployeeServiceRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/transactions"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'BRANCH_MANAGER']}>
              <EmployeeTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/onboard"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'BRANCH_MANAGER']}>
              <EmployeeOnboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/cash-deposit"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'BRANCH_MANAGER']}>
              <EmployeeCashDeposit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/cash-deposit-history"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'BRANCH_MANAGER']}>
              <EmployeeDepositHistory />
            </ProtectedRoute>
          }
        />

        {/* Manager Protected Routes */}
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute allowedRoles={['BRANCH_MANAGER']}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/cash-deposits"
          element={
            <ProtectedRoute allowedRoles={['BRANCH_MANAGER']}>
              <ManagerCashDeposits />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/approvals"
          element={
            <ProtectedRoute allowedRoles={['BRANCH_MANAGER']}>
              <ManagerApprovals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/loans"
          element={
            <ProtectedRoute allowedRoles={['BRANCH_MANAGER']}>
              <ManagerLoans />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/employees"
          element={
            <ProtectedRoute allowedRoles={['BRANCH_MANAGER']}>
              <ManagerEmployees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['BRANCH_MANAGER']}>
              <ManagerAuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/reports"
          element={
            <ProtectedRoute allowedRoles={['BRANCH_MANAGER']}>
              <ManagerReports />
            </ProtectedRoute>
          }
        />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
