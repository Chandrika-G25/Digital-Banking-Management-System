from rest_framework import serializers
from apps.approvals.models import LoanApplication, KYCRecord, ServiceRequest, ApprovalRequest
from apps.accounts.serializers import BranchSerializer

class LoanApplicationSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    loan_type_display = serializers.CharField(source='get_loan_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = LoanApplication
        fields = [
            'id', 'customer', 'customer_name', 'customer_id',
            'branch', 'branch_name', 'loan_type', 'loan_type_display',
            'amount', 'term_months', 'purpose', 'status', 'status_display',
            'applied_at', 'reviewed_by', 'reviewed_at', 'notes'
        ]
        read_only_fields = ['status', 'applied_at', 'reviewed_by', 'reviewed_at', 'branch']

    def get_customer_name(self, obj):
        return obj.customer.user.get_full_name() or obj.customer.user.username

    def get_customer_id(self, obj):
        return obj.customer.customer_id

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else ""

class KYCRecordSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = KYCRecord
        fields = [
            'id', 'customer', 'customer_name', 'customer_id',
            'document_type', 'document_type_display',
            'document_number', 'document_file', 'status', 'status_display',
            'remarks', 'created_at', 'verified_by', 'verified_at'
        ]
        read_only_fields = ['status', 'created_at', 'verified_by', 'verified_at']

    def get_customer_name(self, obj):
        return obj.customer.user.get_full_name() or obj.customer.user.username

    def get_customer_id(self, obj):
        return obj.customer.customer_id

class ServiceRequestSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'customer', 'customer_name', 'customer_id',
            'branch', 'branch_name', 'request_type', 'request_type_display',
            'subject', 'description', 'status', 'status_display',
            'assigned_to', 'assigned_to_name', 'created_at', 'resolved_at'
        ]
        read_only_fields = ['created_at', 'resolved_at', 'branch']

    def get_customer_name(self, obj):
        return obj.customer.user.get_full_name() or obj.customer.user.username

    def get_customer_id(self, obj):
        return obj.customer.customer_id

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else ""

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.username if obj.assigned_to else "Unassigned"

class ApprovalRequestSerializer(serializers.ModelSerializer):
    initiated_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'branch', 'branch_name', 'request_type', 'request_type_display',
            'entity_id', 'details', 'initiated_by', 'initiated_by_name',
            'status', 'approved_by', 'approved_by_name',
            'decision_notes', 'created_at', 'decided_at'
        ]
        read_only_fields = ['created_at', 'decided_at', 'initiated_by', 'approved_by', 'branch']

    def get_initiated_by_name(self, obj):
        return obj.initiated_by.get_full_name() or obj.initiated_by.username

    def get_approved_by_name(self, obj):
        return obj.approved_by.username if obj.approved_by else None

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else ""
