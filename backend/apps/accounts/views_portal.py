from decimal import Decimal
import random
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count, Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsEmployee, IsBranchManager, IsStaffMember
from apps.accounts.models import User, Branch, CustomerProfile, EmployeeProfile
from apps.accounts.serializers import UserSerializer, CustomerProfileSerializer, EmployeeProfileSerializer
from apps.banking.models import Account, Transaction
from apps.banking.serializers import TransactionSerializer
from apps.approvals.models import KYCRecord, ServiceRequest, ApprovalRequest, LoanApplication
from apps.audit.models import AuditLog, log_audit_event

# ----------------- EMPLOYEE PORTAL VIEWS -----------------

class EmployeeDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        branch = request.user.get_assigned_branch()

        customers_qs = CustomerProfile.objects.all()
        kyc_qs = KYCRecord.objects.all()
        sr_qs = ServiceRequest.objects.all()
        txns_qs = Transaction.objects.all()

        if branch and not request.user.is_superuser:
            customers_qs = customers_qs.filter(branch=branch)
            kyc_qs = kyc_qs.filter(customer__branch=branch)
            sr_qs = sr_qs.filter(branch=branch)
            # Transactions where from_account or to_account belongs to a customer in branch
            txns_qs = txns_qs.filter(
                Q(from_account__customer__branch=branch) |
                Q(to_account__customer__branch=branch)
            )

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_txns_count = txns_qs.filter(timestamp__gte=today_start).count()
        pending_kyc_count = kyc_qs.filter(status=KYCRecord.STATUS_PENDING).count()
        pending_sr_count = sr_qs.filter(status=ServiceRequest.STATUS_OPEN).count()
        total_customers = customers_qs.count()

        # Recent activities (audit log items for this branch)
        recent_activity = AuditLog.objects.all()
        if branch and not request.user.is_superuser:
            recent_activity = recent_activity.filter(branch=branch)
        recent_activity = recent_activity.order_by('-timestamp')[:8]

        activity_data = [
            {
                'id': a.id,
                'action': a.action,
                'actor': a.actor.username if a.actor else 'System',
                'details': a.details,
                'timestamp': a.timestamp.isoformat()
            }
            for a in recent_activity
        ]

        return Response({
            'branch': {
                'id': branch.id if branch else None,
                'name': branch.name if branch else 'Headquarters',
                'code': branch.code if branch else 'HQ001'
            },
            'assigned_customer_count': total_customers,
            'pending_customer_requests': pending_sr_count,
            'pending_kyc_verifications': pending_kyc_count,
            'today_transaction_count': today_txns_count,
            'recent_activities': activity_data
        })

class EmployeeCustomerListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        branch = request.user.get_assigned_branch()
        customers = CustomerProfile.objects.select_related('user', 'branch').prefetch_related('accounts')

        if branch and not request.user.is_superuser:
            customers = customers.filter(branch=branch)

        search = request.query_params.get('search', '').strip()
        if search:
            customers = customers.filter(
                Q(customer_id__icontains=search) |
                Q(user__username__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(accounts__account_number__icontains=search)
            ).distinct()

        results = []
        for c in customers[:50]:
            accounts_summary = [
                {
                    'id': a.id,
                    'account_number_masked': a.masked_account_number,
                    'type': a.get_account_type_display(),
                    'balance': str(a.balance),
                    'status': a.status
                }
                for a in c.accounts.all()
            ]
            results.append({
                'id': c.id,
                'customer_id': c.customer_id,
                'name': c.user.get_full_name() or c.user.username,
                'email': c.user.email,
                'phone': c.user.phone,
                'kyc_status': c.kyc_status,
                'accounts': accounts_summary,
                'created_at': c.created_at.strftime('%Y-%m-%d')
            })

        return Response(results)

class EmployeeTransactionsView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        branch = request.user.get_assigned_branch()
        txns = Transaction.objects.select_related('from_account', 'to_account')

        if branch and not request.user.is_superuser:
            txns = txns.filter(
                Q(from_account__customer__branch=branch) |
                Q(to_account__customer__branch=branch)
            )

        search = request.query_params.get('search', '').strip()
        if search:
            txns = txns.filter(
                Q(reference_number__icontains=search) |
                Q(from_account__account_number__icontains=search) |
                Q(to_account__account_number__icontains=search) |
                Q(description__icontains=search)
            )

        limit = int(request.query_params.get('limit', 50))
        txns = txns.order_by('-timestamp')[:limit]

        return Response(TransactionSerializer(txns, many=True).data)

class EmployeeOnboardCustomerView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def post(self, request):
        branch = request.user.get_assigned_branch()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        email = request.data.get('email', '').strip()
        phone = request.data.get('phone', '').strip()
        address = request.data.get('address', '').strip()
        initial_deposit = Decimal(str(request.data.get('initial_deposit', '500.00')))

        if not all([first_name, last_name, email]):
            return Response({'error': 'First name, last_name, and email are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        username = f"{first_name.lower()}.{last_name.lower()}{random.randint(10, 99)}"
        password = "DemoPass123!" # Default demo pass

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=User.ROLE_CUSTOMER
        )

        customer_id = f"CUST{random.randint(1000, 9999)}"
        profile = CustomerProfile.objects.create(
            user=user,
            customer_id=customer_id,
            branch=branch,
            address=address,
            kyc_status=CustomerProfile.KYC_PENDING
        )

        acc_num = f"100{random.randint(100000000, 999999999)}"
        account = Account.objects.create(
            customer=profile,
            account_number=acc_num,
            account_type=Account.ACCOUNT_SAVINGS,
            balance=initial_deposit,
            currency='USD',
            status=Account.STATUS_ACTIVE
        )

        log_audit_event(
            actor=request.user,
            action='CUSTOMER_ONBOARDED',
            target_model='CustomerProfile',
            target_id=customer_id,
            details=f"Employee {request.user.username} onboarded customer {customer_id} ({username})",
            branch=branch
        )

        return Response({
            'success': True,
            'customer_id': customer_id,
            'username': username,
            'account_number': acc_num,
            'initial_balance': str(initial_deposit),
            'message': f"Customer onboarded successfully! Demo password is: {password}"
        }, status=status.HTTP_201_CREATED)

# ----------------- BRANCH MANAGER VIEWS -----------------

class ManagerDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request):
        branch = request.user.get_assigned_branch()

        customers_qs = CustomerProfile.objects.all()
        accounts_qs = Account.objects.all()
        loans_qs = LoanApplication.objects.all()
        approvals_qs = ApprovalRequest.objects.all()
        txns_qs = Transaction.objects.all()

        if branch and not request.user.is_superuser:
            customers_qs = customers_qs.filter(branch=branch)
            accounts_qs = accounts_qs.filter(customer__branch=branch)
            loans_qs = loans_qs.filter(branch=branch)
            approvals_qs = approvals_qs.filter(branch=branch)
            txns_qs = txns_qs.filter(
                Q(from_account__customer__branch=branch) |
                Q(to_account__customer__branch=branch)
            )

        total_customers = customers_qs.count()
        total_active_accounts = accounts_qs.filter(status=Account.STATUS_ACTIVE).count()
        pending_approvals = approvals_qs.filter(status=ApprovalRequest.STATUS_PENDING).count()
        pending_loans = loans_qs.filter(status=LoanApplication.STATUS_PENDING).count()

        # Transaction volume
        total_volume = txns_qs.filter(status=Transaction.STATUS_COMPLETED).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        # Last 7 days volume chart data
        now = timezone.now()
        chart_data = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
            day_vol = txns_qs.filter(
                timestamp__range=(day_start, day_end),
                status=Transaction.STATUS_COMPLETED
            ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
            chart_data.append({
                'date': day.strftime('%b %d'),
                'volume': float(day_vol)
            })

        return Response({
            'branch': {
                'id': branch.id if branch else None,
                'name': branch.name if branch else 'Headquarters',
                'code': branch.code if branch else 'HQ001',
                'city': branch.city if branch else 'Central'
            },
            'total_customers': total_customers,
            'total_active_accounts': total_active_accounts,
            'pending_approvals': pending_approvals,
            'pending_loans': pending_loans,
            'total_volume': str(total_volume),
            'chart_data': chart_data
        })

class ManagerEmployeeManagementView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request):
        branch = request.user.get_assigned_branch()
        employees = EmployeeProfile.objects.select_related('user', 'branch')
        if branch and not request.user.is_superuser:
            employees = employees.filter(branch=branch)

        data = []
        for ep in employees:
            data.append({
                'id': ep.id,
                'employee_id': ep.employee_id,
                'user_id': ep.user.id,
                'name': ep.user.get_full_name() or ep.user.username,
                'username': ep.user.username,
                'email': ep.user.email,
                'role': ep.user.role,
                'department': ep.department,
                'designation': ep.designation,
                'is_active': ep.user.is_active,
                'branch_name': ep.branch.name if ep.branch else ''
            })

        return Response(data)

    def post(self, request):
        """Update employee status or designation"""
        employee_id = request.data.get('employee_id')
        ep = EmployeeProfile.objects.filter(employee_id=employee_id).first()
        if not ep:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        branch = request.user.get_assigned_branch()
        if branch and not request.user.is_superuser and ep.branch != branch:
            return Response({'error': 'Unauthorized branch access.'}, status=status.HTTP_403_FORBIDDEN)

        if 'is_active' in request.data:
            ep.user.is_active = bool(request.data['is_active'])
            ep.user.save(update_fields=['is_active'])

        if 'designation' in request.data:
            ep.designation = request.data['designation']
            ep.save(update_fields=['designation'])

        log_audit_event(
            actor=request.user,
            action='EMPLOYEE_UPDATED',
            target_model='EmployeeProfile',
            target_id=ep.employee_id,
            details=f"Manager {request.user.username} updated employee {ep.employee_id}",
            branch=branch
        )

        return Response({'success': True, 'message': 'Employee updated successfully.'})

class ManagerReportsView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request):
        branch = request.user.get_assigned_branch()

        accounts = Account.objects.all()
        txns = Transaction.objects.all()
        loans = LoanApplication.objects.all()

        if branch and not request.user.is_superuser:
            accounts = accounts.filter(customer__branch=branch)
            txns = txns.filter(
                Q(from_account__customer__branch=branch) |
                Q(to_account__customer__branch=branch)
            )
            loans = loans.filter(branch=branch)

        total_deposits = accounts.aggregate(Sum('balance'))['balance__sum'] or Decimal('0.00')
        completed_txns = txns.filter(status=Transaction.STATUS_COMPLETED).count()
        approved_loans_val = loans.filter(status=LoanApplication.STATUS_APPROVED).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        return Response({
            'branch_name': branch.name if branch else 'Headquarters',
            'total_deposits_managed': str(total_deposits),
            'total_transactions_completed': completed_txns,
            'approved_loans_volume': str(approved_loans_val),
            'accounts_breakdown': {
                'savings': accounts.filter(account_type=Account.ACCOUNT_SAVINGS).count(),
                'current': accounts.filter(account_type=Account.ACCOUNT_CURRENT).count(),
                'fixed_deposit': accounts.filter(account_type=Account.ACCOUNT_FIXED_DEPOSIT).count()
            }
        })
