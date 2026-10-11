from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.accounts.views import (
    LoginView, LogoutView, MeView, ChangePasswordView,
    RegisterCustomerView, CustomerLoginView, SetPasswordView,
    PasswordResetRequestView, PasswordResetConfirmView,
    BranchListView
)
from apps.banking.views import (
    CustomerAccountsView, CustomerTransactionsView,
    CustomerBeneficiaryViewSet, TransferFundsView, PayBillView,
    DownloadStatementCSVView, CustomerDashboardSummaryView
)
from apps.approvals.views import (
    CustomerLoansView, CustomerKYCView, CustomerServiceRequestsView,
    EmployeeKYCView, EmployeeServiceRequestsView,
    ManagerLoansView, ManagerApprovalsView
)
from apps.accounts.views_portal import (
    EmployeeDashboardView, EmployeeCustomerListView,
    EmployeeTransactionsView, EmployeeOnboardCustomerView,
    ManagerDashboardView, ManagerEmployeeManagementView,
    ManagerReportsView
)
from apps.notifications.views import NotificationListView
from apps.audit.views import AuditLogListView
from apps.banking.views_deposit import (
    EmployeeCustomerSearchView,
    EmployeeCashDepositView,
    EmployeeDepositHistoryView,
    EmployeeDepositDetailView,
    ManagerDepositSummaryView,
    ManagerDepositReversalView
)
from apps.accounts.views_verification import (
    CustomerApplicationView, CustomerVerificationStatusView,
    CustomerDocumentUploadView, CustomerAdditionalInfoView,
    EmployeeCustomerVerificationListView, EmployeeCustomerVerificationDetailView,
    EmployeeApproveVerificationView, EmployeeRejectVerificationView,
    EmployeeRequestInformationView, SecureDocumentDownloadView
)

beneficiary_router = DefaultRouter()
beneficiary_router.register(r'beneficiaries', CustomerBeneficiaryViewSet, basename='beneficiary')

from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'healthy', 'service': 'SecureBank API', 'version': '1.0.0'})

