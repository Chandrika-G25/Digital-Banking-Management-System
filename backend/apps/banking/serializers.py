from rest_framework import serializers
from decimal import Decimal
from apps.banking.models import Account, Beneficiary, Transaction, LedgerEntry, BillPayment

class AccountSerializer(serializers.ModelSerializer):
    masked_account_number = serializers.ReadOnlyField()

    class Meta:
        model = Account
        fields = [
            'id', 'account_number', 'masked_account_number',
            'account_type', 'balance', 'currency', 'status', 'created_at'
        ]

class BeneficiarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Beneficiary
        fields = ['id', 'name', 'account_number', 'bank_name', 'nickname', 'created_at']

class TransactionSerializer(serializers.ModelSerializer):
    from_account_number = serializers.SerializerMethodField()
    from_account_masked = serializers.SerializerMethodField()
    to_account_number = serializers.SerializerMethodField()
    to_account_masked = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id', 'reference_number', 'from_account', 'from_account_number', 'from_account_masked',
            'to_account', 'to_account_number', 'to_account_masked',
            'amount', 'transaction_type', 'status', 'description', 'timestamp'
        ]

    def get_from_account_number(self, obj):
        return obj.from_account.account_number if obj.from_account else "External / Cash"

    def get_from_account_masked(self, obj):
        return obj.from_account.masked_account_number if obj.from_account else "External"

    def get_to_account_number(self, obj):
        return obj.to_account.account_number if obj.to_account else "External Biller"

    def get_to_account_masked(self, obj):
        return obj.to_account.masked_account_number if obj.to_account else "Biller / External"

class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = ['id', 'entry_type', 'amount', 'balance_after', 'timestamp']

class TransferRequestSerializer(serializers.Serializer):
    from_account_id = serializers.IntegerField(required=True)
    to_account_number = serializers.CharField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'), required=True)
    description = serializers.CharField(max_length=255, required=False, default='Transfer')
    idempotency_key = serializers.CharField(max_length=100, required=False, allow_blank=True)

class BillPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillPayment
        fields = [
            'id', 'account', 'biller_name', 'biller_category',
            'bill_reference', 'amount', 'status', 'paid_at'
        ]
        read_only_fields = ['status', 'paid_at']

class CreateAccountRequestSerializer(serializers.Serializer):
    account_type = serializers.ChoiceField(choices=[Account.ACCOUNT_SAVINGS, Account.ACCOUNT_CURRENT, Account.ACCOUNT_FIXED_DEPOSIT])
    initial_deposit = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'), default=Decimal('0.00'))


class CashDepositRequestSerializer(serializers.Serializer):
    account_id = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'), required=True)
    depositor_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    depositor_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    remarks = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    verification_confirmed = serializers.BooleanField(required=True)
    idempotency_key = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')


class BranchCashDepositSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    reference_number = serializers.CharField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    amount_formatted = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()
    account_number_masked = serializers.SerializerMethodField()
    account_type = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    depositor_name = serializers.CharField()
    remarks = serializers.CharField()
    status = serializers.CharField()
    teller_id = serializers.SerializerMethodField()
    teller_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    branch_code = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    formatted_date = serializers.SerializerMethodField()
    reversed_at = serializers.DateTimeField(allow_null=True)
    reversal_reason = serializers.CharField(allow_blank=True)

    def get_amount_formatted(self, obj):
        return f"₹{obj.amount:,.2f}"

    def get_account_number(self, obj):
        return obj.account.account_number if obj.account else ""

    def get_account_number_masked(self, obj):
        return obj.account.masked_account_number if obj.account else ""

    def get_account_type(self, obj):
        return obj.account.get_account_type_display() if obj.account else ""

    def get_customer_id(self, obj):
        return obj.customer.customer_id if obj.customer else ""

    def get_customer_name(self, obj):
        if not obj.customer or not obj.customer.user:
            return ""
        return obj.customer.user.get_full_name() or obj.customer.user.username

    def get_customer_phone(self, obj):
        return obj.customer.user.phone if obj.customer and obj.customer.user else ""

    def get_teller_id(self, obj):
        if not obj.employee:
            return "SYSTEM"
        return getattr(getattr(obj.employee, 'employee_profile', None), 'employee_id', obj.employee.username)

    def get_teller_name(self, obj):
        if not obj.employee:
            return "System Teller"
        return obj.employee.get_full_name() or obj.employee.username

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else "Main Branch"

    def get_branch_code(self, obj):
        return obj.branch.code if obj.branch else "SB-001"

    def get_formatted_date(self, obj):
        return obj.created_at.strftime('%d %b %Y, %I:%M %p')


class DepositReversalRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=5, max_length=500, required=True)

