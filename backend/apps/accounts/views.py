import uuid
import random
from decimal import Decimal
from django.contrib.auth import login, logout
from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token

from apps.accounts.models import (
    User, Branch, CustomerProfile, EmployeeProfile, PasswordResetToken,
    CustomerApplication, VerificationDocument, VerificationHistory, generate_customer_id
)
from apps.approvals.models import KYCRecord
from apps.accounts.serializers import (
    UserSerializer, BranchSerializer, LoginSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    RegisterCustomerSerializer, SetPasswordSerializer
)
from apps.banking.models import Account
from apps.audit.models import log_audit_event
from apps.notifications.services import send_notification_to_user, broadcast_branch_staff_alert

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)

        # Determine dashboard destination based on role
        redirect_map = {
            User.ROLE_CUSTOMER: '/customer/dashboard',
            User.ROLE_EMPLOYEE: '/employee/dashboard',
            User.ROLE_BRANCH_MANAGER: '/manager/dashboard',
        }
        if user.role == User.ROLE_CUSTOMER:
            if hasattr(user, 'customer_profile') and not user.customer_profile.is_verified():
                redirect_map[User.ROLE_CUSTOMER] = '/customer/verification-status'

        # Log audit entry
        ip = request.META.get('REMOTE_ADDR', '')
        log_audit_event(
            actor=user,
            action='USER_LOGIN',
            target_model='User',
            target_id=user.id,
            details=f"User {user.username} logged in successfully as {user.role}",
            branch=user.get_assigned_branch(),
            ip_address=ip
        )

        return Response({
            'success': True,
            'token': token.key,
            'user': UserSerializer(user).data,
            'redirect_url': redirect_map.get(user.role, '/'),
            'message': f"Welcome back, {user.get_full_name() or user.username}!"
        })

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Delete token
            request.user.auth_token.delete()
        except Exception:
            pass

        log_audit_event(
            actor=request.user,
            action='USER_LOGOUT',
            target_model='User',
            target_id=request.user.id,
            details=f"User {request.user.username} logged out",
            branch=request.user.get_assigned_branch()
        )

        return Response({'success': True, 'message': 'Logged out successfully.'})

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response({
            'user': serializer.data,
            'role': user.role,
        })

    def put(self, request):
        user = request.user
        first_name = request.data.get('first_name', user.first_name)
        last_name = request.data.get('last_name', user.last_name)
        phone = request.data.get('phone', user.phone)

        user.first_name = first_name
        user.last_name = last_name
        user.phone = phone
        user.save()

        # Update address in profile if provided
        if hasattr(user, 'customer_profile') and 'address' in request.data:
            user.customer_profile.address = request.data.get('address')
            user.customer_profile.save()

        return Response({
            'success': True,
            'user': UserSerializer(user).data,
            'message': 'Profile updated successfully.'
        })

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({'error': 'Old and new passwords are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(old_password):
            return Response({'error': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()

        # Update or recreate token
        Token.objects.filter(user=request.user).delete()
        token = Token.objects.create(user=request.user)

        log_audit_event(
            actor=request.user,
            action='PASSWORD_CHANGED',
            target_model='User',
            target_id=request.user.id,
            details=f"User {request.user.username} changed password"
        )

        return Response({
            'success': True,
            'token': token.key,
            'message': 'Password changed successfully.'
        })

class RegisterCustomerView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterCustomerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        branch = None
        if 'branch_id' in data and data['branch_id']:
            branch = Branch.objects.filter(id=data['branch_id']).first()
        if not branch:
            branch = Branch.objects.first()

        with transaction.atomic():
            # Generate unique Customer ID (e.g. SB100001, SB100002)
            customer_id = generate_customer_id()

            # Establish username
            username = data.get('username', '').strip()
            if not username:
                username = customer_id.lower()
            elif User.objects.filter(username__iexact=username).exists():
                username = f"{customer_id.lower()}_{random.randint(10, 99)}"

            # Create user with Django password hashing
            user = User.objects.create_user(
                username=username,
                email=data['email'],
                password=data['password'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=User.ROLE_CUSTOMER,
                phone=data.get('phone', '')
            )

            # Create CustomerProfile with initial PENDING statuses
            profile = CustomerProfile.objects.create(
                user=user,
                customer_id=customer_id,
                branch=branch,
                date_of_birth=data.get('date_of_birth'),
                gender=data.get('gender', ''),
                address=data.get('address', ''),
                city=data.get('city', ''),
                state=data.get('state', ''),
                postal_code=data.get('postal_code', ''),
                nominee_name=data.get('nominee_name', ''),
                nominee_relationship=data.get('nominee_relationship', ''),
                nominee_phone=data.get('nominee_phone', ''),
                kyc_status=CustomerProfile.KYC_PENDING,
                verification_status=CustomerProfile.VERIFICATION_PENDING
            )

            # Determine requested account type and initial deposit
            account_type_req = data.get('account_type', 'SAVINGS')
            acc_type_code = Account.ACCOUNT_CURRENT if account_type_req == 'CURRENT' else Account.ACCOUNT_SAVINGS
            initial_deposit = data.get('initial_deposit') or Decimal('500.00')

            # Create primary Account with PENDING_VERIFICATION status
            # Restricted from financial operations until employee verification
            acc_num = f"100{random.randint(100000000, 999999999)}"
            account = Account.objects.create(
                customer=profile,
                account_number=acc_num,
                account_type=acc_type_code,
                balance=initial_deposit,
                currency='USD',
                status=Account.STATUS_PENDING_VERIFICATION
            )

            # Generate unique Application ID
            today_str = timezone.now().strftime('%Y%m%d')
            num_suffix = customer_id.replace('SB', '')
            app_id = f"APP-{today_str}-{num_suffix}"

            application = CustomerApplication.objects.create(
                application_id=app_id,
                customer=profile,
                branch=branch,
                status=CustomerApplication.STATUS_PENDING,
                kyc_status='PENDING',
                account_type_requested=account_type_req,
                initial_deposit_amount=initial_deposit,
                nominee_name=data.get('nominee_name', ''),
                nominee_relationship=data.get('nominee_relationship', ''),
                nominee_phone=data.get('nominee_phone', ''),
                terms_accepted=data.get('terms_accepted', True)
            )

            # Handle uploaded identity document if present in request
            id_doc_file = request.FILES.get('identity_document') or data.get('identity_document')
            id_type = data.get('identity_type', 'PASSPORT')
            id_number = data.get('identity_number', '')

            if id_doc_file:
                VerificationDocument.objects.create(
                    application=application,
                    document_type=VerificationDocument.TYPE_IDENTITY,
                    document_name=f"{id_type.replace('_', ' ').title()} - {user.get_full_name()}",
                    document_number=id_number,
                    file=id_doc_file,
                    file_name=getattr(id_doc_file, 'name', 'identity_document.pdf'),
                    file_size_bytes=getattr(id_doc_file, 'size', 0),
                    status=VerificationDocument.STATUS_PENDING
                )
                KYCRecord.objects.create(
                    customer=profile,
                    document_type=id_type if id_type in ['PASSPORT', 'NATIONAL_ID', 'DRIVING_LICENSE'] else 'PASSPORT',
                    document_number=id_number or f"ID-{customer_id}",
                    document_file=id_doc_file,
                    status=KYCRecord.STATUS_PENDING,
                    remarks="Uploaded during online customer account opening."
                )

            # Handle uploaded address proof document if present
            addr_doc_file = request.FILES.get('address_proof_document') or data.get('address_proof_document')
            addr_type = data.get('address_proof_type', 'UTILITY_BILL')
            if addr_doc_file:
                VerificationDocument.objects.create(
                    application=application,
                    document_type=VerificationDocument.TYPE_ADDRESS,
                    document_name=f"Address Proof ({addr_type.replace('_', ' ').title()})",
                    file=addr_doc_file,
                    file_name=getattr(addr_doc_file, 'name', 'address_proof.pdf'),
                    file_size_bytes=getattr(addr_doc_file, 'size', 0),
                    status=VerificationDocument.STATUS_PENDING
                )

            # Verification history audit record
            VerificationHistory.objects.create(
                application=application,
                employee=None,
                employee_name='Customer Self-Registration',
                previous_status='NONE',
                new_status=CustomerApplication.STATUS_PENDING,
                action='REGISTRATION_SUBMITTED',
                reason='Customer account opening application submitted online. Pending staff KYC review.'
            )

            token = Token.objects.create(user=user)

            # Customer welcome notification
            send_notification_to_user(
                user=user,
                title="SecureBank Account Opening Application Received",
                message=f"Your account opening application ({app_id}) has been submitted and is awaiting verification by our bank staff. Your Customer ID is {customer_id}.",
                notification_type='SYSTEM'
            )

            # Branch staff alert
            broadcast_branch_staff_alert(
                branch.id if branch else None,
                title="New Customer Account Opening Application",
                message=f"Application {app_id} registered for {user.get_full_name()} ({customer_id}). Awaiting staff verification.",
                alert_type='CUSTOMER_VERIFICATION_PENDING'
            )

            log_audit_event(
                actor=user,
                action='CUSTOMER_ACCOUNT_OPENING_SUBMITTED',
                target_model='CustomerApplication',
                target_id=app_id,
                details=f"Customer {customer_id} ({user.email}) registered online. Account {acc_num} set to PENDING_VERIFICATION.",
                branch=branch
            )

        return Response({
            'success': True,
            'token': token.key,
            'user': UserSerializer(user).data,
            'customer_id': customer_id,
            'account_number': acc_num,
            'application_id': app_id,
            'account_status': Account.STATUS_PENDING_VERIFICATION,
            'verification_status': CustomerProfile.VERIFICATION_PENDING,
            'registration_date': application.created_at.isoformat(),
            'redirect_url': '/customer/verification-status',
            'message': f"Your SecureBank application has been submitted successfully. Your Customer ID is {customer_id}. Your application is awaiting verification by our bank staff. You can use your Customer ID and password to log in and track your application."
        }, status=status.HTTP_201_CREATED)

class CustomerLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        if user.role != User.ROLE_CUSTOMER:
            return Response({
                'error': 'This login portal is reserved for SecureBank customer accounts only.'
            }, status=status.HTTP_403_FORBIDDEN)

        token, _ = Token.objects.get_or_create(user=user)
        is_verified = hasattr(user, 'customer_profile') and user.customer_profile.is_verified()
        verification_status = user.customer_profile.verification_status if hasattr(user, 'customer_profile') else 'PENDING'
        customer_id = user.customer_profile.customer_id if hasattr(user, 'customer_profile') else None

        # Redirect verified customers to dashboard; pending or info required to verification status
        redirect_url = '/customer/dashboard' if is_verified else '/customer/verification-status'

        ip = request.META.get('REMOTE_ADDR', '')
        log_audit_event(
            actor=user,
            action='CUSTOMER_LOGIN',
            target_model='User',
            target_id=user.id,
            details=f"Customer {customer_id} logged in. Verification status: {verification_status}",
            branch=user.get_assigned_branch(),
            ip_address=ip
        )

        return Response({
            'success': True,
            'token': token.key,
            'user': UserSerializer(user).data,
            'customer_id': customer_id,
            'verification_status': verification_status,
            'redirect_url': redirect_url,
            'message': f"Welcome back, {user.get_full_name() or user.username}!"
        })

class SetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        customer_id = data.get('customer_id')
        new_password = data['password']

        user = None
        if request.user and request.user.is_authenticated:
            user = request.user
        elif customer_id:
            profile = CustomerProfile.objects.filter(customer_id__iexact=customer_id).first()
            if profile:
                user = profile.user

        if not user:
            return Response({'error': 'Customer account not found.'}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(new_password)
        user.save()

        # Re-issue token
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)

        log_audit_event(
            actor=user,
            action='CUSTOMER_PASSWORD_SET',
            target_model='User',
            target_id=user.id,
            details=f"Password established securely for customer {getattr(user, 'customer_profile', user)}"
        )

        return Response({
            'success': True,
            'token': token.key,
            'message': 'Password has been set successfully. Please keep your credentials secure.'
        })

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()

        if user:
            reset_token = PasswordResetToken.create_for_user(user=user, expires_in_minutes=60)
            log_audit_event(
                actor=user,
                action='PASSWORD_RESET_REQUESTED',
                target_model='User',
                target_id=user.id,
                details=f"Password reset token generated for {user.email}"
            )
            return Response({
                'success': True,
                'message': 'A password reset token has been generated.',
                'reset_token': reset_token.token, # Exposed for demo convenience
                'instructions': 'Use this token on the reset confirmation form to update your password.'
            })
        else:
            return Response({
                'success': False,
                'message': 'If the provided email is registered, a password reset link has been processed.'
            })

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        token_obj = PasswordResetToken.objects.filter(token=token_str).first()
        if not token_obj or not token_obj.is_valid():
            return Response({'error': 'Invalid or expired password reset token.'}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        user.set_password(new_password)
        user.save()

        token_obj.used = True
        token_obj.save()

        # Revoke existing tokens
        Token.objects.filter(user=user).delete()

        log_audit_event(
            actor=user,
            action='PASSWORD_RESET_COMPLETED',
            target_model='User',
            target_id=user.id,
            details=f"User {user.username} completed password reset"
        )

        return Response({
            'success': True,
            'message': 'Password has been reset successfully. Please log in with your new password.'
        })

class BranchListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        branches = Branch.objects.all()
        return Response(BranchSerializer(branches, many=True).data)