api_v1_patterns = [
    # Health check endpoint
    path('health/', health_check, name='health-check'),

    # Auth endpoints
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/customer/login/', CustomerLoginView.as_view(), name='auth-customer-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/register/', RegisterCustomerView.as_view(), name='auth-register'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='auth-password-reset'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),
    path('auth/branches/', BranchListView.as_view(), name='auth-branches'),
    path('branches/', BranchListView.as_view(), name='branches-list'),

    # Customer endpoints
    path('customer/register/', RegisterCustomerView.as_view(), name='customer-register'),
    path('customer/set-password/', SetPasswordView.as_view(), name='customer-set-password'),
    path('customer/profile/', MeView.as_view(), name='customer-profile'),
    path('customer/dashboard-summary/', CustomerDashboardSummaryView.as_view(), name='customer-dashboard-summary'),
    path('customer/accounts/', CustomerAccountsView.as_view(), name='customer-accounts'),
    path('customer/transactions/', CustomerTransactionsView.as_view(), name='customer-transactions'),
    path('customer/', include(beneficiary_router.urls)),
    path('customer/transfers/', TransferFundsView.as_view(), name='customer-transfers'),
    path('customer/statements/', DownloadStatementCSVView.as_view(), name='customer-statements'),
    path('customer/bills/', PayBillView.as_view(), name='customer-bills'),
    path('customer/loans/', CustomerLoansView.as_view(), name='customer-loans'),
    path('customer/kyc/', CustomerKYCView.as_view(), name='customer-kyc'),
    path('customer/service-requests/', CustomerServiceRequestsView.as_view(), name='customer-service-requests'),
    path('customer/notifications/', NotificationListView.as_view(), name='customer-notifications'),

    # Customer Verification endpoints
    path('customer/applications/', CustomerApplicationView.as_view(), name='customer-applications'),
    path('customer/verification-status/', CustomerVerificationStatusView.as_view(), name='customer-verification-status'),
    path('customer/documents/', CustomerDocumentUploadView.as_view(), name='customer-documents'),
    path('customer/additional-information/', CustomerAdditionalInfoView.as_view(), name='customer-additional-info'),

    # Employee endpoints
    path('employee/dashboard/', EmployeeDashboardView.as_view(), name='employee-dashboard'),
    path('employee/customers/', EmployeeCustomerListView.as_view(), name='employee-customers'),
    path('employee/kyc/', EmployeeKYCView.as_view(), name='employee-kyc'),
    path('employee/service-requests/', EmployeeServiceRequestsView.as_view(), name='employee-service-requests'),
    path('employee/transactions/', EmployeeTransactionsView.as_view(), name='employee-transactions'),
    path('employee/onboard-customer/', EmployeeOnboardCustomerView.as_view(), name='employee-onboard-customer'),

    # Employee Customer Verification endpoints
    path('employee/customer-verification/', EmployeeCustomerVerificationListView.as_view(), name='employee-customer-verification'),
    path('employee/customer-verification/<str:applicationId>/', EmployeeCustomerVerificationDetailView.as_view(), name='employee-customer-verification-detail'),
    path('employee/customer-verification/<str:applicationId>/approve/', EmployeeApproveVerificationView.as_view(), name='employee-customer-verification-approve'),
    path('employee/customer-verification/<str:applicationId>/reject/', EmployeeRejectVerificationView.as_view(), name='employee-customer-verification-reject'),
    path('employee/customer-verification/<str:applicationId>/request-information/', EmployeeRequestInformationView.as_view(), name='employee-customer-verification-request-info'),
    path('employee/customer-verification/<str:applicationId>/documents/<int:docId>/', SecureDocumentDownloadView.as_view(), name='employee-customer-verification-doc-download'),

    # Counter Cash Deposit endpoints
    path('employee/deposits/customer-search/', EmployeeCustomerSearchView.as_view(), name='employee-deposit-customer-search'),
    path('employee/deposits/', EmployeeCashDepositView.as_view(), name='employee-deposits'),
    path('employee/deposits/history/', EmployeeDepositHistoryView.as_view(), name='employee-deposits-history-alias'),
    path('employee/deposits/<str:reference>/', EmployeeDepositDetailView.as_view(), name='employee-deposit-detail'),

    # Manager endpoints
    path('manager/dashboard/', ManagerDashboardView.as_view(), name='manager-dashboard'),
    path('manager/employees/', ManagerEmployeeManagementView.as_view(), name='manager-employees'),
    path('manager/approvals/', ManagerApprovalsView.as_view(), name='manager-approvals'),
    path('manager/loans/', ManagerLoansView.as_view(), name='manager-loans'),
    path('manager/reports/', ManagerReportsView.as_view(), name='manager-reports'),
    path('manager/audit-logs/', AuditLogListView.as_view(), name='manager-audit-logs'),

    # Manager Cash Deposit Monitoring & Reversals
    path('manager/deposits/summary/', ManagerDepositSummaryView.as_view(), name='manager-deposits-summary'),
    path('manager/deposits/<str:reference>/reverse/', ManagerDepositReversalView.as_view(), name='manager-deposits-reverse'),

    # General endpoints
    path('notifications/', NotificationListView.as_view(), name='notifications-list'),
]

def root_view(request):
    return JsonResponse({
        'name': 'SecureBank Digital Banking Management System API',
        'status': 'online',
        'version': '1.0.0',
        'health_check': '/api/v1/health/',
        'documentation': 'https://github.com/Chandrika-G25/Digital-Banking-Management-System'
    })

urlpatterns = [
    path('', root_view, name='api-root'),
    path('health/', health_check, name='top-health-check'),
    path('admin/', admin.site.urls),
    path('api/v1/', include(api_v1_patterns)),
]
