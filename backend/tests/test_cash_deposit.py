from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from apps.accounts.models import User, Branch, CustomerProfile, EmployeeProfile
from apps.banking.models import (
    Account, Transaction, LedgerEntry, IdempotencyRecord,
    BranchCashDeposit, BranchDepositLimit
)
from apps.notifications.models import Notification
from apps.audit.models import AuditLog


class BranchCashDepositAcceptanceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'SecureTest123!'

        # 1. Setup Branches
        self.branch_a = Branch.objects.create(
            name='Central Metro Branch',
            code='MB01',
            address='100 Financial Boulevard',
            city='Mumbai',
            phone='+91 22 2345 6789'
        )
        self.branch_b = Branch.objects.create(
            name='North Delhi Branch',
            code='NB02',
            address='200 Parliament Street',
            city='New Delhi',
            phone='+91 11 2345 6789'
        )

        # Branch Limits for Branch A
        self.limits_a = BranchDepositLimit.objects.create(
            branch=self.branch_a,
            max_single_deposit=Decimal('100000.00'),
            requires_manager_approval_above=Decimal('50000.00'),
            daily_branch_deposit_limit=Decimal('2000000.00')
        )

        # 2. Setup Customer A (in Branch A)
        self.user_cust_a = User.objects.create_user(
            username='cust_alex',
            email='alex@example.com',
            password=self.password,
            first_name='Alex',
            last_name='Sharma',
            phone='+91 9876543210',
            role=User.ROLE_CUSTOMER
        )
        self.profile_cust_a = CustomerProfile.objects.create(
            user=self.user_cust_a,
            customer_id='CUST1001',
            branch=self.branch_a,
            kyc_status=CustomerProfile.KYC_VERIFIED
        )
        self.acc_cust_a = Account.objects.create(
            customer=self.profile_cust_a,
            account_number='100111222333',
            account_type=Account.ACCOUNT_SAVINGS,
            balance=Decimal('10000.00'),
            currency='INR',
            status=Account.STATUS_ACTIVE
        )
        self.token_cust_a = Token.objects.create(user=self.user_cust_a)

        # 3. Setup Customer B (in Branch B)
        self.user_cust_b = User.objects.create_user(
            username='cust_sarah',
            email='sarah@example.com',
            password=self.password,
            first_name='Sarah',
            last_name='Kapoor',
            phone='+91 9811122233',
            role=User.ROLE_CUSTOMER
        )
        self.profile_cust_b = CustomerProfile.objects.create(
            user=self.user_cust_b,
            customer_id='CUST2002',
            branch=self.branch_b,
            kyc_status=CustomerProfile.KYC_VERIFIED
        )
        self.acc_cust_b = Account.objects.create(
            customer=self.profile_cust_b,
            account_number='200222333444',
            account_type=Account.ACCOUNT_SAVINGS,
            balance=Decimal('5000.00'),
            currency='INR',
            status=Account.STATUS_ACTIVE
        )
        self.token_cust_b = Token.objects.create(user=self.user_cust_b)

        # 4. Setup Employee (assigned to Branch A)
        self.user_employee = User.objects.create_user(
            username='emp_elena',
            email='elena@securebank.com',
            password=self.password,
            first_name='Elena',
            last_name='Rostova',
            role=User.ROLE_EMPLOYEE
        )
        self.profile_employee = EmployeeProfile.objects.create(
            user=self.user_employee,
            employee_id='EMP9001',
            branch=self.branch_a,
            designation='Senior Cashier'
        )
        self.token_employee = Token.objects.create(user=self.user_employee)

        # 5. Setup Manager (assigned to Branch A)
        self.user_manager = User.objects.create_user(
            username='mgr_marcus',
            email='marcus@securebank.com',
            password=self.password,
            first_name='Marcus',
            last_name='Vance',
            role=User.ROLE_BRANCH_MANAGER
        )
        self.profile_manager = EmployeeProfile.objects.create(
            user=self.user_manager,
            employee_id='MGR9001',
            branch=self.branch_a,
            designation='Branch Manager'
        )
        self.token_manager = Token.objects.create(user=self.user_manager)

    # 1. Authorized employee can deposit money into the correct customer account
    def test_01_authorized_employee_can_deposit(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')
        payload = {
            'account_id': self.acc_cust_a.id,
            'amount': '5000.00',
            'depositor_name': 'Self Deposit',
            'remarks': 'Counter cash deposit test',
            'verification_confirmed': True
        }
        response = self.client.post('/api/v1/employee/deposits/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertTrue(response.data['reference_number'].startswith('DEP-'))
        self.assertEqual(response.data['account_number'], self.acc_cust_a.account_number)

    # 2. Correct account balance increases by exactly the deposit amount
    def test_02_account_balance_increases_by_exact_amount(self):
        initial_balance = self.acc_cust_a.balance
        deposit_amount = Decimal('3500.00')

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')
        payload = {
            'account_id': self.acc_cust_a.id,
            'amount': str(deposit_amount),
            'depositor_name': 'Alex Sharma',
            'remarks': 'Exact balance update verification',
            'verification_confirmed': True
        }
        response = self.client.post('/api/v1/employee/deposits/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.acc_cust_a.refresh_from_db()
        expected_balance = initial_balance + deposit_amount
        self.assertEqual(self.acc_cust_a.balance, expected_balance)

        # Check ledger entry matches
        ledger_entry = LedgerEntry.objects.filter(
            account=self.acc_cust_a,
            entry_type=LedgerEntry.ENTRY_CREDIT
        ).order_by('-id').first()
        self.assertIsNotNone(ledger_entry)
        self.assertEqual(ledger_entry.amount, deposit_amount)
        self.assertEqual(ledger_entry.balance_after, expected_balance)

    # 3. Deposit appears in customer's transaction history
    def test_03_deposit_appears_in_customer_transaction_history(self):
        # Process deposit as employee
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')
        payload = {
            'account_id': self.acc_cust_a.id,
            'amount': '4200.00',
            'depositor_name': 'Ramesh Kumar',
            'remarks': 'Utility payment deposit',
            'verification_confirmed': True
        }
        dep_resp = self.client.post('/api/v1/employee/deposits/', payload, format='json')
        ref_num = dep_resp.data['reference_number']

        # Query customer transaction history as customer
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_cust_a.key}')
        history_resp = self.client.get('/api/v1/customer/transactions/')
        self.assertEqual(history_resp.status_code, status.HTTP_200_OK)

        txn_refs = [t['reference_number'] for t in history_resp.data]
        self.assertIn(ref_num, txn_refs)

        matched_txn = next(t for t in history_resp.data if t['reference_number'] == ref_num)
        self.assertEqual(matched_txn['transaction_type'], Transaction.TXN_CASH_DEPOSIT)
        self.assertEqual(Decimal(str(matched_txn['amount'])), Decimal('4200.00'))

    # 4. Customer receives a real-time notification after a successful deposit
    def test_04_customer_receives_real_time_notification(self):
        deposit_amount = Decimal('7500.00')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')
        payload = {
            'account_id': self.acc_cust_a.id,
            'amount': str(deposit_amount),
            'depositor_name': 'Alex Sharma',
            'verification_confirmed': True
        }
        resp = self.client.post('/api/v1/employee/deposits/', payload, format='json')
        ref_num = resp.data['reference_number']

        last_four = self.acc_cust_a.account_number[-4:]
        expected_notif_text = f"Cash deposit successful. ₹{deposit_amount:,.2f} has been credited to your account ending in {last_four}. Reference: {ref_num}."

        notif = Notification.objects.filter(user=self.user_cust_a).order_by('-id').first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.message, expected_notif_text)

    # 5. Unauthorized customer cannot use employee deposit API
    def test_05_unauthorized_customer_cannot_use_deposit_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_cust_a.key}')
        payload = {
            'account_id': self.acc_cust_a.id,
            'amount': '10000.00',
            'verification_confirmed': True
        }
        response = self.client.post('/api/v1/employee/deposits/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # 6. Employee cannot access an unauthorized branch's accounts
    def test_06_employee_cannot_access_unauthorized_branch_accounts(self):
        # Elena is assigned to Branch A. Customer Sarah belongs to Branch B.
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')
        payload = {
            'account_id': self.acc_cust_b.id,
            'amount': '2000.00',
            'verification_confirmed': True
        }
        response = self.client.post('/api/v1/employee/deposits/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Audit log must record unauthorized branch access attempt
        audit = AuditLog.objects.filter(action='UNAUTHORIZED_BRANCH_DEPOSIT_ATTEMPT').first()
        self.assertIsNotNone(audit)

    # 7. Invalid amounts and ineligible accounts are rejected
    def test_07_invalid_amounts_and_ineligible_accounts_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')

        # Negative amount
        resp_neg = self.client.post('/api/v1/employee/deposits/', {
            'account_id': self.acc_cust_a.id,
            'amount': '-500.00',
            'verification_confirmed': True
        }, format='json')
        self.assertEqual(resp_neg.status_code, status.HTTP_400_BAD_REQUEST)

        # Zero amount
        resp_zero = self.client.post('/api/v1/employee/deposits/', {
            'account_id': self.acc_cust_a.id,
            'amount': '0.00',
            'verification_confirmed': True
        }, format='json')
        self.assertEqual(resp_zero.status_code, status.HTTP_400_BAD_REQUEST)

        # Unverified identity
        resp_unver = self.client.post('/api/v1/employee/deposits/', {
            'account_id': self.acc_cust_a.id,
            'amount': '1000.00',
            'verification_confirmed': False
        }, format='json')
        self.assertEqual(resp_unver.status_code, status.HTTP_400_BAD_REQUEST)

        # Frozen account
        self.acc_cust_a.status = Account.STATUS_FROZEN
        self.acc_cust_a.save()

        resp_frozen = self.client.post('/api/v1/employee/deposits/', {
            'account_id': self.acc_cust_a.id,
            'amount': '1000.00',
            'verification_confirmed': True
        }, format='json')
        self.assertEqual(resp_frozen.status_code, status.HTTP_400_BAD_REQUEST)

    # 8. Duplicate requests do not create duplicate deposits (Idempotency)
    def test_08_duplicate_requests_do_not_create_duplicate_deposits(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')
        idemp_key = 'IDEMP-TEST-DEPOSIT-99999'

        payload = {
            'account_id': self.acc_cust_a.id,
            'amount': '1500.00',
            'verification_confirmed': True,
            'idempotency_key': idemp_key
        }

        # First submission
        resp1 = self.client.post(
            '/api/v1/employee/deposits/',
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idemp_key
        )
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.acc_cust_a.refresh_from_db()
        balance_after_first = self.acc_cust_a.balance

        # Repeated submission
        resp2 = self.client.post(
            '/api/v1/employee/deposits/',
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idemp_key
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)

        # Balance must NOT increase a second time
        self.acc_cust_a.refresh_from_db()
        self.assertEqual(self.acc_cust_a.balance, balance_after_first)

    # 9. Database failures roll back all related balance, transaction, and ledger changes
    def test_09_database_failures_rollback_all_changes(self):
        initial_balance = self.acc_cust_a.balance
        initial_txn_count = Transaction.objects.count()
        initial_ledger_count = LedgerEntry.objects.count()

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')

        # Force an unexpected exception during BranchCashDeposit creation
        with patch('apps.banking.models.BranchCashDeposit.objects.create', side_effect=Exception("Database write failure simulation")):
            with self.assertRaises(Exception):
                self.client.post('/api/v1/employee/deposits/', {
                    'account_id': self.acc_cust_a.id,
                    'amount': '3000.00',
                    'verification_confirmed': True
                }, format='json')

        # Verify atomic rollback
        self.acc_cust_a.refresh_from_db()
        self.assertEqual(self.acc_cust_a.balance, initial_balance)
        self.assertEqual(Transaction.objects.count(), initial_txn_count)
        self.assertEqual(LedgerEntry.objects.count(), initial_ledger_count)

    # 10. Manager's reports reflect completed deposits accurately
    def test_10_manager_reports_reflect_completed_deposits(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_employee.key}')

        # Process two deposits in Branch A
        self.client.post('/api/v1/employee/deposits/', {
            'account_id': self.acc_cust_a.id,
            'amount': '2500.00',
            'verification_confirmed': True
        }, format='json')

        self.client.post('/api/v1/employee/deposits/', {
            'account_id': self.acc_cust_a.id,
            'amount': '5500.00',
            'verification_confirmed': True
        }, format='json')

        # Retrieve summary as Manager Marcus
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_manager.key}')
        mgr_resp = self.client.get('/api/v1/manager/deposits/summary/')
        self.assertEqual(mgr_resp.status_code, status.HTTP_200_OK)

        self.assertEqual(Decimal(mgr_resp.data['today']['total_amount']), Decimal('8000.00'))
        self.assertEqual(mgr_resp.data['today']['total_count'], 2)
        self.assertTrue(len(mgr_resp.data['employee_breakdown']) >= 1)
        self.assertEqual(len(mgr_resp.data['recent_deposits']), 2)
