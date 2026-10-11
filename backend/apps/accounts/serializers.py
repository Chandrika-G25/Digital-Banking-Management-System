from decimal import Decimal
from rest_framework import serializers
from django.contrib.auth import authenticate
from apps.accounts.models import (
    User, Branch, CustomerProfile, EmployeeProfile, PasswordResetToken,
    CustomerApplication, VerificationDocument, VerificationHistory
)
from apps.accounts.permissions import mask_email, mask_phone

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'address', 'city', 'phone']

class UserSerializer(serializers.ModelSerializer):
    branch_info = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'branch_info', 'customer_id', 'employee_id',
            'verification_status'
        ]

    def get_branch_info(self, obj):
        branch = obj.get_assigned_branch()
        if branch:
            return BranchSerializer(branch).data
        return None

    def get_customer_id(self, obj):
        if hasattr(obj, 'customer_profile'):
            return obj.customer_profile.customer_id
        return None

    def get_employee_id(self, obj):
        if hasattr(obj, 'employee_profile'):
            return obj.employee_profile.employee_id
        return None

    def get_verification_status(self, obj):
        if hasattr(obj, 'customer_profile'):
            return obj.customer_profile.verification_status
        return None

class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    branch = BranchSerializer(read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            'id', 'customer_id', 'branch', 'date_of_birth',
            'address', 'kyc_status', 'verification_status', 'created_at', 'user'
        ]

class EmployeeProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    branch = BranchSerializer(read_only=True)

    class Meta:
        model = EmployeeProfile
        fields = [
            'id', 'employee_id', 'branch', 'department',
            'designation', 'can_verify_customers', 'created_at', 'user'
        ]

class VerificationDocumentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.SerializerMethodField()

    class Meta:
        model = VerificationDocument
        fields = [
            'id', 'document_type', 'document_name', 'document_number',
            'file_name', 'file_size_bytes', 'status', 'remarks',
            'uploaded_at', 'reviewed_at', 'uploaded_by'
        ]

    def get_uploaded_by(self, obj):
        return obj.application.customer.user.username

class VerificationHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationHistory
        fields = [
            'id', 'employee_name', 'previous_status', 'new_status',
            'action', 'reason', 'timestamp'
        ]

class VerificationHistoryDetailSerializer(serializers.ModelSerializer):
    """Includes employee internal notes for staff-only views"""
    class Meta:
        model = VerificationHistory
        fields = [
            'id', 'employee_name', 'previous_status', 'new_status',
            'action', 'reason', 'internal_notes', 'timestamp'
        ]

class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True) # Username, Email, Customer ID, or Employee ID
    password = serializers.CharField(required=True, write_only=True)
    expected_role = serializers.ChoiceField(
        choices=[User.ROLE_CUSTOMER, User.ROLE_EMPLOYEE, User.ROLE_BRANCH_MANAGER],
        required=False
    )

    def validate(self, attrs):
        identifier = attrs.get('identifier').strip()
        password = attrs.get('password')
        expected_role = attrs.get('expected_role')

        # Find user by username, email, customer_id, or employee_id
        user = None
        if '@' in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        else:
            # Check username
            user = User.objects.filter(username__iexact=identifier).first()
            if not user:
                # Check Customer ID
                cp = CustomerProfile.objects.filter(customer_id__iexact=identifier).first()
                if cp:
                    user = cp.user
                else:
                    # Check Employee ID
                    ep = EmployeeProfile.objects.filter(employee_id__iexact=identifier).first()
                    if ep:
                        user = ep.user

        if not user or not user.check_password(password):
            raise serializers.ValidationError('Invalid login credentials provided.')

        if not user.is_active:
            raise serializers.ValidationError('Your account has been deactivated. Please contact customer support.')

        # Enforce role-based portal access check
        if expected_role and user.role != expected_role:
            raise serializers.ValidationError(
                f"Unauthorized portal: This login page is reserved for {expected_role.replace('_', ' ').title()}s."
            )

        attrs['user'] = user
        return attrs

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

def validate_password_strength(password):
    if len(password) < 12:
        raise serializers.ValidationError("Password must be at least 12 characters long.")
    import re
    if not re.search(r'[A-Z]', password):
        raise serializers.ValidationError("Password must contain at least one uppercase letter (A-Z).")
    if not re.search(r'[a-z]', password):
        raise serializers.ValidationError("Password must contain at least one lowercase letter (a-z).")
    if not re.search(r'[0-9]', password):
        raise serializers.ValidationError("Password must contain at least one numeric digit (0-9).")
    if not re.search(r'[\W_]', password):
        raise serializers.ValidationError("Password must contain at least one special symbol (!@#$%^&*...).")
    common_passwords = {'password12345', 'securebank123', 'admin12345678', 'welcome123456', '123456789012'}
    if password.lower() in common_passwords:
        raise serializers.ValidationError("This password is commonly used or compromised. Please choose a unique password.")
    return password

