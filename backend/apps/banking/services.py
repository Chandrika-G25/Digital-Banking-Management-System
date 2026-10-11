import uuid
from decimal import Decimal
from django.db import transaction
from django.db.models import Q, Sum, Count
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.banking.models import (
    Account, Transaction, LedgerEntry, IdempotencyRecord,
    BranchCashDeposit, BranchDepositLimit
)
from apps.accounts.models import CustomerProfile, User
from apps.audit.models import log_audit_event
from apps.notifications.services import (
    send_notification_to_user,
    send_balance_update_to_user,
    broadcast_branch_manager_alert
)

class TransferService:
    @staticmethod
    def generate_reference():
        today_str = timezone.now().strftime('%Y%m%d')
        unique_suffix = uuid.uuid4().hex[:8].upper()
        return f"TXN-{today_str}-{unique_suffix}"

    @classmethod
    def execute_internal_transfer(
        cls,
        user,
        sender_account_id,
        receiver_account_number,
        amount_val,
        description="Internal transfer",
        idempotency_key=None,
        ip_address=''
    ):
        """
        Executes a double-entry internal money transfer between accounts with atomic locking,
        idempotency check, ledger creation, and real-time WebSocket alerts.
        """
        # 1. Parse and validate amount using Decimal
        try:
            amount = Decimal(str(amount_val)).quantize(Decimal('0.01'))
        except Exception:
            raise ValidationError({'amount': 'Invalid monetary amount specified.'})

        if amount <= Decimal('0.00'):
            raise ValidationError({'amount': 'Transfer amount must be greater than zero.'})

        # Min and max limits for demo
        if amount > Decimal('50000.00'):
            raise ValidationError({'amount': 'Exceeds single transaction limit of $50,000.00.'})

        # 2. Check Idempotency Key if provided
        if idempotency_key:
            existing_record = IdempotencyRecord.objects.filter(key=idempotency_key).first()
            if existing_record:
                return existing_record.response_data, False # (result, created)

        # 3. Atomic transaction with row locking (select_for_update)
        with transaction.atomic():
            # Lock sender account
            try:
                sender_account = Account.objects.select_for_update().get(
                    id=sender_account_id,
                    customer__user=user
                )
            except Account.DoesNotExist:
                raise ValidationError({'from_account': 'Source account not found or does not belong to you.'})

            if sender_account.status != Account.STATUS_ACTIVE:
                raise ValidationError({'from_account': f'Source account is currently {sender_account.status}. Account verification is required before initiating transfers.'})

            if sender_account.customer.verification_status != 'VERIFIED':
                raise PermissionDenied('Customer account is awaiting staff verification. Outgoing transfers are restricted.')

            # Lock receiver account
            try:
                receiver_account = Account.objects.select_for_update().get(
                    account_number=receiver_account_number
                )
            except Account.DoesNotExist:
                raise ValidationError({'to_account': 'Beneficiary / recipient account number does not exist.'})

            if receiver_account.status != Account.STATUS_ACTIVE:
                raise ValidationError({'to_account': f'Recipient account is currently {receiver_account.status}.'})

            if receiver_account.customer.verification_status != 'VERIFIED':
                raise ValidationError({'to_account': 'Recipient customer account is pending verification and cannot receive transfers.'})

            if sender_account.id == receiver_account.id:
                raise ValidationError({'to_account': 'Source and recipient accounts cannot be the same.'})

            # Check sufficient funds
            if sender_account.balance < amount:
                raise ValidationError({
                    'amount': f'Insufficient available funds. Current balance is ${sender_account.balance}.'
                })

            # Debit sender
            sender_account.balance = (sender_account.balance - amount).quantize(Decimal('0.01'))
            sender_account.save(update_fields=['balance'])

            # Credit receiver
            receiver_account.balance = (receiver_account.balance + amount).quantize(Decimal('0.01'))
            receiver_account.save(update_fields=['balance'])

            # Create Transaction record
            ref_num = cls.generate_reference()
            txn = Transaction.objects.create(
                reference_number=ref_num,
                from_account=sender_account,
                to_account=receiver_account,
                amount=amount,
                transaction_type=Transaction.TXN_TRANSFER,
                status=Transaction.STATUS_COMPLETED,
                description=description
            )

            # Create Double-Entry Ledger records
            # 1. Debit entry for sender
            LedgerEntry.objects.create(
                transaction=txn,
                account=sender_account,
                entry_type=LedgerEntry.ENTRY_DEBIT,
                amount=amount,
                balance_after=sender_account.balance
            )

            # 2. Credit entry for receiver
            LedgerEntry.objects.create(
                transaction=txn,
                account=receiver_account,
                entry_type=LedgerEntry.ENTRY_CREDIT,
                amount=amount,
                balance_after=receiver_account.balance
            )

            # Audit log
            log_audit_event(
                actor=user,
                action='FUNDS_TRANSFER',
                target_model='Transaction',
                target_id=txn.reference_number,
                details=f"Transferred ${amount} from {sender_account.account_number} to {receiver_account.account_number}",
                branch=user.get_assigned_branch(),
                ip_address=ip_address
            )

            response_data = {
                'success': True,
                'reference_number': txn.reference_number,
                'amount': str(txn.amount),
                'from_account': sender_account.account_number,
                'from_account_masked': sender_account.masked_account_number,
                'to_account': receiver_account.account_number,
                'to_account_masked': receiver_account.masked_account_number,
                'recipient_name': receiver_account.customer.user.get_full_name() or receiver_account.customer.user.username,
                'status': txn.status,
                'timestamp': txn.timestamp.isoformat(),
                'sender_new_balance': str(sender_account.balance),
                'description': txn.description
            }

            # Save Idempotency record
            if idempotency_key:
                IdempotencyRecord.objects.create(
                    key=idempotency_key,
                    user=user,
                    response_data=response_data
                )

        # 4. Outside atomic block: Dispatch real-time WebSocket notifications & balance updates
        # Sender notification & balance update
        send_balance_update_to_user(
            user=user,
            account_number=sender_account.account_number,
            new_balance=sender_account.balance,
            currency=sender_account.currency
        )
        send_notification_to_user(
            user=user,
            title="Transfer Successful",
            message=f"You successfully sent ${amount} to {response_data['recipient_name']} (Ref: {ref_num})",
            notification_type='TRANSACTION',
            extra_data={'reference_number': ref_num}
        )

        # Recipient notification & balance update (if distinct customer)
        recipient_user = receiver_account.customer.user
        if recipient_user != user:
            send_balance_update_to_user(
                user=recipient_user,
                account_number=receiver_account.account_number,
                new_balance=receiver_account.balance,
                currency=receiver_account.currency
            )
            sender_name = user.get_full_name() or user.username
            send_notification_to_user(
                user=recipient_user,
                title="Funds Received",
                message=f"You received ${amount} from {sender_name} into account ending in {receiver_account.account_number[-4:]} (Ref: {ref_num})",
                notification_type='TRANSACTION',
                extra_data={'reference_number': ref_num}
            )

        # High-value transfer notification for branch manager monitoring (e.g. > $10,000)
        if amount >= Decimal('10000.00'):
            branch = user.get_assigned_branch()
            if branch:
                broadcast_branch_manager_alert(
                    branch_id=branch.id,
                    title="High-Value Transfer Activity",
                    message=f"Transfer of ${amount} completed by {user.username} (Ref: {ref_num})",
                    alert_type='HIGH_VALUE_TRANSFER'
                )

        return response_data, True


