from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.conf import settings
import secrets
from decimal import Decimal
from datetime import timedelta

def generate_customer_id():
    """
    Generate unique Customer ID with format SB100001, SB100002, etc.
    Concurrency safe: queries existing SB sequence and increments safely.
    """
    last_profile = (
        CustomerProfile.objects
        .filter(customer_id__regex=r'^SB\d+$')
        .order_by('-customer_id')
        .first()
    )
    if last_profile:
        try:
            current_num = int(last_profile.customer_id[2:])
            next_num = current_num + 1
        except (ValueError, IndexError):
            next_num = 100001
    else:
        count = CustomerProfile.objects.filter(customer_id__startswith='SB').count()
        next_num = 100001 + count

    while CustomerProfile.objects.filter(customer_id=f"SB{next_num}").exists():
        next_num += 1

    return f"SB{next_num}"

class Branch(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True, db_index=True)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Branches'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

class User(AbstractUser):
    ROLE_CUSTOMER = 'CUSTOMER'
    ROLE_EMPLOYEE = 'EMPLOYEE'
    ROLE_BRANCH_MANAGER = 'BRANCH_MANAGER'

    ROLE_CHOICES = [
        (ROLE_CUSTOMER, 'Customer'),
        (ROLE_EMPLOYEE, 'Employee'),
        (ROLE_BRANCH_MANAGER, 'Branch Manager'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CUSTOMER, db_index=True)
    phone = models.CharField(max_length=25, blank=True)
    email = models.EmailField(unique=True)

    REQUIRED_FIELDS = ['email', 'role']

    def is_customer(self):
        return self.role == self.ROLE_CUSTOMER

    def is_employee(self):
        return self.role == self.ROLE_EMPLOYEE

    def is_branch_manager(self):
        return self.role == self.ROLE_BRANCH_MANAGER

    def get_assigned_branch(self):
        if hasattr(self, 'employee_profile') and self.employee_profile.branch:
            return self.employee_profile.branch
        if hasattr(self, 'customer_profile') and self.customer_profile.branch:
            return self.customer_profile.branch
        return None

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class CustomerProfile(models.Model):
    KYC_PENDING = 'PENDING'
    KYC_VERIFIED = 'VERIFIED'
    KYC_REJECTED = 'REJECTED'

    KYC_STATUS_CHOICES = [
        (KYC_PENDING, 'Pending Review'),
        (KYC_VERIFIED, 'Verified'),
        (KYC_REJECTED, 'Rejected'),
    ]

    VERIFICATION_PENDING = 'PENDING'
    VERIFICATION_UNDER_REVIEW = 'UNDER_REVIEW'
    VERIFICATION_ADDITIONAL_INFO = 'ADDITIONAL_INFORMATION_REQUIRED'
    VERIFICATION_VERIFIED = 'VERIFIED'
    VERIFICATION_REJECTED = 'REJECTED'

    VERIFICATION_STATUS_CHOICES = [
        (VERIFICATION_PENDING, 'Pending Verification'),
        (VERIFICATION_UNDER_REVIEW, 'Under Review'),
        (VERIFICATION_ADDITIONAL_INFO, 'Additional Information Required'),
        (VERIFICATION_VERIFIED, 'Verified'),
        (VERIFICATION_REJECTED, 'Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    customer_id = models.CharField(max_length=25, unique=True, db_index=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    nominee_name = models.CharField(max_length=150, blank=True)
    nominee_relationship = models.CharField(max_length=50, blank=True)
    nominee_phone = models.CharField(max_length=25, blank=True)
    kyc_status = models.CharField(max_length=20, choices=KYC_STATUS_CHOICES, default=KYC_PENDING)
    verification_status = models.CharField(
        max_length=35,
        choices=VERIFICATION_STATUS_CHOICES,
        default=VERIFICATION_PENDING,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def is_verified(self):
        return self.verification_status == self.VERIFICATION_VERIFIED

    def __str__(self):
        return f"{self.customer_id} - {self.user.get_full_name() or self.user.username} ({self.verification_status})"

class EmployeeProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    employee_id = models.CharField(max_length=25, unique=True, db_index=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    department = models.CharField(max_length=100, default='Branch Operations')
    designation = models.CharField(max_length=100, default='Banking Specialist')
    can_verify_customers = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee_id} - {self.user.get_full_name() or self.user.username}"

class CustomerApplication(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_UNDER_REVIEW = 'UNDER_REVIEW'
    STATUS_ADDITIONAL_INFO = 'ADDITIONAL_INFORMATION_REQUIRED'
    STATUS_VERIFIED = 'VERIFIED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Verification'),
        (STATUS_UNDER_REVIEW, 'Under Review'),
        (STATUS_ADDITIONAL_INFO, 'Additional Information Required'),
        (STATUS_VERIFIED, 'Verified'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    application_id = models.CharField(max_length=35, unique=True, db_index=True)
    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='applications')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='customer_applications')
    status = models.CharField(max_length=35, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    kyc_status = models.CharField(max_length=20, default='PENDING')
    account_type_requested = models.CharField(max_length=20, default='SAVINGS')
    initial_deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('500.00'))
    nominee_name = models.CharField(max_length=150, blank=True)
    nominee_relationship = models.CharField(max_length=50, blank=True)
    nominee_phone = models.CharField(max_length=25, blank=True)
    terms_accepted = models.BooleanField(default=True)
    assigned_employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_customer_applications'
    )
    internal_notes = models.TextField(blank=True) # Employee internal notes, confidential
    rejection_reason = models.TextField(blank=True) # Customer-facing reason
    requested_information = models.TextField(blank=True) # Staff request message for customer
    submitted_information = models.TextField(blank=True) # Resubmitted notes from customer
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_customer_applications'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.application_id} - {self.customer.customer_id} ({self.status})"

class VerificationDocument(models.Model):
    TYPE_IDENTITY = 'IDENTITY_PROOF'
    TYPE_ADDRESS = 'ADDRESS_PROOF'
    TYPE_INCOME = 'INCOME_PROOF'
    TYPE_OTHER = 'OTHER'

    TYPE_CHOICES = [
        (TYPE_IDENTITY, 'Identity Proof (Passport / National ID / Driving License)'),
        (TYPE_ADDRESS, 'Address Proof (Utility Bill / Lease Agreement)'),
        (TYPE_INCOME, 'Income & Employment Proof'),
        (TYPE_OTHER, 'Other Supporting Document'),
    ]

    STATUS_PENDING = 'PENDING'
    STATUS_VERIFIED = 'VERIFIED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_VERIFIED, 'Verified'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    application = models.ForeignKey(CustomerApplication, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=40, choices=TYPE_CHOICES)
    document_name = models.CharField(max_length=150)
    document_number = models.CharField(max_length=60, blank=True)
    file = models.FileField(upload_to='verification_documents/', blank=True, null=True)
    file_name = models.CharField(max_length=200, blank=True)
    file_size_bytes = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    remarks = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_verification_documents'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.application.application_id} - {self.document_name} ({self.status})"

class VerificationHistory(models.Model):
    application = models.ForeignKey(CustomerApplication, on_delete=models.CASCADE, related_name='history_records')
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verification_actions'
    )
    employee_name = models.CharField(max_length=150, blank=True)
    previous_status = models.CharField(max_length=35)
    new_status = models.CharField(max_length=35)
    action = models.CharField(max_length=50) # REGISTRATION_SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, INFO_REQUESTED, INFO_RESUBMITTED
    reason = models.TextField(blank=True) # Public reason / instructions
    internal_notes = models.TextField(blank=True) # Internal staff notes
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.application.application_id}: {self.previous_status} -> {self.new_status}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    @classmethod
    def create_for_user(cls, user, expires_in_minutes=60):
        token_str = secrets.token_urlsafe(32)
        expires = timezone.now() + timedelta(minutes=expires_in_minutes)
        return cls.objects.create(user=user, token=token_str, expires_at=expires)

    def is_valid(self):
        return not self.used and timezone.now() <= self.expires_at

    def __str__(self):
        return f"ResetToken for {self.user.username} (valid={self.is_valid()})"
