import csv
import random
from decimal import Decimal
from django.http import HttpResponse
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import (
    IsCustomer, IsEmployee, IsBranchManager, IsStaffMember, IsVerifiedCustomer
)
from apps.banking.models import Account, Beneficiary, Transaction, LedgerEntry, BillPayment
from apps.banking.serializers import (
    AccountSerializer, BeneficiarySerializer, TransactionSerializer,
    TransferRequestSerializer, BillPaymentSerializer, CreateAccountRequestSerializer
)
from apps.banking.services import TransferService
from apps.audit.models import log_audit_event
from apps.notifications.services import send_notification_to_user, send_balance_update_to_user

# ----------------- Customer Banking Views -----------------

class CustomerAccountsView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def get(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        accounts = Account.objects.filter(customer=profile)
        serializer = AccountSerializer(accounts, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Request a new account or fixed deposit"""
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not profile.is_verified():
            return Response({
                'error': 'Account verification required. Your account must be verified by bank staff before opening additional accounts.',
                'code': 'VERIFICATION_REQUIRED'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = CreateAccountRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        acc_type = serializer.validated_data['account_type']
        initial_deposit = serializer.validated_data['initial_deposit']

        acc_num = f"200{random.randint(100000000, 999999999)}"
        new_account = Account.objects.create(
            customer=profile,
            account_number=acc_num,
            account_type=acc_type,
            balance=initial_deposit,
            currency='USD',
            status=Account.STATUS_ACTIVE
        )

        log_audit_event(
            actor=request.user,
            action='ACCOUNT_CREATED',
            target_model='Account',
            target_id=new_account.account_number,
            details=f"Created new {acc_type} account with initial balance ${initial_deposit}",
            branch=profile.branch
        )

        send_notification_to_user(
            user=request.user,
            title="New Account Opened",
            message=f"Your new {new_account.get_account_type_display()} ({new_account.masked_account_number}) is ready.",
            notification_type='SYSTEM'
        )

        return Response(AccountSerializer(new_account).data, status=status.HTTP_201_CREATED)

class CustomerTransactionsView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def get(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        user_accounts = Account.objects.filter(customer=profile)
        txns = Transaction.objects.filter(
            Q(from_account__in=user_accounts) | Q(to_account__in=user_accounts)
        )

        # Filters
        query = request.query_params.get('search', '').strip()
        if query:
            txns = txns.filter(
                Q(reference_number__icontains=query) |
                Q(description__icontains=query)
            )

        txn_type = request.query_params.get('type')
        if txn_type:
            txns = txns.filter(transaction_type=txn_type)

        from_date = request.query_params.get('from_date')
        if from_date:
            txns = txns.filter(timestamp__date__gte=from_date)

        to_date = request.query_params.get('to_date')
        if to_date:
            txns = txns.filter(timestamp__date__lte=to_date)

        # Limit or Paginate
        limit = int(request.query_params.get('limit', 20))
        txns = txns.order_by('-timestamp')[:limit]

        serializer = TransactionSerializer(txns, many=True)
        return Response(serializer.data)

class CustomerBeneficiaryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsCustomer, IsVerifiedCustomer]
    serializer_class = BeneficiarySerializer

    def get_queryset(self):
        profile = getattr(self.request.user, 'customer_profile', None)
        if not profile:
            return Beneficiary.objects.none()
        return Beneficiary.objects.filter(customer=profile)

    def perform_create(self, serializer):
        profile = self.request.user.customer_profile
        serializer.save(customer=profile)

class TransferFundsView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer, IsVerifiedCustomer]

    def post(self, request):
        # Extract idempotency key from header or body
        idempotency_key = request.headers.get('Idempotency-Key') or request.data.get('idempotency_key')
        
        serializer = TransferRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        ip = request.META.get('REMOTE_ADDR', '')

        try:
            result, created = TransferService.execute_internal_transfer(
                user=request.user,
                sender_account_id=data['from_account_id'],
                receiver_account_number=data['to_account_number'].strip(),
                amount_val=data['amount'],
                description=data.get('description', 'Internal Transfer'),
                idempotency_key=idempotency_key,
                ip_address=ip
            )
            return Response(result, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PayBillView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer, IsVerifiedCustomer]

    def get(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response([])
        bills = BillPayment.objects.filter(customer=profile)
        return Response(BillPaymentSerializer(bills, many=True).data)

    def post(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        account_id = request.data.get('account_id')
        biller_name = request.data.get('biller_name')
        biller_category = request.data.get('biller_category')
        bill_reference = request.data.get('bill_reference')
        amount_val = request.data.get('amount')

        if not all([account_id, biller_name, biller_category, bill_reference, amount_val]):
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_val)).quantize(Decimal('0.01'))
            account = Account.objects.get(id=account_id, customer=profile, status=Account.STATUS_ACTIVE)
        except Exception:
            return Response({'error': 'Invalid account or amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if account.balance < amount:
            return Response({'error': f'Insufficient balance (${account.balance}).'}, status=status.HTTP_400_BAD_REQUEST)

        # Atomic debit
        account.balance = (account.balance - amount).quantize(Decimal('0.01'))
        account.save(update_fields=['balance'])

        ref = TransferService.generate_reference()
        txn = Transaction.objects.create(
            reference_number=ref,
            from_account=account,
            to_account=None,
            amount=amount,
            transaction_type=Transaction.TXN_BILL_PAYMENT,
            status=Transaction.STATUS_COMPLETED,
            description=f"Bill payment to {biller_name} ({bill_reference})"
        )

        LedgerEntry.objects.create(
            transaction=txn,
            account=account,
            entry_type=LedgerEntry.ENTRY_DEBIT,
            amount=amount,
            balance_after=account.balance
        )

        bill = BillPayment.objects.create(
            customer=profile,
            account=account,
            biller_name=biller_name,
            biller_category=biller_category,
            bill_reference=bill_reference,
            amount=amount,
            transaction=txn,
            status='PAID'
        )

        # Live WS update
        send_balance_update_to_user(request.user, account.account_number, account.balance, account.currency)
        send_notification_to_user(
            user=request.user,
            title="Bill Payment Successful",
            message=f"Paid ${amount} to {biller_name} (Ref: {ref})",
            notification_type='TRANSACTION'
        )

        return Response({
            'success': True,
            'reference_number': ref,
            'bill': BillPaymentSerializer(bill).data,
            'new_balance': str(account.balance),
            'message': f"Payment of ${amount} to {biller_name} completed."
        }, status=status.HTTP_201_CREATED)

class DownloadStatementCSVView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def get(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        account_id = request.query_params.get('account_id')

        account = Account.objects.filter(customer=profile, id=account_id).first()
        if not account:
            account = Account.objects.filter(customer=profile).first()

        if not account:
            return Response({'error': 'No account available for statement.'}, status=status.HTTP_404_NOT_FOUND)

        txns = Transaction.objects.filter(
            Q(from_account=account) | Q(to_account=account)
        ).order_by('-timestamp')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="SecureBank_Statement_{account.account_number}.csv"'

        writer = csv.writer(response)
        writer.writerow(['SecureBank Account Statement'])
        writer.writerow(['Account Number', account.masked_account_number])
        writer.writerow(['Account Type', account.get_account_type_display()])
        writer.writerow(['Current Balance', f"{account.currency} {account.balance}"])
        writer.writerow(['Generated At', timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')])
        writer.writerow([])
        writer.writerow(['Reference Number', 'Date & Time', 'Type', 'Description', 'Debit/Credit', 'Amount', 'Status'])

        for t in txns:
            is_debit = (t.from_account_id == account.id)
            direction = f"-{t.amount}" if is_debit else f"+{t.amount}"
            writer.writerow([
                t.reference_number,
                t.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                t.get_transaction_type_display(),
                t.description,
                'DEBIT' if is_debit else 'CREDIT',
                direction,
                t.status
            ])

        return response

class CustomerDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def get(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        accounts = Account.objects.filter(customer=profile)
        total_balance = sum([a.balance for a in accounts], Decimal('0.00'))

        savings_account = accounts.filter(account_type=Account.ACCOUNT_SAVINGS).first()
        current_account = accounts.filter(account_type=Account.ACCOUNT_CURRENT).first()

        # Recent transactions
        recent_txns = Transaction.objects.filter(
            Q(from_account__in=accounts) | Q(to_account__in=accounts)
        ).order_by('-timestamp')[:5]

        # Calculate income vs expenses for sample monthly chart
        income = Transaction.objects.filter(
            to_account__in=accounts,
            status=Transaction.STATUS_COMPLETED
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        expenses = Transaction.objects.filter(
            from_account__in=accounts,
            status=Transaction.STATUS_COMPLETED
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        is_verified = (profile.verification_status == CustomerProfile.VERIFICATION_VERIFIED)
        verification_message = None
        if not is_verified:
            verification_message = "Your account is awaiting verification by our bank staff. You will be notified once the verification process is complete."

        return Response({
            'total_balance': str(total_balance),
            'currency': 'USD',
            'is_verified': is_verified,
            'verification_status': profile.verification_status,
            'verification_message': verification_message,
            'accounts': AccountSerializer(accounts, many=True).data,
            'savings_account': AccountSerializer(savings_account).data if savings_account else None,
            'current_account': AccountSerializer(current_account).data if current_account else None,
            'recent_transactions': TransactionSerializer(recent_txns, many=True).data,
            'financial_summary': {
                'total_income': str(income),
                'total_expenses': str(expenses),
                'net_savings': str(income - expenses),
            }
        })