class RegisterCustomerSerializer(serializers.Serializer):
    # Personal Information
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(required=False, allow_blank=True, default='+1 (555) 000-0000')
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True, default='')
    address = serializers.CharField(required=False, allow_blank=True, default='')
    city = serializers.CharField(required=False, allow_blank=True, default='')
    state = serializers.CharField(required=False, allow_blank=True, default='')
    postal_code = serializers.CharField(required=False, allow_blank=True, default='')

    # Account Information
    account_type = serializers.ChoiceField(choices=['SAVINGS', 'CURRENT'], default='SAVINGS')
    branch_id = serializers.IntegerField(required=False, allow_null=True)
    nominee_name = serializers.CharField(required=False, allow_blank=True, default='')
    nominee_relationship = serializers.CharField(required=False, allow_blank=True, default='')
    nominee_phone = serializers.CharField(required=False, allow_blank=True, default='')
    initial_deposit = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal('500.00'), required=False)

    # Identity Information & Uploads
    identity_type = serializers.CharField(required=False, allow_blank=True, default='PASSPORT')
    identity_number = serializers.CharField(required=False, allow_blank=True, default='')
    identity_document = serializers.FileField(required=False, allow_null=True, default=None)
    address_proof_type = serializers.CharField(required=False, allow_blank=True, default='UTILITY_BILL')
    address_proof_document = serializers.FileField(required=False, allow_null=True, default=None)
    terms_accepted = serializers.BooleanField(default=True)

    # Password Setup
    password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=False, write_only=True, default='')
    username = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return value

    def validate_password(self, value):
        return validate_password_strength(value)

    def validate(self, attrs):
        pw = attrs.get('password')
        confirm_pw = attrs.get('confirm_password')
        if confirm_pw and pw != confirm_pw:
            raise serializers.ValidationError({'confirm_password': "Passwords do not match."})
        return attrs

class SetPasswordSerializer(serializers.Serializer):
    customer_id = serializers.CharField(required=False, allow_blank=True, default='')
    password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_password(self, value):
        return validate_password_strength(value)

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': "Passwords do not match."})
        return attrs

class CustomerVerificationStatusSerializer(serializers.ModelSerializer):
    customer_id = serializers.CharField(source='customer.customer_id', read_only=True)
    customer_name = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    account_status = serializers.SerializerMethodField()
    documents = VerificationDocumentSerializer(many=True, read_only=True)
    history = VerificationHistorySerializer(source='history_records', many=True, read_only=True)
    next_steps = serializers.SerializerMethodField()

    class Meta:
        model = CustomerApplication
        fields = [
            'id', 'application_id', 'customer_id', 'customer_name',
            'branch_name', 'status', 'kyc_status', 'account_status',
            'rejection_reason', 'requested_information', 'submitted_information',
            'documents', 'history', 'created_at', 'updated_at', 'reviewed_at',
            'next_steps'
        ]

    def get_customer_name(self, obj):
        return obj.customer.user.get_full_name() or obj.customer.user.username

    def get_account_status(self, obj):
        primary_acc = obj.customer.accounts.first()
        return primary_acc.status if primary_acc else 'PENDING_VERIFICATION'

    def get_next_steps(self, obj):
        if obj.status == CustomerApplication.STATUS_PENDING:
            return "Your application is awaiting review by our bank staff. You will be notified once the verification process is complete."
        elif obj.status == CustomerApplication.STATUS_UNDER_REVIEW:
            return "A branch banking specialist is actively reviewing your application."
        elif obj.status == CustomerApplication.STATUS_ADDITIONAL_INFO:
            return "Please provide the requested information or documents below to resume application review."
        elif obj.status == CustomerApplication.STATUS_VERIFIED:
            return "Your account is fully verified and active. All banking services and fund transfers are unlocked."
        elif obj.status == CustomerApplication.STATUS_REJECTED:
            return f"Your application was rejected. Please review the reason above or visit your branch ({obj.branch.name})."
        return "Please contact your branch specialist for further guidance."

class CustomerDocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationDocument
        fields = ['document_type', 'document_name', 'document_number', 'file', 'remarks']

class CustomerAdditionalInfoSerializer(serializers.Serializer):
    information_response = serializers.CharField(required=True)
    document_type = serializers.CharField(required=False, allow_blank=True, default='OTHER')
    document_name = serializers.CharField(required=False, allow_blank=True, default='')
    document_number = serializers.CharField(required=False, allow_blank=True, default='')
    document_file = serializers.FileField(required=False, allow_null=True, default=None)

