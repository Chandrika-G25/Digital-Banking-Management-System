from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from apps.accounts.models import User, Branch, CustomerProfile, EmployeeProfile
from apps.banking.models import Account, Beneficiary, Transaction, LedgerEntry, IdempotencyRecord
from apps.banking.services import TransferService
from apps.approvals.models import ApprovalRequest, LoanApplication
from apps.audit.models import AuditLog

class SecureBankSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'SecureTest123!'

        # Branches
        self.branch_a = Branch.objects.create(name='Main Branch', code='MB01', address='100 Main St', city='Metro', phone='555-01')
        self.branch_b = Branch.objects.create(name='North Branch', code='NB02', address='200 North St', city='Metro', phone='555-02')

        # Customer A
        self.user_customer = User.objects.create_user(
            username='cust_alex', email='alex@example.com', password=self.password,
            first_name='Alex', last_name='Vance', role=User.ROLE_CUSTOMER
        )
        self.profile_customer = CustomerProfile.objects.create(
            user=self.user_customer, customer_id='CUST9001', branch=self.branch_a,
            verification_status='VERIFIED', kyc_status='VERIFIED'
        )
        self.acc_cust_savings = Account.objects.create(
            customer=self.profile_customer, account_number='111122223333',
            account_type=Account.ACCOUNT_SAVINGS, balance=Decimal('5000.00'), status=Account.STATUS_ACTIVE
        )
        self.token_customer = Token.objects.create(user=self.user_customer)

        # Customer B
        self.user_customer_b = User.objects.create_user(
            username='cust_sarah', email='sarah@example.com', password=self.password,
            first_name='Sarah', last_name='Jenkins', role=User.ROLE_CUSTOMER
        )
        self.profile_customer_b = CustomerProfile.objects.create(
            user=self.user_customer_b, customer_id='CUST9002', branch=self.branch_b,
            verification_status='VERIFIED', kyc_status='VERIFIED'
        )
        self.acc_cust_b = Account.objects.create(
            customer=self.profile_customer_b, account_number='444455556666',
            account_type=Account.ACCOUNT_SAVINGS, balance=Decimal('1000.00'), status=Account.STATUS_ACTIVE
        )
        self.token_customer_b = Token.objects.create(user=self.user_customer_b)

        # Employee
        self.user_employee = User.objects.create_user(
            username='emp_elena', email='elena@example.com', password=self.password,
            first_name='Elena', last_name='Rostova', role=User.ROLE_EMPLOYEE
        )
        self.profile_employee = EmployeeProfile.objects.create(
            user=self.user_employee, employee_id='EMP9001', branch=self.branch_a
        )
        self.token_employee = Token.objects.create(user=self.user_employee)

        # Branch Manager A
        self.user_manager = User.objects.create_user(
            username='mgr_marcus', email='marcus@example.com', password=self.password,
            first_name='Marcus', last_name='Sterling', role=User.ROLE_BRANCH_MANAGER
        )
        self.profile_manager = EmployeeProfile.objects.create(
            user=self.user_manager, employee_id='MGR9001', branch=self.branch_a
        )
        self.token_manager = Token.objects.create(user=self.user_manager)

    # 1. Login and Logout Tests
    def test_login_successful_and_logout(self):
        login_url = reverse('auth-login')
        response = self.client.post(login_url, {
            'identifier': 'cust_alex',
            'password': self.password,
            'expected_role': User.ROLE_CUSTOMER
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        token = response.data['token']

        # Logout with token
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        logout_url = reverse('auth-logout')
        logout_resp = self.client.post(logout_url)
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)

    def test_role_portal_rejection(self):
        """Prevent customer from logging in via employee portal"""
        login_url = reverse('auth-login')
        response = self.client.post(login_url, {
            'identifier': 'cust_alex',
            'password': self.password,
            'expected_role': User.ROLE_EMPLOYEE
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 2. Role-based Authorization Tests
    def test_customer_cannot_access_manager_dashboard(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_customer.key}')
        response = self.client.get(reverse('manager-dashboard'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_cannot_access_manager_approvals(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')
        response = self.client.get(reverse('manager-approvals'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # 3. Account Balance and Retrieval Tests
    def test_customer_account_retrieval(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_customer.key}')
        response = self.client.get(reverse('customer-accounts'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['account_number'], '111122223333')

    # 4. Successful Transfer with Atomic Double-Entry Ledger
    def test_successful_internal_transfer(self):
        res, created = TransferService.execute_internal_transfer(
            user=self.user_customer,
            sender_account_id=self.acc_cust_savings.id,
            receiver_account_number='444455556666',
            amount_val='250.00',
            description='Test transfer'
        )
        self.assertTrue(res['success'])

        # Verify balances in SQL DB
        self.acc_cust_savings.refresh_from_db()
        self.acc_cust_b.refresh_from_db()
        self.assertEqual(self.acc_cust_savings.balance, Decimal('4750.00'))
        self.assertEqual(self.acc_cust_b.balance, Decimal('1250.00'))

        # Verify Ledger Entries
        txn = Transaction.objects.get(reference_number=res['reference_number'])
        ledgers = LedgerEntry.objects.filter(transaction=txn)
        self.assertEqual(ledgers.count(), 2)

        debit = ledgers.get(entry_type=LedgerEntry.ENTRY_DEBIT)
        credit = ledgers.get(entry_type=LedgerEntry.ENTRY_CREDIT)
        self.assertEqual(debit.amount, Decimal('250.00'))
        self.assertEqual(credit.amount, Decimal('250.00'))

    # 5. Insufficient Funds Handling
    def test_insufficient_funds(self):
        with self.assertRaises(Exception):
            TransferService.execute_internal_transfer(
                user=self.user_customer,
                sender_account_id=self.acc_cust_savings.id,
                receiver_account_number='444455556666',
                amount_val='10000.00'
            )

    # 6. Invalid Beneficiary Handling
    def test_invalid_beneficiary(self):
        with self.assertRaises(Exception):
            TransferService.execute_internal_transfer(
                user=self.user_customer,
                sender_account_id=self.acc_cust_savings.id,
                receiver_account_number='999999999999', # Non-existent
                amount_val='100.00'
            )

    # 7. Duplicate Transfer Prevention via Idempotency
    def test_idempotency_prevents_duplicate_transfers(self):
        key = 'unique-idemp-key-xyz-123'
        res1, created1 = TransferService.execute_internal_transfer(
            user=self.user_customer,
            sender_account_id=self.acc_cust_savings.id,
            receiver_account_number='444455556666',
            amount_val='100.00',
            idempotency_key=key
        )
        self.assertTrue(created1)

        # Retry with same idempotency key
        res2, created2 = TransferService.execute_internal_transfer(
            user=self.user_customer,
            sender_account_id=self.acc_cust_savings.id,
            receiver_account_number='444455556666',
            amount_val='100.00',
            idempotency_key=key
        )
        self.assertFalse(created2) # Reused, not created again!

        # Balance was only debited once!
        self.acc_cust_savings.refresh_from_db()
        self.assertEqual(self.acc_cust_savings.balance, Decimal('4900.00'))

    # 8. Maker-Checker Verification
    def test_maker_checker_approval_workflow(self):
        """Initiator cannot approve their own high-risk request"""
        approval = ApprovalRequest.objects.create(
            branch=self.branch_a,
            request_type=ApprovalRequest.TYPE_LOAN_APPROVAL,
            entity_id='LOAN-TEST-01',
            details='Testing maker checker',
            initiated_by=self.user_employee, # Maker
            status=ApprovalRequest.STATUS_PENDING
        )

        # Manager is a different user (Marcus), should succeed
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_manager.key}')
        decide_url = reverse('manager-approvals')
        resp = self.client.post(decide_url, {
            'id': approval.id,
            'decision': 'APPROVED',
            'decision_notes': 'Verified collateral'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        approval.refresh_from_db()
        self.assertEqual(approval.status, 'APPROVED')

    def test_maker_checker_violation_blocked(self):
        """If manager initiates a request, that manager cannot approve it!"""
        approval = ApprovalRequest.objects.create(
            branch=self.branch_a,
            request_type=ApprovalRequest.TYPE_HIGH_VALUE_TRANSFER,
            entity_id='TXN-TEST-99',
            details='High-risk transfer override',
            initiated_by=self.user_manager, # Maker is Marcus
            status=ApprovalRequest.STATUS_PENDING
        )

        # Marcus tries to approve his own request
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_manager.key}')
        decide_url = reverse('manager-approvals')
        resp = self.client.post(decide_url, {
            'id': approval.id,
            'decision': 'APPROVED'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Maker-checker violation', resp.data['error'])

    # 9. Audit Logging Verification
    def test_audit_log_recorded_on_transfer(self):
        TransferService.execute_internal_transfer(
            user=self.user_customer,
            sender_account_id=self.acc_cust_savings.id,
            receiver_account_number='444455556666',
            amount_val='50.00'
        )
        logs = AuditLog.objects.filter(actor=self.user_customer, action='FUNDS_TRANSFER')
        self.assertTrue(logs.exists())
