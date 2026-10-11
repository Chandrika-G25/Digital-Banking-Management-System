import os
import random
from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.accounts.models import (
    User, CustomerProfile, EmployeeProfile, Branch,
    CustomerApplication, VerificationDocument, VerificationHistory
)
from apps.accounts.permissions import (
    IsCustomer, HasVerificationPermission, filter_by_user_branch,
    mask_email, mask_phone
)
from apps.accounts.serializers import (
    CustomerVerificationStatusSerializer, CustomerDocumentUploadSerializer,
    CustomerAdditionalInfoSerializer, EmployeeCustomerApplicationListSerializer,
    EmployeeCustomerApplicationDetailSerializer, ApproveVerificationSerializer,
    RejectVerificationSerializer, RequestInformationSerializer,
    VerificationDocumentSerializer
)
from apps.banking.models import Account
from apps.audit.models import log_audit_event
from apps.notifications.services import (
    send_notification_to_user,
    broadcast_branch_staff_alert
)
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def push_verification_event_to_user(user, application, event_type="VERIFICATION_STATUS_CHANGED"):
    """Pushes real-time WebSocket event to the customer's browser session."""
    channel_layer = get_channel_layer()
    if channel_layer:
        group_name = f"user_{user.id}"
        payload = {
            'application_id': application.application_id,
            'status': application.status,
            'kyc_status': application.kyc_status,
            'rejection_reason': application.rejection_reason,
            'requested_information': application.requested_information,
            'timestamp': timezone.now().isoformat()
        }
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'verification_status_update',
                    'data': payload
                }
            )
        except Exception:
            pass


# =====================================================================
# Customer Endpoints
# =====================================================================

