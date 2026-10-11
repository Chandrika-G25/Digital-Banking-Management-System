from django.db import models
from django.conf import settings
from decimal import Decimal

class Account(models.Model):
    ACCOUNT_SAVINGS = 'SAVINGS'
    ACCOUNT_CURRENT = 'CURRENT'
    ACCOUNT_FIXED_DEPOSIT = 'FIXED_DEPOSIT'

    ACCOUNT_TYPE_CHOICES = [
        (ACCOUNT_SAVINGS, 'Savings Account'),
        (ACCOUNT_CURRENT, 'Current / Checking Account'),
        (ACCOUNT_FIXED_DEPOSIT, 'Fixed Deposit'),
    ]

    STATUS_PENDING_VERIFICATION = 'PENDING_VERIFICATION'
    STATUS_ACTIVE = 'ACTIVE'
    STATUS_FROZEN = 'FROZEN'
    STATUS_CLOSED = 'CLOSED'

    STATUS_CHOICES = [
        (STATUS_PENDING_VERIFICATION, 'Pending Verification'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_FROZEN, 'Frozen'),
        (STATUS_CLOSED, 'Closed'),
    ]

    account_number = models.CharField(max_length=20, unique=True, db_index=True)
    customer = models.ForeignKey(
        'accounts.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='accounts'
    )
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES, default=ACCOUNT_SAVINGS)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    currency = models.CharField(max_length=5, default='USD')
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default=STATUS_PENDING_VERIFICATION)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def masked_account_number(self):
        if not self.account_number:
            return ""
        return f"•••• •••• •••• {self.account_number[-4:]}"

    def __str__(self):
        return f"{self.get_account_type_display()} - {self.account_number} ({self.currency} {self.balance})"

class Beneficiary(models.Model):
    customer = models.ForeignKey(
        'accounts.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='beneficiaries'
    )
    name = models.CharField(max_length=150)
    account_number = models.CharField(max_length=30)
    bank_name = models.CharField(max_length=100, default='SecureBank')
    nickname = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('customer', 'account_number')

    def __str__(self):
        return f"{self.name} ({self.account_number})"

class Transaction(models.Model):
    TXN_TRANSFER = 'TRANSFER'
    TXN_BILL_PAYMENT = 'BILL_PAYMENT'
    TXN_DEPOSIT = 'DEPOSIT'
    TXN_CASH_DEPOSIT = 'CASH_DEPOSIT'
    TXN_WITHDRAWAL = 'WITHDRAWAL'
    TXN_LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT'

    TRANSACTION_TYPE_CHOICES = [
        (TXN_TRANSFER, 'Internal Transfer'),
        (TXN_BILL_PAYMENT, 'Bill Payment'),
        (TXN_DEPOSIT, 'Account Deposit'),
        (TXN_CASH_DEPOSIT, 'Cash Deposit'),
        (TXN_WITHDRAWAL, 'Account Withdrawal'),
        (TXN_LOAN_DISBURSEMENT, 'Loan Disbursement'),
    ]

    STATUS_PENDING = 'PENDING'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_FAILED = 'FAILED'
    STATUS_REVERSED = 'REVERSED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_REVERSED, 'Reversed'),
    ]

    reference_number = models.CharField(max_length=40, unique=True, db_index=True)
    from_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outgoing_transactions'
    )
    to_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incoming_transactions'
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    transaction_type = models.CharField(max_length=25, choices=TRANSACTION_TYPE_CHOICES, default=TXN_TRANSFER)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_COMPLETED)
    description = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.reference_number} - {self.transaction_type}: {self.amount} ({self.status})"

class LedgerEntry(models.Model):
    ENTRY_DEBIT = 'DEBIT'
    ENTRY_CREDIT = 'CREDIT'

    ENTRY_TYPE_CHOICES = [
        (ENTRY_DEBIT, 'Debit (-)'),
        (ENTRY_CREDIT, 'Credit (+)'),
    ]

    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name='ledger_entries'
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='ledger_entries'
    )
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.entry_type} {self.amount} on {self.account.account_number} (Bal: {self.balance_after})"

class BillPayment(models.Model):
    CATEGORY_ELECTRICITY = 'ELECTRICITY'
    CATEGORY_WATER = 'WATER'
    CATEGORY_INTERNET = 'INTERNET'
    CATEGORY_MOBILE = 'MOBILE'

    CATEGORY_CHOICES = [
        (CATEGORY_ELECTRICITY, 'Electricity Services'),
        (CATEGORY_WATER, 'Water & Sewage'),
        (CATEGORY_INTERNET, 'Broadband & Fiber'),
        (CATEGORY_MOBILE, 'Mobile Postpaid Network'),
    ]

    customer = models.ForeignKey(
        'accounts.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='bill_payments'
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='bill_payments'
    )
    biller_name = models.CharField(max_length=120)
    biller_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    bill_reference = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    status = models.CharField(max_length=20, default='PAID')
    paid_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-paid_at']

    def __str__(self):
        return f"{self.biller_name} ({self.bill_reference}) - ${self.amount}"

class IdempotencyRecord(models.Model):
    key = models.CharField(max_length=100, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='idempotency_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    response_data = models.JSONField(default=dict)

    def __str__(self):
        return f"IdempotencyKey: {self.key} by {self.user.username}"


class BranchDepositLimit(models.Model):
    branch = models.OneToOneField(
        'accounts.Branch',
        on_delete=models.CASCADE,
        related_name='deposit_limit_config'
    )
    max_single_deposit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('100000.00'),
        help_text="Maximum single counter cash deposit allowed"
    )
    requires_manager_approval_above = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('50000.00'),
        help_text="Threshold requiring Manager approval / review"
    )
    daily_branch_deposit_limit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('2000000.00'),
        help_text="Cumulative daily counter deposit volume limit for branch"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Deposit Limits for {self.branch.name} (Max: {self.max_single_deposit})"


class BranchCashDeposit(models.Model):
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_REVERSED = 'REVERSED'
    STATUS_PENDING = 'PENDING'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_REVERSED, 'Reversed'),
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    reference_number = models.CharField(max_length=40, unique=True, db_index=True)
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.CASCADE,
        related_name='cash_deposit_record',
        null=True,
        blank=True
    )
    customer = models.ForeignKey(
        'accounts.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='cash_deposits'
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='cash_deposits'
    )
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='processed_deposits'
    )
    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.CASCADE,
        related_name='cash_deposits'
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    depositor_name = models.CharField(
        max_length=150,
        blank=True,
        help_text="Name of third-party depositing on behalf of customer if applicable"
    )
    depositor_phone = models.CharField(max_length=30, blank=True)
    remarks = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default=STATUS_COMPLETED)
    idempotency_key = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # Reversal workflow
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reversed_cash_deposits'
    )
    reversal_reason = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference_number}: {self.amount} -> {self.account.account_number} ({self.status})"