class CashDepositService:
    @staticmethod
    def generate_reference():
        today_str = timezone.now().strftime('%Y%m%d')
        unique_suffix = uuid.uuid4().hex[:8].upper()
        return f"DEP-{today_str}-{unique_suffix}"

    @classmethod
    def get_or_create_branch_limits(cls, branch):
        if not branch:
            return None
        limits, _ = BranchDepositLimit.objects.get_or_create(
            branch=branch,
            defaults={
                'max_single_deposit': Decimal('100000.00'),
                'requires_manager_approval_above': Decimal('50000.00'),
                'daily_branch_deposit_limit': Decimal('2000000.00')
            }
        )
        return limits

    @classmethod
    def search_eligible_customers(cls, employee_user, query):
        """
        Search customers eligible for branch counter deposit.
        Enforces branch-level scoping: an employee cannot access an unauthorized branch's accounts.
        """
        if not employee_user or not employee_user.is_authenticated:
            raise PermissionDenied("Authentication required.")
        if employee_user.role == User.ROLE_CUSTOMER:
            raise PermissionDenied("Customers are not permitted to access branch teller search.")

        query = (query or '').strip()
        if len(query) < 2:
            return []

        employee_branch = employee_user.get_assigned_branch()

        # Check if user specifically searched by an account number that belongs to another branch
        if employee_branch and not employee_user.is_superuser:
            other_branch_account = Account.objects.filter(
                account_number__iexact=query
            ).exclude(customer__branch=employee_branch).first()

            if other_branch_account:
                log_audit_event(
                    actor=employee_user,
                    action='UNAUTHORIZED_BRANCH_SEARCH_ATTEMPT',
                    target_model='Account',
                    target_id=other_branch_account.account_number,
                    details=f"Employee {employee_user.username} tried searching account of branch {other_branch_account.customer.branch.code if other_branch_account.customer.branch else 'Unknown'}",
                    branch=employee_branch
                )
                raise PermissionDenied("Unauthorized branch access: This account belongs to another branch and is inaccessible from your terminal.")

        # Search eligible customers
        qs = CustomerProfile.objects.select_related('user', 'branch').prefetch_related('accounts')
        if employee_branch and not employee_user.is_superuser:
            qs = qs.filter(branch=employee_branch)

        qs = qs.filter(
            Q(customer_id__icontains=query) |
            Q(user__username__icontains=query) |
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query) |
            Q(user__phone__icontains=query) |
            Q(accounts__account_number__icontains=query)
        ).distinct()

        results = []
        for cust in qs[:10]:
            accounts_data = []
            for acc in cust.accounts.all():
                accounts_data.append({
                    'id': acc.id,
                    'account_number': acc.account_number,
                    'masked_account_number': acc.masked_account_number,
                    'account_type': acc.account_type,
                    'account_type_display': acc.get_account_type_display(),
                    'balance': str(acc.balance),
                    'balance_formatted': f"₹{acc.balance:,.2f}",
                    'currency': acc.currency,
                    'status': acc.status,
                    'is_eligible': acc.status == Account.STATUS_ACTIVE
                })

            results.append({
                'customer_id': cust.customer_id,
                'full_name': cust.user.get_full_name() or cust.user.username,
                'phone': cust.user.phone,
                'email': cust.user.email,
                'kyc_status': cust.kyc_status,
                'kyc_status_display': cust.get_kyc_status_display(),
                'branch': {
                    'id': cust.branch.id if cust.branch else None,
                    'name': cust.branch.name if cust.branch else 'Unassigned',
                    'code': cust.branch.code if cust.branch else 'NONE',
                    'city': cust.branch.city if cust.branch else ''
                },
                'accounts': accounts_data
            })

        return results

    @classmethod
    def process_cash_deposit(
        cls,
        employee_user,
        account_id,
        amount_val,
        depositor_name='',
        depositor_phone='',
        remarks='',
        verification_confirmed=False,
        idempotency_key=None,
        ip_address=''
    ):
        """
        Executes a counter cash deposit with atomic locking, double-entry ledger credit,
        idempotency validation, and real-time customer WebSocket updates.
        """
        # 1. Validate employee role
        if not employee_user or not employee_user.is_authenticated:
            raise PermissionDenied("Authentication required.")
        if employee_user.role == User.ROLE_CUSTOMER:
            raise PermissionDenied("Customers are strictly prohibited from depositing money via teller endpoints.")
        if employee_user.role not in [User.ROLE_EMPLOYEE, User.ROLE_BRANCH_MANAGER] and not employee_user.is_superuser:
            raise PermissionDenied("Only authorized branch employees or managers can process counter deposits.")

        # 2. Validate teller verification confirmation
        if not verification_confirmed:
            raise ValidationError({'verification': 'Customer identity and account ownership must be verified before proceeding.'})

        # 3. Validate and parse amount
        try:
            amount = Decimal(str(amount_val)).quantize(Decimal('0.01'))
        except Exception:
            raise ValidationError({'amount': 'Invalid monetary amount specified.'})

        if amount <= Decimal('0.00'):
            raise ValidationError({'amount': 'Deposit amount must be strictly greater than zero.'})

        # 4. Check Idempotency key if supplied
        if idempotency_key:
            existing_record = IdempotencyRecord.objects.filter(key=idempotency_key).first()
            if existing_record:
                return existing_record.response_data, False

            existing_dep = BranchCashDeposit.objects.filter(idempotency_key=idempotency_key).first()
            if existing_dep:
                return {
                    'success': True,
                    'reference_number': existing_dep.reference_number,
                    'status': existing_dep.status,
                    'amount': str(existing_dep.amount),
                    'message': 'Deposit was already processed (Idempotent response).'
                }, False

        employee_branch = employee_user.get_assigned_branch()

        # Pre-check target account and branch permission before locking
        try:
            target_acc = Account.objects.select_related('customer__branch').get(id=account_id)
        except Account.DoesNotExist:
            raise ValidationError({'account_id': 'Target customer account was not found.'})

        customer_branch = target_acc.customer.branch
        if employee_branch and not employee_user.is_superuser:
            if customer_branch and customer_branch.id != employee_branch.id:
                log_audit_event(
                    actor=employee_user,
                    action='UNAUTHORIZED_BRANCH_DEPOSIT_ATTEMPT',
                    target_model='Account',
                    target_id=target_acc.account_number,
                    details=f"Unauthorized branch deposit: Employee from {employee_branch.code} attempted deposit into account belonging to {customer_branch.code}",
                    branch=employee_branch,
                    ip_address=ip_address
                )
                raise PermissionDenied(f"Unauthorized branch access: You can only process deposits for accounts associated with your assigned branch ({employee_branch.name}).")

        # 5. Atomic database transaction with row locking
        with transaction.atomic():
            account = Account.objects.select_for_update().get(id=account_id)
            customer_profile = account.customer

            # Check account status eligibility
            if account.status != Account.STATUS_ACTIVE:
                raise ValidationError({'account_id': f'Account is currently {account.status} and cannot accept counter deposits.'})

            branch = customer_branch or employee_branch

            # 6. Configurable deposit limits check
            if branch:
                limits = cls.get_or_create_branch_limits(branch)
                if limits and amount > limits.max_single_deposit:
                    raise ValidationError({
                        'amount': f"Amount exceeds single counter deposit limit of ₹{limits.max_single_deposit:,.2f} for branch {branch.code}."
                    })

            # 7. Update account balance consistently
            new_balance = (account.balance + amount).quantize(Decimal('0.01'))
            account.balance = new_balance
            account.save(update_fields=['balance'])

            # 8. Generate unique transaction reference
            ref_num = cls.generate_reference()
            customer_name = customer_profile.user.get_full_name() or customer_profile.user.username
            desc_depositor = depositor_name.strip() if depositor_name else customer_name
            description = f"Counter Cash Deposit at {branch.name if branch else 'SecureBank'} - Depositor: {desc_depositor}"

            # 9. Record Credit Transaction
            txn = Transaction.objects.create(
                reference_number=ref_num,
                from_account=None,
                to_account=account,
                amount=amount,
                transaction_type=Transaction.TXN_CASH_DEPOSIT,
                status=Transaction.STATUS_COMPLETED,
                description=description
            )

            # 10. Record immutable Credit Ledger Entry
            LedgerEntry.objects.create(
                transaction=txn,
                account=account,
                entry_type=LedgerEntry.ENTRY_CREDIT,
                amount=amount,
                balance_after=new_balance
            )

            # 11. Record BranchCashDeposit
            cash_dep = BranchCashDeposit.objects.create(
                reference_number=ref_num,
                transaction=txn,
                customer=customer_profile,
                account=account,
                employee=employee_user,
                branch=branch,
                amount=amount,
                depositor_name=desc_depositor,
                depositor_phone=depositor_phone.strip(),
                remarks=remarks.strip() or 'Branch counter cash deposit',
                status=BranchCashDeposit.STATUS_COMPLETED,
                idempotency_key=idempotency_key
            )

            # 12. Create immutable audit log
            log_audit_event(
                actor=employee_user,
                action='BRANCH_CASH_DEPOSIT',
                target_model='BranchCashDeposit',
                target_id=ref_num,
                details=f"Deposited ₹{amount} into account {account.account_number} (Customer {customer_profile.customer_id}). Depositor: {desc_depositor}",
                branch=branch,
                ip_address=ip_address
            )

            teller_id = getattr(getattr(employee_user, 'employee_profile', None), 'employee_id', employee_user.username)

            response_data = {
                'success': True,
                'reference_number': ref_num,
                'amount': str(amount),
                'amount_formatted': f"₹{amount:,.2f}",
                'account_id': account.id,
                'account_number': account.account_number,
                'account_number_masked': account.masked_account_number,
                'account_type': account.get_account_type_display(),
                'customer_id': customer_profile.customer_id,
                'customer_name': customer_name,
                'customer_phone': customer_profile.user.phone,
                'depositor_name': desc_depositor,
                'remarks': cash_dep.remarks,
                'new_balance': str(new_balance),
                'new_balance_formatted': f"₹{new_balance:,.2f}",
                'currency': 'INR',
                'status': 'Completed',
                'branch': {
                    'id': branch.id if branch else None,
                    'name': branch.name if branch else 'Main Branch',
                    'code': branch.code if branch else 'SB-001',
                    'city': branch.city if branch else 'Metro'
                },
                'teller': {
                    'employee_id': teller_id,
                    'name': employee_user.get_full_name() or employee_user.username,
                    'teller_reference': f"Teller {teller_id} ({branch.name if branch else 'Branch'})"
                },
                'timestamp': txn.timestamp.isoformat(),
                'formatted_date': txn.timestamp.strftime('%d %b %Y, %I:%M %p')
            }

            if idempotency_key:
                IdempotencyRecord.objects.create(
                    key=idempotency_key,
                    user=employee_user,
                    response_data=response_data
                )

        # 13. Outside atomic transaction: Dispatch WebSocket notifications
        # Send instant balance update to customer
        send_balance_update_to_user(
            user=customer_profile.user,
            account_number=account.account_number,
            new_balance=new_balance,
            currency='INR'
        )

        # Send instant notification to customer with real database values
        last_four = account.account_number[-4:] if len(account.account_number) >= 4 else account.account_number
        send_notification_to_user(
            user=customer_profile.user,
            title="Cash Deposit Successful",
            message=f"Cash deposit successful. ₹{amount:,.2f} has been credited to your account ending in {last_four}. Reference: {ref_num}.",
            notification_type='TRANSACTION',
            extra_data={
                'reference_number': ref_num,
                'account_number': account.account_number,
                'amount': str(amount),
                'branch_name': branch.name if branch else 'SecureBank'
            }
        )

        # If high-value deposit (e.g. >= ₹50,000), notify branch managers in real time
        if branch:
            limits = cls.get_or_create_branch_limits(branch)
            threshold = limits.requires_manager_approval_above if limits else Decimal('50000.00')
            if amount >= threshold:
                broadcast_branch_manager_alert(
                    branch_id=branch.id,
                    title="High-Value Cash Deposit Alert",
                    message=f"Cash deposit of ₹{amount:,.2f} completed at counter by Teller {teller_id} for account {account.masked_account_number} (Ref: {ref_num}).",
                    alert_type='HIGH_VALUE_DEPOSIT',
                    extra_data={'reference_number': ref_num, 'amount': str(amount)}
                )

        return response_data, True

    @classmethod
    def get_deposit_history(cls, employee_user, query_params):
        """
        Retrieves branch cash deposits scoped to employee's assigned branch.
        """
        if not employee_user or not employee_user.is_authenticated:
            raise PermissionDenied("Authentication required.")
        if employee_user.role == User.ROLE_CUSTOMER:
            raise PermissionDenied("Customers cannot access employee deposit history.")

        qs = BranchCashDeposit.objects.select_related(
            'customer__user', 'account', 'branch', 'employee', 'transaction'
        )

        employee_branch = employee_user.get_assigned_branch()
        if employee_branch and not employee_user.is_superuser:
            qs = qs.filter(branch=employee_branch)

        # Filters
        search = query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(reference_number__icontains=search) |
                Q(customer__customer_id__icontains=search) |
                Q(account__account_number__icontains=search) |
                Q(depositor_name__icontains=search)
            )

        status_filter = query_params.get('status', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)

        branch_id = query_params.get('branch_id')
        if branch_id and employee_user.is_superuser:
            qs = qs.filter(branch_id=branch_id)

        from_date = query_params.get('from_date')
        if from_date:
            qs = qs.filter(created_at__date__gte=from_date)

        to_date = query_params.get('to_date')
        if to_date:
            qs = qs.filter(created_at__date__lte=to_date)

        teller = query_params.get('teller')
        if teller:
            qs = qs.filter(
                Q(employee__username__icontains=teller) |
                Q(employee__employee_profile__employee_id__icontains=teller)
            )

        return qs.order_by('-created_at')

    @classmethod
    def get_deposit_by_reference(cls, employee_user, reference_number):
        """
        Retrieves full details for a specific deposit receipt.
        """
        if not employee_user or not employee_user.is_authenticated:
            raise PermissionDenied("Authentication required.")

        dep = BranchCashDeposit.objects.select_related(
            'customer__user', 'account', 'branch', 'employee', 'transaction', 'reversed_by'
        ).filter(reference_number=reference_number).first()

        if not dep:
            return None

        # Check branch authorization
        employee_branch = employee_user.get_assigned_branch()
        if employee_user.role in [User.ROLE_EMPLOYEE, User.ROLE_BRANCH_MANAGER] and not employee_user.is_superuser:
            if employee_branch and dep.branch and dep.branch.id != employee_branch.id:
                raise PermissionDenied("Unauthorized branch access: You cannot view records belonging to another branch.")

        # If customer is requesting, must be the account owner
        if employee_user.role == User.ROLE_CUSTOMER:
            if dep.customer.user.id != employee_user.id:
                raise PermissionDenied("You can only view your own deposit records.")

        teller_id = getattr(getattr(dep.employee, 'employee_profile', None), 'employee_id', dep.employee.username if dep.employee else 'SYSTEM')

        return {
            'reference_number': dep.reference_number,
            'amount': str(dep.amount),
            'amount_formatted': f"₹{dep.amount:,.2f}",
            'account_number': dep.account.account_number,
            'account_number_masked': dep.account.masked_account_number,
            'account_type': dep.account.get_account_type_display(),
            'customer_id': dep.customer.customer_id,
            'customer_name': dep.customer.user.get_full_name() or dep.customer.user.username,
            'customer_phone': dep.customer.user.phone,
            'customer_email': dep.customer.user.email,
            'depositor_name': dep.depositor_name,
            'depositor_phone': dep.depositor_phone,
            'remarks': dep.remarks,
            'status': dep.status,
            'created_at': dep.created_at.isoformat(),
            'formatted_date': dep.created_at.strftime('%d %b %Y, %I:%M %p'),
            'branch': {
                'id': dep.branch.id if dep.branch else None,
                'name': dep.branch.name if dep.branch else 'SecureBank',
                'code': dep.branch.code if dep.branch else 'SB-001',
                'address': dep.branch.address if dep.branch else '',
                'city': dep.branch.city if dep.branch else '',
                'phone': dep.branch.phone if dep.branch else ''
            },
            'teller': {
                'employee_id': teller_id,
                'name': dep.employee.get_full_name() or dep.employee.username if dep.employee else 'System Teller',
                'teller_reference': f"Teller {teller_id} ({dep.branch.name if dep.branch else 'Branch'})"
            },
            'reversed_at': dep.reversed_at.isoformat() if dep.reversed_at else None,
            'reversed_by': dep.reversed_by.username if dep.reversed_by else None,
            'reversal_reason': dep.reversal_reason
        }

    @classmethod
    def get_manager_summary(cls, manager_user):
        """
        Calculates branch-level deposit summaries, daily totals, teller breakdowns,
        unusual deposit activity, and limits for the Manager Dashboard.
        """
        if not manager_user or not manager_user.is_authenticated:
            raise PermissionDenied("Authentication required.")
        if manager_user.role != User.ROLE_BRANCH_MANAGER and not manager_user.is_superuser:
            raise PermissionDenied("Access restricted to Branch Managers and Executives.")

        branch = manager_user.get_assigned_branch()
        qs = BranchCashDeposit.objects.select_related('customer__user', 'employee', 'account', 'branch')
        if branch and not manager_user.is_superuser:
            qs = qs.filter(branch=branch)

        today = timezone.now().date()
        today_deposits = qs.filter(created_at__date=today, status=BranchCashDeposit.STATUS_COMPLETED)

        today_amount = today_deposits.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        today_count = today_deposits.count()

        all_time_amount = qs.filter(status=BranchCashDeposit.STATUS_COMPLETED).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        all_time_count = qs.filter(status=BranchCashDeposit.STATUS_COMPLETED).count()

        # Employee / Teller breakdown
        teller_stats = qs.filter(status=BranchCashDeposit.STATUS_COMPLETED).values(
            'employee__username', 'employee__employee_profile__employee_id',
            'employee__first_name', 'employee__last_name'
        ).annotate(
            deposit_count=Count('id'),
            total_amount=Sum('amount')
        ).order_by('-total_amount')

        employee_breakdown = []
        for stat in teller_stats:
            emp_id = stat['employee__employee_profile__employee_id'] or stat['employee__username'] or 'Unknown'
            name = f"{stat['employee__first_name']} {stat['employee__last_name']}".strip() or stat['employee__username'] or 'Teller'
            employee_breakdown.append({
                'employee_id': emp_id,
                'name': name,
                'username': stat['employee__username'],
                'count': stat['deposit_count'],
                'total_amount': str(stat['total_amount']),
                'total_formatted': f"₹{stat['total_amount']:,.2f}"
            })

        # Recent 10 deposits
        recent = []
        for dep in qs[:10]:
            recent.append({
                'reference_number': dep.reference_number,
                'amount': str(dep.amount),
                'amount_formatted': f"₹{dep.amount:,.2f}",
                'account_number_masked': dep.account.masked_account_number,
                'customer_name': dep.customer.user.get_full_name() or dep.customer.user.username,
                'customer_id': dep.customer.customer_id,
                'depositor_name': dep.depositor_name,
                'status': dep.status,
                'teller_id': getattr(getattr(dep.employee, 'employee_profile', None), 'employee_id', dep.employee.username if dep.employee else 'N/A'),
                'created_at': dep.created_at.strftime('%d %b %Y, %I:%M %p')
            })

        # Unusual activity requiring review:
        # e.g. deposits >= ₹50,000, or multiple deposits for same account today
        limits = cls.get_or_create_branch_limits(branch) if branch else None
        threshold = limits.requires_manager_approval_above if limits else Decimal('50000.00')

        unusual_deposits = qs.filter(amount__gte=threshold)[:5]
        unusual_activity = []
        for un in unusual_deposits:
            unusual_activity.append({
                'reference_number': un.reference_number,
                'amount_formatted': f"₹{un.amount:,.2f}",
                'account_number_masked': un.account.masked_account_number,
                'customer_id': un.customer.customer_id,
                'teller_id': getattr(getattr(un.employee, 'employee_profile', None), 'employee_id', un.employee.username if un.employee else 'N/A'),
                'created_at': un.created_at.strftime('%d %b %Y, %I:%M %p'),
                'reason': f"High-value counter deposit exceeding review threshold (₹{threshold:,.2f})"
            })

        return {
            'branch': {
                'id': branch.id if branch else None,
                'name': branch.name if branch else 'All Branches Overview',
                'code': branch.code if branch else 'ALL',
                'city': branch.city if branch else ''
            },
            'today': {
                'total_amount': str(today_amount),
                'total_formatted': f"₹{today_amount:,.2f}",
                'total_count': today_count
            },
            'all_time': {
                'total_amount': str(all_time_amount),
                'total_formatted': f"₹{all_time_amount:,.2f}",
                'total_count': all_time_count
            },
            'limits': {
                'max_single_deposit': str(limits.max_single_deposit) if limits else '100000.00',
                'max_single_formatted': f"₹{limits.max_single_deposit:,.2f}" if limits else '₹100,000.00',
                'requires_approval_above': str(limits.requires_manager_approval_above) if limits else '50000.00',
                'requires_approval_formatted': f"₹{limits.requires_manager_approval_above:,.2f}" if limits else '₹50,000.00',
                'daily_branch_limit': str(limits.daily_branch_deposit_limit) if limits else '2000000.00',
                'daily_branch_formatted': f"₹{limits.daily_branch_deposit_limit:,.2f}" if limits else '₹2,000,000.00'
            },
            'employee_breakdown': employee_breakdown,
            'recent_deposits': recent,
            'unusual_activity': unusual_activity
        }

    @classmethod
    def reverse_cash_deposit(cls, manager_user, reference_number, reason, ip_address=''):
        """
        Executes a manager-authorized reversal of a counter cash deposit.
        Maintains immutable ledger integrity by posting an offsetting debit entry.
        Never directly deletes or edits historical ledger entries.
        """
        if not manager_user or not manager_user.is_authenticated:
            raise PermissionDenied("Authentication required.")
        if manager_user.role != User.ROLE_BRANCH_MANAGER and not manager_user.is_superuser:
            raise PermissionDenied("Only Branch Managers are authorized to reverse completed cash deposits.")

        reason = (reason or '').strip()
        if not reason or len(reason) < 5:
            raise ValidationError({'reason': 'A comprehensive reason (minimum 5 characters) is required for deposit reversal.'})

        manager_branch = manager_user.get_assigned_branch()

        with transaction.atomic():
            dep = BranchCashDeposit.objects.select_for_update().filter(reference_number=reference_number).first()
            if not dep:
                raise ValidationError({'reference_number': 'Deposit record not found.'})

            if dep.status == BranchCashDeposit.STATUS_REVERSED:
                raise ValidationError({'status': 'This deposit has already been reversed.'})

            if manager_branch and not manager_user.is_superuser:
                if dep.branch and dep.branch.id != manager_branch.id:
                    raise PermissionDenied("Unauthorized branch: You can only reverse deposits processed at your assigned branch.")

            # Lock account
            account = Account.objects.select_for_update().get(id=dep.account_id)
            if account.balance < dep.amount:
                raise ValidationError({
                    'balance': f"Cannot reverse deposit: Account available balance (₹{account.balance:,.2f}) is lower than deposit amount (₹{dep.amount:,.2f})."
                })

            # Debit balance
            new_balance = (account.balance - dep.amount).quantize(Decimal('0.01'))
            account.balance = new_balance
            account.save(update_fields=['balance'])

            # Mark deposit reversed
            dep.status = BranchCashDeposit.STATUS_REVERSED
            dep.reversed_at = timezone.now()
            dep.reversed_by = manager_user
            dep.reversal_reason = reason
            dep.save(update_fields=['status', 'reversed_at', 'reversed_by', 'reversal_reason'])

            # Mark original transaction reversed
            if dep.transaction:
                dep.transaction.status = Transaction.STATUS_REVERSED
                dep.transaction.save(update_fields=['status'])

            # Post offsetting debit transaction & ledger entry
            rev_ref = f"REV-{dep.reference_number}"
            rev_txn = Transaction.objects.create(
                reference_number=rev_ref,
                from_account=account,
                to_account=None,
                amount=dep.amount,
                transaction_type=Transaction.TXN_WITHDRAWAL,
                status=Transaction.STATUS_COMPLETED,
                description=f"Authorized Reversal of {dep.reference_number} - Reason: {reason}"
            )

            LedgerEntry.objects.create(
                transaction=rev_txn,
                account=account,
                entry_type=LedgerEntry.ENTRY_DEBIT,
                amount=dep.amount,
                balance_after=new_balance
            )

            # Audit log
            log_audit_event(
                actor=manager_user,
                action='BRANCH_CASH_DEPOSIT_REVERSED',
                target_model='BranchCashDeposit',
                target_id=dep.reference_number,
                details=f"Reversed cash deposit of ₹{dep.amount} on account {account.account_number}. Reason: {reason}",
                branch=dep.branch,
                ip_address=ip_address
            )

        # Notify customer
        send_balance_update_to_user(
            user=dep.customer.user,
            account_number=account.account_number,
            new_balance=new_balance,
            currency='INR'
        )
        last_four = account.account_number[-4:] if len(account.account_number) >= 4 else account.account_number
        send_notification_to_user(
            user=dep.customer.user,
            title="Cash Deposit Reversed",
            message=f"Cash deposit reversal of ₹{dep.amount:,.2f} applied to account ending in {last_four}. Reason: {reason}. Reference: {dep.reference_number}.",
            notification_type='TRANSACTION',
            extra_data={'reference_number': dep.reference_number, 'amount': str(dep.amount)}
        )

        return {
            'success': True,
            'reference_number': dep.reference_number,
            'status': dep.status,
            'reversal_reference': rev_ref,
            'amount_reversed': str(dep.amount),
            'new_balance': str(new_balance),
            'reason': reason,
            'reversed_at': dep.reversed_at.isoformat()
        }

