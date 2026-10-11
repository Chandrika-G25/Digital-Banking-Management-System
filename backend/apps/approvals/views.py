from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsCustomer, IsEmployee, IsBranchManager, IsStaffMember, filter_by_user_branch
from apps.approvals.models import LoanApplication, KYCRecord, ServiceRequest, ApprovalRequest
from apps.approvals.serializers import (
    LoanApplicationSerializer, KYCRecordSerializer,
    ServiceRequestSerializer, ApprovalRequestSerializer
)
from apps.banking.models import Account, Transaction, LedgerEntry
from apps.banking.services import TransferService
from apps.audit.models import log_audit_event
from apps.notifications.services import (
    send_notification_to_user,
    send_balance_update_to_user,
    broadcast_branch_staff_alert,
    broadcast_branch_manager_alert
)

# ----------------- Customer Workflow Views -----------------

class CustomerLoansView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def get(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response([])
        loans = LoanApplication.objects.filter(customer=profile)
        return Response(LoanApplicationSerializer(loans, many=True).data)

    def post(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if not profile.is_verified():
            return Response({
                'error': 'Account verification required. Your account must be verified by bank staff before applying for credit or loan facilities.',
                'code': 'VERIFICATION_REQUIRED'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = LoanApplicationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        loan = serializer.save(
            customer=profile,
            branch=profile.branch,
            status=LoanApplication.STATUS_PENDING
        )

        # Notify customer
        send_notification_to_user(
            user=request.user,
            title="Loan Application Received",
            message=f"Your {loan.get_loan_type_display()} application for ${loan.amount} has been submitted for branch review.",
            notification_type='SYSTEM'
        )

        # Notify branch manager
        if profile.branch:
            broadcast_branch_manager_alert(
                branch_id=profile.branch.id,
                title="New Loan Application",
                message=f"Customer {request.user.get_full_name() or request.user.username} submitted a {loan.get_loan_type_display()} application for ${loan.amount}.",
                alert_type='LOAN_SUBMISSION'
            )

        log_audit_event(
            actor=request.user,
            action='LOAN_APPLICATION_SUBMITTED',
            target_model='LoanApplication',
            target_id=loan.id,
            details=f"Applied for {loan.get_loan_type_display()} of ${loan.amount}",
            branch=profile.branch
        )

        return Response(LoanApplicationSerializer(loan).data, status=status.HTTP_201_CREATED)

class CustomerKYCView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def get(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response([])
        records = KYCRecord.objects.filter(customer=profile)
        return Response(KYCRecordSerializer(records, many=True).data)

    def post(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        doc_type = request.data.get('document_type')
        doc_num = request.data.get('document_number')

        if not doc_type or not doc_num:
            return Response({'error': 'Document type and document number are required.'}, status=status.HTTP_400_BAD_REQUEST)

        record = KYCRecord.objects.create(
            customer=profile,
            document_type=doc_type,
            document_number=doc_num,
            status=KYCRecord.STATUS_PENDING
        )

        if profile.branch:
            broadcast_branch_staff_alert(
                branch_id=profile.branch.id,
                title="New KYC Document Uploaded",
                message=f"Customer {request.user.username} submitted verification docs for review.",
                alert_type='KYC_SUBMISSION'
            )

        return Response(KYCRecordSerializer(record).data, status=status.HTTP_201_CREATED)

class CustomerServiceRequestsView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def get(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response([])
        requests_qs = ServiceRequest.objects.filter(customer=profile)
        return Response(ServiceRequestSerializer(requests_qs, many=True).data)

    def post(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ServiceRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        sr = serializer.save(
            customer=profile,
            branch=profile.branch,
            status=ServiceRequest.STATUS_OPEN
        )

        if profile.branch:
            broadcast_branch_staff_alert(
                branch_id=profile.branch.id,
                title="New Customer Service Request",
                message=f"Request #{sr.id} submitted: {sr.subject}",
                alert_type='SERVICE_REQUEST'
            )

        return Response(ServiceRequestSerializer(sr).data, status=status.HTTP_201_CREATED)

# ----------------- Employee Portal Views -----------------

class EmployeeKYCView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        branch = request.user.get_assigned_branch()
        records = KYCRecord.objects.all()
        if branch and not request.user.is_superuser:
            records = records.filter(customer__branch=branch)
        return Response(KYCRecordSerializer(records[:50], many=True).data)

    def post(self, request):
        """Update KYC verification status"""
        record_id = request.data.get('id')
        new_status = request.data.get('status')
        remarks = request.data.get('remarks', '')

        if not record_id or new_status not in [KYCRecord.STATUS_APPROVED, KYCRecord.STATUS_REJECTED]:
            return Response({'error': 'Valid record ID and status are required.'}, status=status.HTTP_400_BAD_REQUEST)

        record = KYCRecord.objects.filter(id=record_id).first()
        if not record:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)

        # Enforce branch scope
        branch = request.user.get_assigned_branch()
        if branch and not request.user.is_superuser and record.customer.branch != branch:
            return Response({'error': 'Unauthorized branch access.'}, status=status.HTTP_403_FORBIDDEN)

        record.status = new_status
        record.remarks = remarks
        record.verified_by = request.user
        record.verified_at = timezone.now()
        record.save()

        # Update customer profile status
        profile = record.customer
        if new_status == KYCRecord.STATUS_APPROVED:
            profile.kyc_status = 'VERIFIED'
        else:
            profile.kyc_status = 'REJECTED'
        profile.save(update_fields=['kyc_status'])

        send_notification_to_user(
            user=profile.user,
            title="KYC Verification Update",
            message=f"Your KYC verification status has been updated to: {record.get_status_display()}.",
            notification_type='SECURITY'
        )

        log_audit_event(
            actor=request.user,
            action='KYC_STATUS_UPDATED',
            target_model='KYCRecord',
            target_id=record.id,
            details=f"KYC status updated to {new_status} for {profile.customer_id}",
            branch=branch
        )

        return Response(KYCRecordSerializer(record).data)

class EmployeeServiceRequestsView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        branch = request.user.get_assigned_branch()
        requests_qs = ServiceRequest.objects.all()
        if branch and not request.user.is_superuser:
            requests_qs = requests_qs.filter(branch=branch)
        return Response(ServiceRequestSerializer(requests_qs[:50], many=True).data)

    def post(self, request):
        sr_id = request.data.get('id')
        new_status = request.data.get('status')

        sr = ServiceRequest.objects.filter(id=sr_id).first()
        if not sr:
            return Response({'error': 'Service request not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Enforce branch scope
        branch = request.user.get_assigned_branch()
        if branch and not request.user.is_superuser and sr.branch != branch:
            return Response({'error': 'Unauthorized branch access.'}, status=status.HTTP_403_FORBIDDEN)

        sr.status = new_status
        sr.assigned_to = request.user
        if new_status in [ServiceRequest.STATUS_RESOLVED, ServiceRequest.STATUS_CLOSED]:
            sr.resolved_at = timezone.now()
        sr.save()

        send_notification_to_user(
            user=sr.customer.user,
            title="Service Request Update",
            message=f"Your service request #{sr.id} ('{sr.subject}') is now {sr.get_status_display()}.",
            notification_type='SYSTEM'
        )

        return Response(ServiceRequestSerializer(sr).data)

# ----------------- Branch Manager Approval Views -----------------

class ManagerLoansView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request):
        branch = request.user.get_assigned_branch()
        loans = LoanApplication.objects.all()
        if branch and not request.user.is_superuser:
            loans = loans.filter(branch=branch)
        return Response(LoanApplicationSerializer(loans[:50], many=True).data)

    def post(self, request):
        """Approve or Reject Loan Application with fund disbursement"""
        loan_id = request.data.get('id')
        action = request.data.get('action') # 'APPROVE' or 'REJECT'
        notes = request.data.get('notes', '')

        loan = LoanApplication.objects.filter(id=loan_id).first()
        if not loan:
            return Response({'error': 'Loan application not found.'}, status=status.HTTP_404_NOT_FOUND)

        branch = request.user.get_assigned_branch()
        if branch and not request.user.is_superuser and loan.branch != branch:
            return Response({'error': 'Unauthorized branch access.'}, status=status.HTTP_403_FORBIDDEN)

        if action == 'APPROVE':
            loan.status = LoanApplication.STATUS_APPROVED
            loan.reviewed_by = request.user
            loan.reviewed_at = timezone.now()
            loan.notes = notes
            loan.save()

            # Disburse funds into customer's primary account
            account = Account.objects.filter(customer=loan.customer, status=Account.STATUS_ACTIVE).first()
            if account:
                account.balance = (account.balance + loan.amount).quantize(Decimal('0.01'))
                account.save(update_fields=['balance'])

                ref = TransferService.generate_reference()
                txn = Transaction.objects.create(
                    reference_number=ref,
                    from_account=None,
                    to_account=account,
                    amount=loan.amount,
                    transaction_type=Transaction.TXN_LOAN_DISBURSEMENT,
                    status=Transaction.STATUS_COMPLETED,
                    description=f"{loan.get_loan_type_display()} Disbursement (App #{loan.id})"
                )

                LedgerEntry.objects.create(
                    transaction=txn,
                    account=account,
                    entry_type=LedgerEntry.ENTRY_CREDIT,
                    amount=loan.amount,
                    balance_after=account.balance
                )

                send_balance_update_to_user(loan.customer.user, account.account_number, account.balance, account.currency)
                send_notification_to_user(
                    user=loan.customer.user,
                    title="Loan Approved & Disbursed!",
                    message=f"Congratulations! Your {loan.get_loan_type_display()} of ${loan.amount} has been approved and disbursed into account ending in {account.account_number[-4:]}.",
                    notification_type='TRANSACTION'
                )

        else:
            loan.status = LoanApplication.STATUS_REJECTED
            loan.reviewed_by = request.user
            loan.reviewed_at = timezone.now()
            loan.notes = notes
            loan.save()

            send_notification_to_user(
                user=loan.customer.user,
                title="Loan Application Update",
                message=f"Your {loan.get_loan_type_display()} application could not be approved at this time. Notes: {notes}",
                notification_type='SYSTEM'
            )

        log_audit_event(
            actor=request.user,
            action=f"LOAN_{loan.status}",
            target_model='LoanApplication',
            target_id=loan.id,
            details=f"Loan #{loan.id} set to {loan.status} by manager {request.user.username}. Notes: {notes}",
            branch=branch
        )

        return Response(LoanApplicationSerializer(loan).data)

class ManagerApprovalsView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request):
        branch = request.user.get_assigned_branch()
        approvals = ApprovalRequest.objects.all()
        if branch and not request.user.is_superuser:
            approvals = approvals.filter(branch=branch)
        return Response(ApprovalRequestSerializer(approvals[:50], many=True).data)

    def post(self, request):
        """
        Decide on an ApprovalRequest enforcing strict maker-checker controls!
        """
        approval_id = request.data.get('id')
        decision = request.data.get('decision') # 'APPROVED' or 'REJECTED'
        notes = request.data.get('decision_notes', '')

        approval = ApprovalRequest.objects.filter(id=approval_id).first()
        if not approval:
            return Response({'error': 'Approval request not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Enforce Maker-Checker: the person who initiated cannot approve/reject!
        if approval.initiated_by == request.user:
            return Response({
                'error': 'Maker-checker violation: You cannot approve or decide on an operation that you initiated.'
            }, status=status.HTTP_403_FORBIDDEN)

        branch = request.user.get_assigned_branch()
        if branch and not request.user.is_superuser and approval.branch != branch:
            return Response({'error': 'Unauthorized branch access.'}, status=status.HTTP_403_FORBIDDEN)

        approval.status = decision
        approval.approved_by = request.user
        approval.decision_notes = notes
        approval.decided_at = timezone.now()
        approval.save()

        log_audit_event(
            actor=request.user,
            action=f"APPROVAL_{decision}",
            target_model='ApprovalRequest',
            target_id=approval.id,
            details=f"Approval #{approval.id} decided as {decision} by {request.user.username}",
            branch=branch
        )

        return Response(ApprovalRequestSerializer(approval).data)
