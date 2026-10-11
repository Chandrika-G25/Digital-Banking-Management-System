from rest_framework import permissions
from apps.accounts.models import User

class IsCustomer(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.ROLE_CUSTOMER)

class IsEmployee(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.ROLE_EMPLOYEE)

class IsBranchManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.ROLE_BRANCH_MANAGER)

class IsStaffMember(permissions.BasePermission):
    """Allows either Employee or Branch Manager"""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role in [User.ROLE_EMPLOYEE, User.ROLE_BRANCH_MANAGER]
        )

class IsVerifiedCustomer(permissions.BasePermission):
    """Allows only customers whose account verification status is VERIFIED."""
    message = "Account verification required. Your account is awaiting staff verification before financial transactions can be performed."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role == User.ROLE_CUSTOMER):
            return False
        profile = getattr(request.user, 'customer_profile', None)
        return bool(profile and profile.verification_status == 'VERIFIED')

class HasVerificationPermission(permissions.BasePermission):
    """
    Allows staff members (Employees or Branch Managers) who have the CUSTOMER_VERIFICATION permission.
    """
    message = "You do not have permission to verify customer accounts."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == User.ROLE_BRANCH_MANAGER:
            return True
        if request.user.role == User.ROLE_EMPLOYEE:
            profile = getattr(request.user, 'employee_profile', None)
            return bool(profile and getattr(profile, 'can_verify_customers', True))
        return False

def mask_email(email):
    if not email or '@' not in email:
        return '***@***.***'
    parts = email.split('@')
    name = parts[0]
    domain = parts[1]
    if len(name) <= 2:
        masked_name = name[0] + '*'
    else:
        masked_name = name[0] + '***' + name[-1]
    return f"{masked_name}@{domain}"

def mask_phone(phone):
    if not phone:
        return '***-***-****'
    cleaned = ''.join(c for c in phone if c.isdigit())
    if len(cleaned) >= 4:
        return f"***-***-{cleaned[-4:]}"
    return '***-***-****'

def filter_by_user_branch(queryset, user, branch_field='branch'):
    """
    Enforces branch-level scoping so employees and managers only access
    records tied to their assigned branch.
    """
    if user.is_superuser:
        return queryset
    branch = user.get_assigned_branch()
    if not branch:
        return queryset.none()
    filter_kwargs = {branch_field: branch}
    return queryset.filter(**filter_kwargs)