class EmployeeCustomerApplicationListSerializer(serializers.ModelSerializer):
    customer_id = serializers.CharField(source='customer.customer_id', read_only=True)
    customer_name = serializers.SerializerMethodField()
    masked_email = serializers.SerializerMethodField()
    masked_phone = serializers.SerializerMethodField()
    registration_date = serializers.DateTimeField(source='created_at', read_only=True)
    documents_count = serializers.SerializerMethodField()
    submitted_documents_status = serializers.SerializerMethodField()
    account_verification_status = serializers.CharField(source='status', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = CustomerApplication
        fields = [
            'id', 'application_id', 'customer_id', 'customer_name',
            'registration_date', 'masked_email', 'masked_phone',
            'documents_count', 'submitted_documents_status', 'kyc_status',
            'account_verification_status', 'branch_name'
        ]

    def get_customer_name(self, obj):
        return obj.customer.user.get_full_name() or obj.customer.user.username

    def get_masked_email(self, obj):
        return mask_email(obj.customer.user.email)

    def get_masked_phone(self, obj):
        return mask_phone(obj.customer.user.phone)

    def get_documents_count(self, obj):
        return obj.documents.count()

    def get_submitted_documents_status(self, obj):
        count = obj.documents.count()
        if count == 0:
            return 'Pending Submission'
        verified_cnt = obj.documents.filter(status='VERIFIED').count()
        if verified_cnt == count:
            return f'{count} Verified'
        return f'{count} Submitted'

class EmployeeCustomerApplicationDetailSerializer(serializers.ModelSerializer):
    customer = serializers.SerializerMethodField()
    documents = VerificationDocumentSerializer(many=True, read_only=True)
    verification_history = VerificationHistoryDetailSerializer(source='history_records', many=True, read_only=True)
    duplicate_warnings = serializers.SerializerMethodField()
    missing_or_invalid = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = CustomerApplication
        fields = [
            'id', 'application_id', 'status', 'kyc_status',
            'created_at', 'updated_at', 'reviewed_at',
            'internal_notes', 'rejection_reason', 'requested_information', 'submitted_information',
            'branch_name', 'customer', 'documents', 'verification_history',
            'duplicate_warnings', 'missing_or_invalid'
        ]

    def get_customer(self, obj):
        u = obj.customer.user
        cp = obj.customer
        return {
            'id': u.id,
            'customer_id': cp.customer_id,
            'username': u.username,
            'full_name': u.get_full_name() or u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
            'masked_email': mask_email(u.email),
            'phone': u.phone,
            'masked_phone': mask_phone(u.phone),
            'date_of_birth': cp.date_of_birth,
            'gender': cp.gender,
            'address': cp.address,
            'city': cp.city,
            'state': cp.state,
            'postal_code': cp.postal_code,
            'nominee_name': obj.nominee_name or cp.nominee_name,
            'nominee_relationship': obj.nominee_relationship or cp.nominee_relationship,
            'nominee_phone': obj.nominee_phone or cp.nominee_phone,
            'account_type_requested': obj.account_type_requested,
            'initial_deposit_amount': str(obj.initial_deposit_amount),
            'terms_accepted': obj.terms_accepted,
            'branch_id': cp.branch.id if cp.branch else None,
            'branch_name': cp.branch.name if cp.branch else '',
            'branch_code': cp.branch.code if cp.branch else '',
            'verification_status': cp.verification_status,
            'kyc_status': cp.kyc_status,
            'created_at': cp.created_at
        }

    def get_duplicate_warnings(self, obj):
        warnings = []
        u = obj.customer.user
        dup_email = User.objects.filter(email__iexact=u.email).exclude(id=u.id)
        if dup_email.exists():
            names = list(dup_email.values_list('username', flat=True))
            warnings.append({
                'field': 'Email Address',
                'severity': 'HIGH',
                'message': f"Email '{u.email}' matches {dup_email.count()} other account(s): {', '.join(names)}."
            })

        if u.phone:
            dup_phone = User.objects.filter(phone=u.phone).exclude(id=u.id)
            if dup_phone.exists():
                warnings.append({
                    'field': 'Phone Number',
                    'severity': 'HIGH',
                    'message': f"Phone number matches {dup_phone.count()} other registered user(s)."
                })

        if u.first_name and u.last_name:
            dup_name = CustomerProfile.objects.filter(
                user__first_name__iexact=u.first_name,
                user__last_name__iexact=u.last_name,
                branch=obj.branch
            ).exclude(id=obj.customer.id)
            if dup_name.exists():
                warnings.append({
                    'field': 'Full Name',
                    'severity': 'MEDIUM',
                    'message': f"Customer shares same name with {dup_name.count()} existing branch customer(s)."
                })

        return warnings

    def get_missing_or_invalid(self, obj):
        checklist = []
        cp = obj.customer

        has_address = bool(cp.address and len(cp.address.strip()) > 5)
        checklist.append({
            'item': 'Residential Address',
            'required': True,
            'is_valid': has_address,
            'message': 'Valid residential address registered' if has_address else 'Missing residential address'
        })

        has_id_doc = obj.documents.filter(document_type='IDENTITY_PROOF').exists()
        checklist.append({
            'item': 'Identity Verification Document',
            'required': True,
            'is_valid': has_id_doc,
            'message': 'Identity document uploaded' if has_id_doc else 'Missing government-issued identity document'
        })

        has_addr_doc = obj.documents.filter(document_type='ADDRESS_PROOF').exists()
        checklist.append({
            'item': 'Proof of Address Document',
            'required': True,
            'is_valid': has_addr_doc,
            'message': 'Address proof uploaded' if has_addr_doc else 'Missing proof of address (utility bill / lease)'
        })

        return checklist

class ApproveVerificationSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default='')

class RejectVerificationSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=5)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

class RequestInformationSerializer(serializers.Serializer):
    missing_information = serializers.CharField(required=True, min_length=5)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

