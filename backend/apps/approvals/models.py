from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class LoanApplication(models.Model):
    TYPE_PERSONAL = 'PERSONAL'
    TYPE_HOME = 'HOME'
    TYPE_AUTO = 'AUTO'
    TYPE_EDUCATION = 'EDUCATION'

    LOAN_TYPES = [
        (TYPE_PERSONAL, 'Personal Loan'),
        (TYPE_HOME, 'Home Mortgage'),
        (TYPE_AUTO, 'Auto Financing'),
        (TYPE_EDUCATION, 'Education Loan'),
    ]

    STATUS_PENDING = 'PENDING'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Under Review'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    customer = models.ForeignKey(
        'accounts.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='loans'
    )
    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.CASCADE,
        related_name='loans'
    )
    loan_type = models.CharField(max_length=20, choices=LOAN_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    term_months = models.IntegerField(default=12)
    purpose = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_loans'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.customer.user.username} - {self.get_loan_type_display()} (${self.amount})"

class KYCRecord(models.Model):
    DOC_PASSPORT = 'PASSPORT'
    DOC_NATIONAL_ID = 'NATIONAL_ID'
    DOC_DRIVING_LICENSE = 'DRIVING_LICENSE'

    DOC_CHOICES = [
        (DOC_PASSPORT, 'Passport'),
        (DOC_NATIONAL_ID, 'National Identity Card'),
        (DOC_DRIVING_LICENSE, "Driver's License"),
    ]

    STATUS_PENDING = 'PENDING'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_APPROVED, 'Verified & Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    customer = models.ForeignKey(
        'accounts.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='kyc_records'
    )
    document_type = models.CharField(max_length=30, choices=DOC_CHOICES)
    document_number = models.CharField(max_length=50)
    document_file = models.FileField(upload_to='kyc_documents/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_kycs'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.customer.user.username} - {self.get_document_type_display()} ({self.status})"

class ServiceRequest(models.Model):
    TYPE_CARD_REPLACEMENT = 'CARD_REPLACEMENT'
    TYPE_CHEQUE_BOOK = 'CHEQUE_BOOK'
    TYPE_ACCOUNT_UPGRADE = 'ACCOUNT_UPGRADE'
    TYPE_ADDRESS_UPDATE = 'ADDRESS_UPDATE'
    TYPE_GENERAL_QUERY = 'GENERAL_QUERY'

    REQUEST_TYPES = [
        (TYPE_CARD_REPLACEMENT, 'Debit/Credit Card Replacement'),
        (TYPE_CHEQUE_BOOK, 'New Cheque Book Request'),
        (TYPE_ACCOUNT_UPGRADE, 'Account Tier Upgrade'),
        (TYPE_ADDRESS_UPDATE, 'Mailing Address Update'),
        (TYPE_GENERAL_QUERY, 'General Customer Service Query'),
    ]

    STATUS_OPEN = 'OPEN'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_RESOLVED = 'RESOLVED'
    STATUS_CLOSED = 'CLOSED'

    STATUS_CHOICES = [
        (STATUS_OPEN, 'Open'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_RESOLVED, 'Resolved'),
        (STATUS_CLOSED, 'Closed'),
    ]

    customer = models.ForeignKey(
        'accounts.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='service_requests'
    )
    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.CASCADE,
        related_name='service_requests'
    )
    request_type = models.CharField(max_length=30, choices=REQUEST_TYPES)
    subject = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_service_requests'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"SR-{self.id}: {self.subject} ({self.status})"

class ApprovalRequest(models.Model):
    TYPE_LOAN_APPROVAL = 'LOAN_APPROVAL'
    TYPE_HIGH_VALUE_TRANSFER = 'HIGH_VALUE_TRANSFER'
    TYPE_ACCOUNT_FREEZE = 'ACCOUNT_FREEZE'
    TYPE_KYC_APPROVAL = 'KYC_APPROVAL'

    REQUEST_TYPES = [
        (TYPE_LOAN_APPROVAL, 'Loan Application Approval'),
        (TYPE_HIGH_VALUE_TRANSFER, 'High-Value Transfer Approval'),
        (TYPE_ACCOUNT_FREEZE, 'Account Freeze/Unfreeze Request'),
        (TYPE_KYC_APPROVAL, 'High-Risk KYC Approval'),
    ]

    STATUS_PENDING = 'PENDING'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Checker Action'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.CASCADE,
        related_name='approval_requests'
    )
    request_type = models.CharField(max_length=30, choices=REQUEST_TYPES)
    entity_id = models.CharField(max_length=50)
    details = models.TextField()
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='initiated_approvals'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decided_approvals'
    )
    decision_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        # Maker-checker validation rule: the initiator cannot approve the same request!
        if self.approved_by and self.initiated_by == self.approved_by:
            raise ValidationError("Maker-checker violation: An employee or manager cannot approve a request they initiated.")

    def __str__(self):
        return f"Approval #{self.id}: {self.get_request_type_display()} ({self.status})"