class CustomerApplicationView(APIView):
    """
    POST /api/v1/customer/applications/
    Allows customer to view, start, or refresh their verification application.
    """
    permission_classes = [IsAuthenticated, IsCustomer]

    def post(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Get existing active application or create if none exists
        application = CustomerApplication.objects.filter(customer=profile).first()
        created = False
        if not application:
            today_str = timezone.now().strftime('%Y%m%d')
            rand_suffix = random.randint(1000, 9999)
            app_id = f"APP-{today_str}-{rand_suffix}"
            branch = profile.branch or Branch.objects.first()

            with transaction.atomic():
                application = CustomerApplication.objects.create(
                    application_id=app_id,
                    customer=profile,
                    branch=branch,
                    status=CustomerApplication.STATUS_PENDING,
                    kyc_status='PENDING'
                )
                VerificationHistory.objects.create(
                    application=application,
                    employee=None,
                    employee_name='Customer Self-Service',
                    previous_status='NONE',
                    new_status='PENDING',
                    action='REGISTRATION_SUBMITTED',
                    reason='Customer verification application initialized.'
                )
                created = True

        serializer = CustomerVerificationStatusSerializer(application)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CustomerVerificationStatusView(APIView):
    """
    GET /api/v1/customer/verification-status/
    Retrieves verification status, uploaded documents, public history, and next steps.
    Never exposes internal employee notes or other customers' information.
    """
    permission_classes = [IsAuthenticated, IsCustomer]

    def get(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        application = CustomerApplication.objects.filter(customer=profile).first()
        if not application:
            # Create pending application for demo consistency
            today_str = timezone.now().strftime('%Y%m%d')
            app_id = f"APP-{today_str}-{random.randint(1000, 9999)}"
            branch = profile.branch or Branch.objects.first()
            application = CustomerApplication.objects.create(
                application_id=app_id,
                customer=profile,
                branch=branch,
                status=profile.verification_status or CustomerApplication.STATUS_PENDING,
                kyc_status=profile.kyc_status or 'PENDING'
            )
            VerificationHistory.objects.create(
                application=application,
                employee=None,
                employee_name='System',
                previous_status='NONE',
                new_status=application.status,
                action='INITIALIZED',
                reason='Customer profile verification record synchronized.'
            )

        serializer = CustomerVerificationStatusSerializer(application)
        return Response(serializer.data)


class CustomerDocumentUploadView(APIView):
    """
    POST /api/v1/customer/documents/
    Allows customer to submit identity and address verification documents.
    """
    permission_classes = [IsAuthenticated, IsCustomer]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        application = CustomerApplication.objects.filter(customer=profile).first()
        if not application:
            return Response({'error': 'No active verification application found.'}, status=status.HTTP_400_BAD_REQUEST)

        doc_type = request.data.get('document_type', 'IDENTITY_PROOF')
        doc_name = request.data.get('document_name', '').strip()
        doc_number = request.data.get('document_number', '').strip()
        remarks = request.data.get('remarks', '').strip()
        uploaded_file = request.FILES.get('file')

        if not doc_name:
            doc_name = f"{doc_type.replace('_', ' ').title()} - {request.user.last_name}"

        file_size = uploaded_file.size if uploaded_file else 0
        file_name = uploaded_file.name if uploaded_file else ''

        with transaction.atomic():
            doc = VerificationDocument.objects.create(
                application=application,
                document_type=doc_type,
                document_name=doc_name,
                document_number=doc_number,
                file=uploaded_file,
                file_name=file_name,
                file_size_bytes=file_size,
                status=VerificationDocument.STATUS_PENDING,
                remarks=remarks
            )

            # If application was awaiting additional info and documents are provided, update history
            VerificationHistory.objects.create(
                application=application,
                employee=None,
                employee_name=request.user.get_full_name() or request.user.username,
                previous_status=application.status,
                new_status=application.status,
                action='DOCUMENT_UPLOADED',
                reason=f"Uploaded verification document: {doc_name} ({doc.get_document_type_display()})"
            )

        log_audit_event(
            actor=request.user,
            action='VERIFICATION_DOCUMENT_UPLOADED',
            target_model='VerificationDocument',
            target_id=doc.id,
            details=f"Uploaded document {doc.document_name} for application {application.application_id}",
            branch=application.branch
        )

        return Response({
            'success': True,
            'message': 'Document uploaded successfully.',
            'document': VerificationDocumentSerializer(doc).data
        }, status=status.HTTP_201_CREATED)


class CustomerAdditionalInfoView(APIView):
    """
    POST /api/v1/customer/additional-information/
    Submits requested additional information/documents and moves application
    back to PENDING verification queue for staff review.
    """
    permission_classes = [IsAuthenticated, IsCustomer]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if not profile:
            return Response({'error': 'Customer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        application = CustomerApplication.objects.filter(customer=profile).first()
        if not application:
            return Response({'error': 'No active application found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CustomerAdditionalInfoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        response_text = serializer.validated_data['information_response'].strip()
        doc_file = request.FILES.get('document_file') or serializer.validated_data.get('document_file')
        doc_type = serializer.validated_data.get('document_type') or 'OTHER'
        doc_name = serializer.validated_data.get('document_name') or 'Additional Supporting Document'
        doc_number = serializer.validated_data.get('document_number') or ''

        previous_status = application.status

        with transaction.atomic():
            # Update application
            application.submitted_information = response_text
            application.status = CustomerApplication.STATUS_PENDING
            application.save(update_fields=['submitted_information', 'status', 'updated_at'])

            profile.verification_status = CustomerProfile.VERIFICATION_PENDING
            profile.save(update_fields=['verification_status'])

            # If an optional file was attached
            if doc_file:
                VerificationDocument.objects.create(
                    application=application,
                    document_type=doc_type,
                    document_name=doc_name,
                    document_number=doc_number,
                    file=doc_file,
                    file_name=doc_file.name,
                    file_size_bytes=doc_file.size,
                    status=VerificationDocument.STATUS_PENDING,
                    remarks=f"Submitted in response to information request: {response_text[:100]}"
                )

            # Record history
            VerificationHistory.objects.create(
                application=application,
                employee=None,
                employee_name=request.user.get_full_name() or request.user.username,
                previous_status=previous_status,
                new_status=CustomerApplication.STATUS_PENDING,
                action='INFO_RESUBMITTED',
                reason=f"Customer responded: {response_text}"
            )

        # Notify branch staff
        broadcast_branch_staff_alert(
            application.branch.id,
            title="Additional Info Resubmitted",
            message=f"Customer {request.user.get_full_name() or request.user.username} resubmitted information for {application.application_id}.",
            alert_type='APPLICATION_RESUBMITTED'
        )

        log_audit_event(
            actor=request.user,
            action='ADDITIONAL_INFO_RESUBMITTED',
            target_model='CustomerApplication',
            target_id=application.application_id,
            details=f"Customer resubmitted requested information for application {application.application_id}",
            branch=application.branch
        )

        push_verification_event_to_user(request.user, application)

        return Response({
            'success': True,
            'message': 'Additional information submitted successfully. Your application is now back under review.',
            'status': CustomerApplication.STATUS_PENDING,
            'application_id': application.application_id
        })


# =====================================================================
# Employee & Branch Staff Endpoints
# =====================================================================

class EmployeeCustomerVerificationListView(APIView):
    """
    GET /api/v1/employee/customer-verification/
    Branch-scoped searchable, filterable list of customer applications with summary KPI metrics.
    """
    permission_classes = [IsAuthenticated, HasVerificationPermission]

    def get(self, request):
        qs = CustomerApplication.objects.select_related(
            'customer__user', 'customer__branch', 'branch'
        ).prefetch_related('documents')

        # Enforce branch scoping
        qs = filter_by_user_branch(qs, request.user, branch_field='branch')

        # Summary KPIs across this branch
        total_pending = qs.filter(status__in=[CustomerApplication.STATUS_PENDING, CustomerApplication.STATUS_UNDER_REVIEW]).count()
        verified_accounts = qs.filter(status=CustomerApplication.STATUS_VERIFIED).count()
        rejected_applications = qs.filter(status=CustomerApplication.STATUS_REJECTED).count()
        info_required = qs.filter(status=CustomerApplication.STATUS_ADDITIONAL_INFO).count()

        # Apply search and filters
        status_filter = request.query_params.get('status', '').strip().upper()
        if status_filter and status_filter != 'ALL':
            qs = qs.filter(status=status_filter)

        search_query = request.query_params.get('search', '').strip()
        if search_query:
            qs = qs.filter(
                Q(application_id__icontains=search_query) |
                Q(customer__customer_id__icontains=search_query) |
                Q(customer__user__first_name__icontains=search_query) |
                Q(customer__user__last_name__icontains=search_query) |
                Q(customer__user__username__icontains=search_query) |
                Q(customer__user__email__icontains=search_query) |
                Q(customer__user__phone__icontains=search_query)
            )

        serializer = EmployeeCustomerApplicationListSerializer(qs, many=True)

        return Response({
            'kpis': {
                'total_pending': total_pending,
                'verified_accounts': verified_accounts,
                'rejected_applications': rejected_applications,
                'additional_info_required': info_required,
                'total_applications': total_pending + verified_accounts + rejected_applications + info_required
            },
            'applications': serializer.data
        })


class EmployeeCustomerVerificationDetailView(APIView):
    """
    GET /api/v1/employee/customer-verification/{applicationId}/
    Returns deep application verification dossier: customer details, documents,
    duplicate application checks, complete history timeline, and missing info flags.
    """
    permission_classes = [IsAuthenticated, HasVerificationPermission]

    def get(self, request, applicationId):
        qs = CustomerApplication.objects.select_related(
            'customer__user', 'customer__branch', 'branch', 'reviewed_by'
        ).prefetch_related('documents', 'history_records')

        qs = filter_by_user_branch(qs, request.user, branch_field='branch')

        application = qs.filter(
            Q(application_id__iexact=applicationId) | Q(id__iexact=applicationId if applicationId.isdigit() else 0)
        ).first()

        if not application:
            return Response({'error': f"Application '{applicationId}' not found or outside your authorized branch."}, status=status.HTTP_404_NOT_FOUND)

        # Mark application UNDER_REVIEW if currently PENDING
        if application.status == CustomerApplication.STATUS_PENDING:
            with transaction.atomic():
                application.status = CustomerApplication.STATUS_UNDER_REVIEW
                application.assigned_employee = request.user
                application.save(update_fields=['status', 'assigned_employee', 'updated_at'])

                VerificationHistory.objects.create(
                    application=application,
                    employee=request.user,
                    employee_name=request.user.get_full_name() or request.user.username,
                    previous_status=CustomerApplication.STATUS_PENDING,
                    new_status=CustomerApplication.STATUS_UNDER_REVIEW,
                    action='UNDER_REVIEW',
                    reason=f"Application opened for review by staff member {request.user.get_full_name() or request.user.username}."
                )

        serializer = EmployeeCustomerApplicationDetailSerializer(application)
        return Response(serializer.data)


class EmployeeApproveVerificationView(APIView):
    """
    POST /api/v1/employee/customer-verification/{applicationId}/approve/
    Approves and verifies the application: validates requirements, transitions status to VERIFIED,
    activates customer account, records history, logs audit, and pushes real-time notifications.
    """
    permission_classes = [IsAuthenticated, HasVerificationPermission]

    def post(self, request, applicationId):
        qs = CustomerApplication.objects.select_related('customer__user', 'branch')
        qs = filter_by_user_branch(qs, request.user, branch_field='branch')

        application = qs.filter(
            Q(application_id__iexact=applicationId) | Q(id__iexact=applicationId if applicationId.isdigit() else 0)
        ).first()

        if not application:
            return Response({'error': 'Application not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

        if application.status == CustomerApplication.STATUS_VERIFIED:
            return Response({'error': 'Application is already approved and verified.'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent employee from verifying their own customer account (maker-checker separation)
        if application.customer.user == request.user:
            return Response({'error': 'Integrity violation: Staff members cannot approve their own account application.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ApproveVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        notes = serializer.validated_data.get('notes', '').strip()
        previous_status = application.status
        customer_user = application.customer.user
        customer_profile = application.customer

        with transaction.atomic():
            # 1. Update application status
            application.status = CustomerApplication.STATUS_VERIFIED
            application.kyc_status = 'VERIFIED'
            application.reviewed_by = request.user
            application.reviewed_at = timezone.now()
            if notes:
                application.internal_notes = (application.internal_notes + f"\n[{timezone.now().strftime('%Y-%m-%d %H:%M')}] Approval Note: {notes}").strip()
            application.save()

            # 2. Update customer profile
            customer_profile.verification_status = CustomerProfile.VERIFICATION_VERIFIED
            customer_profile.kyc_status = CustomerProfile.KYC_VERIFIED
            customer_profile.save(update_fields=['verification_status', 'kyc_status'])

            # 3. Mark submitted documents as verified
            application.documents.filter(status='PENDING').update(
                status='VERIFIED',
                reviewed_by=request.user,
                reviewed_at=timezone.now()
            )

            # 4. Activate all customer accounts
            Account.objects.filter(customer=customer_profile).update(status=Account.STATUS_ACTIVE)

            # 5. Record verification history
            VerificationHistory.objects.create(
                application=application,
                employee=request.user,
                employee_name=request.user.get_full_name() or request.user.username,
                previous_status=previous_status,
                new_status=CustomerApplication.STATUS_VERIFIED,
                action='APPROVED',
                reason='Customer identity and application verified and approved by bank staff.',
                internal_notes=notes
            )

            # 6. Log audit event
            log_audit_event(
                actor=request.user,
                action='CUSTOMER_VERIFICATION_APPROVED',
                target_model='CustomerApplication',
                target_id=application.application_id,
                details=f"Employee {request.user.username} approved application {application.application_id} for {customer_user.username}",
                branch=application.branch
            )

            # 7. Notify customer
            send_notification_to_user(
                user=customer_user,
                title="Account Verified & Activated",
                message="Congratulations! Your SecureBank account has been verified by our branch staff and is now fully active. All banking services and fund transfers are unlocked.",
                notification_type='SECURITY'
            )

        # 8. Push real-time event via WebSocket
        push_verification_event_to_user(customer_user, application)

        # Broadcast update to branch staff dashboard
        broadcast_branch_staff_alert(
            application.branch.id,
            title="Application Approved",
            message=f"Application {application.application_id} was approved by {request.user.get_full_name() or request.user.username}.",
            alert_type='VERIFICATION_UPDATED'
        )

        return Response({
            'success': True,
            'message': f"Application {application.application_id} has been successfully verified and customer account activated.",
            'status': CustomerApplication.STATUS_VERIFIED,
            'verification_status': CustomerApplication.STATUS_VERIFIED,
            'account_status': Account.STATUS_ACTIVE,
            'application_id': application.application_id
        })


class EmployeeRejectVerificationView(APIView):
    """
    POST /api/v1/employee/customer-verification/{applicationId}/reject/
    Rejects customer application with mandatory reason, logs history, and notifies customer.
    """
    permission_classes = [IsAuthenticated, HasVerificationPermission]

    def post(self, request, applicationId):
        qs = CustomerApplication.objects.select_related('customer__user', 'branch')
        qs = filter_by_user_branch(qs, request.user, branch_field='branch')

        application = qs.filter(
            Q(application_id__iexact=applicationId) | Q(id__iexact=applicationId if applicationId.isdigit() else 0)
        ).first()

        if not application:
            return Response({'error': 'Application not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RejectVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        reason = serializer.validated_data['reason'].strip()
        notes = serializer.validated_data.get('notes', '').strip()
        previous_status = application.status
        customer_user = application.customer.user
        customer_profile = application.customer

        with transaction.atomic():
            # Update application
            application.status = CustomerApplication.STATUS_REJECTED
            application.rejection_reason = reason
            application.reviewed_by = request.user
            application.reviewed_at = timezone.now()
            if notes:
                application.internal_notes = (application.internal_notes + f"\n[{timezone.now().strftime('%Y-%m-%d %H:%M')}] Rejection Note: {notes}").strip()
            application.save()

            # Update customer profile
            customer_profile.verification_status = CustomerProfile.VERIFICATION_REJECTED
            customer_profile.save(update_fields=['verification_status'])

            # Mark pending documents as rejected
            application.documents.filter(status='PENDING').update(
                status='REJECTED',
                reviewed_by=request.user,
                reviewed_at=timezone.now(),
                remarks=reason
            )

            # Record history
            VerificationHistory.objects.create(
                application=application,
                employee=request.user,
                employee_name=request.user.get_full_name() or request.user.username,
                previous_status=previous_status,
                new_status=CustomerApplication.STATUS_REJECTED,
                action='REJECTED',
                reason=reason,
                internal_notes=notes
            )

            # Log audit
            log_audit_event(
                actor=request.user,
                action='CUSTOMER_VERIFICATION_REJECTED',
                target_model='CustomerApplication',
                target_id=application.application_id,
                details=f"Employee {request.user.username} rejected application {application.application_id}. Reason: {reason}",
                branch=application.branch
            )

            # Notify customer
            send_notification_to_user(
                user=customer_user,
                title="Account Verification Update",
                message=f"Your account application could not be verified. Reason: {reason}. Please contact your branch for assistance.",
                notification_type='SECURITY'
            )

        push_verification_event_to_user(customer_user, application)

        broadcast_branch_staff_alert(
            application.branch.id,
            title="Application Rejected",
            message=f"Application {application.application_id} was rejected by {request.user.get_full_name() or request.user.username}.",
            alert_type='VERIFICATION_UPDATED'
        )

        return Response({
            'success': True,
            'message': f"Application {application.application_id} has been rejected.",
            'status': CustomerApplication.STATUS_REJECTED,
            'verification_status': CustomerApplication.STATUS_REJECTED,
            'account_status': Account.STATUS_FROZEN,
            'application_id': application.application_id
        })


class EmployeeRequestInformationView(APIView):
    """
    POST /api/v1/employee/customer-verification/{applicationId}/request-information/
    Requests additional documents or information from customer, sets status to
    ADDITIONAL_INFORMATION_REQUIRED, and notifies customer with instructions.
    """
    permission_classes = [IsAuthenticated, HasVerificationPermission]

    def post(self, request, applicationId):
        qs = CustomerApplication.objects.select_related('customer__user', 'branch')
        qs = filter_by_user_branch(qs, request.user, branch_field='branch')

        application = qs.filter(
            Q(application_id__iexact=applicationId) | Q(id__iexact=applicationId if applicationId.isdigit() else 0)
        ).first()

        if not application:
            return Response({'error': 'Application not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RequestInformationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        missing_info = serializer.validated_data['missing_information'].strip()
        notes = serializer.validated_data.get('notes', '').strip()
        previous_status = application.status
        customer_user = application.customer.user
        customer_profile = application.customer

        with transaction.atomic():
            application.status = CustomerApplication.STATUS_ADDITIONAL_INFO
            application.requested_information = missing_info
            application.reviewed_by = request.user
            application.reviewed_at = timezone.now()
            if notes:
                application.internal_notes = (application.internal_notes + f"\n[{timezone.now().strftime('%Y-%m-%d %H:%M')}] Info Request Note: {notes}").strip()
            application.save()

            customer_profile.verification_status = CustomerProfile.VERIFICATION_ADDITIONAL_INFO
            customer_profile.save(update_fields=['verification_status'])

            VerificationHistory.objects.create(
                application=application,
                employee=request.user,
                employee_name=request.user.get_full_name() or request.user.username,
                previous_status=previous_status,
                new_status=CustomerApplication.STATUS_ADDITIONAL_INFO,
                action='INFO_REQUESTED',
                reason=f"Additional information requested: {missing_info}",
                internal_notes=notes
            )

            log_audit_event(
                actor=request.user,
                action='CUSTOMER_VERIFICATION_INFO_REQUESTED',
                target_model='CustomerApplication',
                target_id=application.application_id,
                details=f"Employee {request.user.username} requested additional information for {application.application_id}: {missing_info}",
                branch=application.branch
            )

            send_notification_to_user(
                user=customer_user,
                title="Action Required: Additional Verification Information",
                message=f"Please provide the requested details or documents: {missing_info}. Visit your customer dashboard to respond.",
                notification_type='SECURITY'
            )

        push_verification_event_to_user(customer_user, application)

        broadcast_branch_staff_alert(
            application.branch.id,
            title="Additional Info Requested",
            message=f"Additional information requested for application {application.application_id}.",
            alert_type='VERIFICATION_UPDATED'
        )

        return Response({
            'success': True,
            'message': f"Additional information request sent for application {application.application_id}.",
            'status': CustomerApplication.STATUS_ADDITIONAL_INFO,
            'application_id': application.application_id
        })


class SecureDocumentDownloadView(APIView):
    """
    GET /api/v1/employee/customer-verification/{applicationId}/documents/{docId}/
    Protected file retrieval endpoint. Prevents public file access.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, applicationId, docId):
        doc = VerificationDocument.objects.filter(
            id=docId,
            application__application_id=applicationId
        ).select_related('application__customer__user', 'application__branch').first()

        if not doc:
            raise Http404("Document not found.")

        # Check access permission: user must either be the owning customer or authorized branch staff
        is_owner = (request.user == doc.application.customer.user)
        is_staff = request.user.is_staff or request.user.role in [User.ROLE_EMPLOYEE, User.ROLE_BRANCH_MANAGER]

        if not (is_owner or is_staff):
            return Response({'error': 'Unauthorized to view this document.'}, status=status.HTTP_403_FORBIDDEN)

        if not doc.file or not os.path.exists(doc.file.path):
            return Response({
                'id': doc.id,
                'document_name': doc.document_name,
                'document_type': doc.document_type,
                'file_name': doc.file_name or 'sample_document.pdf',
                'status': doc.status,
                'note': 'Demonstration document record. Physical binary file stored in secure vault.'
            })

        return FileResponse(open(doc.file.path, 'rb'), content_type='application/octet-stream')
