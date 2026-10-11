from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from apps.accounts.permissions import IsStaffMember, IsBranchManager
from apps.banking.services import CashDepositService
from apps.banking.serializers import (
    CashDepositRequestSerializer,
    BranchCashDepositSerializer,
    DepositReversalRequestSerializer
)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


class EmployeeCustomerSearchView(APIView):
    """
    GET /api/v1/employee/deposits/customer-search/?query=...
    Searches eligible customers and active accounts for physical counter deposits.
    Restricted to authorized branch staff; enforces branch-level access scoping.
    """
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        query = request.query_params.get('query') or request.query_params.get('q') or ''
        customers = CashDepositService.search_eligible_customers(request.user, query)
        return Response(customers, status=status.HTTP_200_OK)


class EmployeeCashDepositView(APIView):
    """
    POST /api/v1/employee/deposits/
    Processes an authenticated counter cash deposit with atomic database locking,
    double-entry ledger creation, idempotency validation, and real-time customer WebSocket updates.
    """
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        qs = CashDepositService.get_deposit_history(request.user, request.query_params)
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = BranchCashDepositSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        idempotency_key = request.headers.get('Idempotency-Key') or request.data.get('idempotency_key')
        
        serializer = CashDepositRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))

        result, created = CashDepositService.process_cash_deposit(
            employee_user=request.user,
            account_id=data['account_id'],
            amount_val=data['amount'],
            depositor_name=data.get('depositor_name', ''),
            depositor_phone=data.get('depositor_phone', ''),
            remarks=data.get('remarks', ''),
            verification_confirmed=data.get('verification_confirmed', False),
            idempotency_key=idempotency_key or data.get('idempotency_key'),
            ip_address=ip_address
        )

        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(result, status=status_code)


class EmployeeDepositHistoryView(APIView):
    """
    GET /api/v1/employee/deposits/
    Retrieves deposit history filtered by branch, date, employee, or status with pagination.
    """
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        qs = CashDepositService.get_deposit_history(request.user, request.query_params)
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = BranchCashDepositSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class EmployeeDepositDetailView(APIView):
    """
    GET /api/v1/employee/deposits/{reference}/
    Retrieves full details for a specific cash deposit receipt.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        dep = CashDepositService.get_deposit_by_reference(request.user, reference)
        if not dep:
            return Response({'error': 'Deposit transaction not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(dep, status=status.HTTP_200_OK)


class ManagerDepositSummaryView(APIView):
    """
    GET /api/v1/manager/deposits/summary/
    Retrieves branch deposit metrics, teller performance, unusual activity, and limit configurations.
    """
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request):
        summary = CashDepositService.get_manager_summary(request.user)
        return Response(summary, status=status.HTTP_200_OK)


class ManagerDepositReversalView(APIView):
    """
    POST /api/v1/manager/deposits/{reference}/reverse/
    Executes a manager-authorized reversal of a counter deposit with immutable audit logging.
    """
    permission_classes = [IsAuthenticated, IsBranchManager]

    def post(self, request, reference):
        serializer = DepositReversalRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
        result = CashDepositService.reverse_cash_deposit(
            manager_user=request.user,
            reference_number=reference,
            reason=serializer.validated_data['reason'],
            ip_address=ip_address
        )
        return Response(result, status=status.HTTP_200_OK)
