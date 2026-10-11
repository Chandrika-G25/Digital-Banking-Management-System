import os
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

from apps.accounts.models import (
    Branch, CustomerProfile, EmployeeProfile,
    CustomerApplication, VerificationDocument, VerificationHistory
)
from apps.banking.models import Account, Beneficiary, Transaction, LedgerEntry, BillPayment
from apps.approvals.models import LoanApplication, KYCRecord, ServiceRequest, ApprovalRequest
from apps.notifications.models import Notification
from apps.audit.models import AuditLog

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds database with comprehensive, realistic SecureBank demo data."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initializing SecureBank demo database seeding..."))
        demo_password = os.getenv('DEMO_PASSWORD', 'DemoPass123!')

        # 1. Create Branches
        metro_branch, _ = Branch.objects.get_or_create(
            code='METRO01',
            defaults={
                'name': 'Downtown Metro Main Branch',
                'address': '100 Financial Center Blvd, Suite 400',
                'city': 'Metropolis',
                'phone': '+1 (555) 019-2831'
            }
        )

        west_branch, _ = Branch.objects.get_or_create(
            code='WEST02',
            defaults={
                'name': 'Westside Commercial Branch',
                'address': '450 West Horizon Avenue',
                'city': 'Westport',
                'phone': '+1 (555) 018-9942'
            }
        )
        self.stdout.write(self.style.SUCCESS("[OK] Branches verified."))

        # 2. Create Primary Customer: Alexander Vance
        cust_user, created = User.objects.get_or_create(
            username='customer',
            defaults={
                'email': 'customer@securebank.com',
                'first_name': 'Alexander',
                'last_name': 'Vance',
                'role': User.ROLE_CUSTOMER,
                'phone': '+1 (555) 432-1098'
            }
        )
        cust_user.set_password(demo_password)
        cust_user.save()
        Token.objects.get_or_create(user=cust_user)

        cust_profile, _ = CustomerProfile.objects.get_or_create(
            user=cust_user,
            defaults={
                'customer_id': 'CUST1001',
                'branch': metro_branch,
                'address': '742 Evergreen Terrace, Metropolis',
                'kyc_status': CustomerProfile.KYC_VERIFIED
            }
        )

        # Customer Accounts
        savings_acc, _ = Account.objects.get_or_create(
            account_number='100192837465',
            defaults={
                'customer': cust_profile,
                'account_type': Account.ACCOUNT_SAVINGS,
                'balance': Decimal('15450.00'),
                'currency': 'USD',
                'status': Account.STATUS_ACTIVE
            }
        )

        current_acc, _ = Account.objects.get_or_create(
            account_number='200984736251',
            defaults={
                'customer': cust_profile,
                'account_type': Account.ACCOUNT_CURRENT,
                'balance': Decimal('4820.50'),
                'currency': 'USD',
                'status': Account.STATUS_ACTIVE
            }
        )
        self.stdout.write(self.style.SUCCESS("[OK] Customer user & accounts created."))

        # 3. Create Second Customer (for transfers): Sarah Jenkins
        cust2_user, _ = User.objects.get_or_create(
            username='sarah.jenkins',
            defaults={
                'email': 'sarah.j@example.com',
                'first_name': 'Sarah',
                'last_name': 'Jenkins',
                'role': User.ROLE_CUSTOMER,
                'phone': '+1 (555) 887-6655'
            }
        )
        cust2_user.set_password(demo_password)
        cust2_user.save()
        Token.objects.get_or_create(user=cust2_user)

        cust2_profile, _ = CustomerProfile.objects.get_or_create(
            user=cust2_user,
            defaults={
                'customer_id': 'CUST1002',
                'branch': metro_branch,
                'address': '128 Willow Creek Road, Metropolis',
                'kyc_status': CustomerProfile.KYC_VERIFIED
            }
        )

        cust2_acc, _ = Account.objects.get_or_create(
            account_number='100554433221',
            defaults={
                'customer': cust2_profile,
                'account_type': Account.ACCOUNT_SAVINGS,
                'balance': Decimal('9200.00'),
                'currency': 'USD',
                'status': Account.STATUS_ACTIVE
            }
        )

        # 4. Create Employee: Elena Rostova
        emp_user, _ = User.objects.get_or_create(
            username='employee',
            defaults={
                'email': 'employee@securebank.com',
                'first_name': 'Elena',
                'last_name': 'Rostova',
                'role': User.ROLE_EMPLOYEE,
                'phone': '+1 (555) 321-9876'
            }
        )
        emp_user.set_password(demo_password)
        emp_user.save()
        Token.objects.get_or_create(user=emp_user)

        EmployeeProfile.objects.get_or_create(
            user=emp_user,
            defaults={
                'employee_id': 'EMP2001',
                'branch': metro_branch,
                'department': 'Branch Operations',
                'designation': 'Senior Banking Specialist'
            }
        )
        self.stdout.write(self.style.SUCCESS("[OK] Employee user created."))

        # 5. Create Branch Manager: Marcus Sterling
        mgr_user, _ = User.objects.get_or_create(
            username='manager',
            defaults={
                'email': 'manager@securebank.com',
                'first_name': 'Marcus',
                'last_name': 'Sterling',
                'role': User.ROLE_BRANCH_MANAGER,
                'phone': '+1 (555) 901-2345'
            }
        )
        mgr_user.set_password(demo_password)
        mgr_user.save()
        Token.objects.get_or_create(user=mgr_user)

        EmployeeProfile.objects.get_or_create(
            user=mgr_user,
            defaults={
                'employee_id': 'MGR3001',
                'branch': metro_branch,
                'department': 'Executive Management',
                'designation': 'Branch General Director'
            }
        )
        self.stdout.write(self.style.SUCCESS("[OK] Branch Manager user created."))

        # 6. Create Saved Beneficiaries for Alexander
        Beneficiary.objects.get_or_create(
            customer=cust_profile,
            account_number='100554433221',
            defaults={
                'name': 'Sarah Jenkins',
                'bank_name': 'SecureBank',
                'nickname': 'Sarah (Friend)'
            }
        )
        Beneficiary.objects.get_or_create(
            customer=cust_profile,
            account_number='100998877665',
            defaults={
                'name': 'Apex Cloud Hosting LLC',
                'bank_name': 'SecureBank',
                'nickname': 'Cloud Services'
            }
        )

        # 7. Seed Transactions and Ledgers
        now = timezone.now()
        demo_txns = [
            {
                'ref': 'TXN-20261001-A1B2C3D4',
                'from': None,
                'to': savings_acc,
                'amt': Decimal('4500.00'),
                'type': Transaction.TXN_DEPOSIT,
                'desc': 'Direct Deposit Payroll - Global Technologies',
                'time': now - timedelta(days=8)
            },
            {
                'ref': 'TXN-20261003-E5F6G7H8',
                'from': savings_acc,
                'to': current_acc,
                'amt': Decimal('1200.00'),
                'type': Transaction.TXN_TRANSFER,
                'desc': 'Internal allocation to Current Account',
                'time': now - timedelta(days=6)
            },
            {
                'ref': 'TXN-20261005-I9J0K1L2',
                'from': savings_acc,
                'to': cust2_acc,
                'amt': Decimal('350.00'),
                'type': Transaction.TXN_TRANSFER,
                'desc': 'Reimbursement for weekend project retreat',
                'time': now - timedelta(days=4)
            },
            {
                'ref': 'TXN-20261007-M3N4O5P6',
                'from': current_acc,
                'to': None,
                'amt': Decimal('145.20'),
                'type': Transaction.TXN_BILL_PAYMENT,
                'desc': 'Metro Power Grid Monthly Electricity Invoice',
                'time': now - timedelta(days=2)
            },
            {
                'ref': 'TXN-20261008-Q7R8S9T0',
                'from': current_acc,
                'to': None,
                'amt': Decimal('79.99'),
                'type': Transaction.TXN_BILL_PAYMENT,
                'desc': 'Apex Fiber Broadband Internet Bill',
                'time': now - timedelta(hours=14)
            },
        ]

        for d in demo_txns:
            txn, created_txn = Transaction.objects.get_or_create(
                reference_number=d['ref'],
                defaults={
                    'from_account': d['from'],
                    'to_account': d['to'],
                    'amount': d['amt'],
                    'transaction_type': d['type'],
                    'status': Transaction.STATUS_COMPLETED,
                    'description': d['desc'],
                    'timestamp': d['time']
                }
            )
            if created_txn:
                if d['from']:
                    LedgerEntry.objects.create(
                        transaction=txn,
                        account=d['from'],
                        entry_type=LedgerEntry.ENTRY_DEBIT,
                        amount=d['amt'],
                        balance_after=d['from'].balance,
                        timestamp=d['time']
                    )
                if d['to']:
                    LedgerEntry.objects.create(
                        transaction=txn,
                        account=d['to'],
                        entry_type=LedgerEntry.ENTRY_CREDIT,
                        amount=d['amt'],
                        balance_after=d['to'].balance,
                        timestamp=d['time']
                    )

        # 8. Seed Bill Payments
        BillPayment.objects.get_or_create(
            bill_reference='ELEC-2026-991',
            defaults={
                'customer': cust_profile,
                'account': current_acc,
                'biller_name': 'Metro Power Grid',
                'biller_category': BillPayment.CATEGORY_ELECTRICITY,
                'amount': Decimal('145.20'),
                'status': 'PAID'
            }
        )
        BillPayment.objects.get_or_create(
            bill_reference='FIBER-884-21',
            defaults={
                'customer': cust_profile,
                'account': current_acc,
                'biller_name': 'Apex Fiber Broadband',
                'biller_category': BillPayment.CATEGORY_INTERNET,
                'amount': Decimal('79.99'),
                'status': 'PAID'
            }
        )

        # 9. Seed Loan Applications
        LoanApplication.objects.get_or_create(
            customer=cust_profile,
            loan_type=LoanApplication.TYPE_PERSONAL,
            defaults={
                'branch': metro_branch,
                'amount': Decimal('8500.00'),
                'term_months': 24,
                'purpose': 'Home office equipment and software workstation upgrade',
                'status': LoanApplication.STATUS_APPROVED,
                'reviewed_by': mgr_user,
                'reviewed_at': now - timedelta(days=10),
                'notes': 'Verified excellent credit standing and strong deposit history.'
            }
        )
        LoanApplication.objects.get_or_create(
            customer=cust_profile,
            loan_type=LoanApplication.TYPE_HOME,
            defaults={
                'branch': metro_branch,
                'amount': Decimal('35000.00'),
                'term_months': 60,
                'purpose': 'Residential renovation and energy-efficient solar insulation',
                'status': LoanApplication.STATUS_PENDING,
                'notes': 'Pending secondary income statement verification.'
            }
        )

        # 10. Seed KYC Record
        KYCRecord.objects.get_or_create(
            customer=cust_profile,
            document_number='US-PASS-98271034',
            defaults={
                'document_type': KYCRecord.DOC_PASSPORT,
                'status': KYCRecord.STATUS_APPROVED,
                'verified_by': emp_user,
                'verified_at': now - timedelta(days=30),
                'remarks': 'Document validated and matched with official biometric records.'
            }
        )

        # 11. Seed Service Requests
        ServiceRequest.objects.get_or_create(
            customer=cust_profile,
            subject='Request Contactless Metal Debit Card',
            defaults={
                'branch': metro_branch,
                'request_type': ServiceRequest.TYPE_CARD_REPLACEMENT,
                'description': 'Requesting upgrade to premium contactless titanium debit card.',
                'status': ServiceRequest.STATUS_IN_PROGRESS,
                'assigned_to': emp_user
            }
        )

        # 12. Seed Approval Request with Maker-Checker Scenario
        # Initiated by Elena (Employee), Marcus (Manager) is the checker who can approve it!
        ApprovalRequest.objects.get_or_create(
            entity_id='LOAN-APP-35000',
            defaults={
                'branch': metro_branch,
                'request_type': ApprovalRequest.TYPE_LOAN_APPROVAL,
                'details': 'High-value home renovation loan request for $35,000 for Alexander Vance (CUST1001). Underwriter review complete.',
                'initiated_by': emp_user, # Maker
                'status': ApprovalRequest.STATUS_PENDING
            }
        )

        # 13. Seed Notifications for Customer
        Notification.objects.get_or_create(
            user=cust_user,
            title='Direct Deposit Received',
            defaults={
                'message': 'Your account ending in 7465 received $4,500.00 from Global Technologies.',
                'notification_type': Notification.TYPE_TRANSACTION,
                'is_read': False
            }
        )
        Notification.objects.get_or_create(
            user=cust_user,
            title='Security Audit Notice',
            defaults={
                'message': 'Two-factor session authentication verified from IP 192.168.1.10.',
                'notification_type': Notification.TYPE_SECURITY,
                'is_read': True
            }
        )

        # 14. Seed Audit Logs
        AuditLog.objects.get_or_create(
            action='SYSTEM_SEED_COMPLETED',
            defaults={
                'actor': None,
                'target_model': 'System',
                'target_id': '0',
                'details': 'SecureBank demo environment initialized successfully.',
                'branch': metro_branch,
                'ip_address': '127.0.0.1'
            }
        )

        # 15. Seed Branch Deposit Limits & Initial Counter Cash Deposits
        from apps.banking.models import BranchDepositLimit, BranchCashDeposit
        BranchDepositLimit.objects.get_or_create(
            branch=metro_branch,
            defaults={
                'max_single_deposit': Decimal('100000.00'),
                'requires_manager_approval_above': Decimal('50000.00'),
                'daily_branch_deposit_limit': Decimal('2000000.00')
            }
        )
        BranchDepositLimit.objects.get_or_create(
            branch=west_branch,
            defaults={
                'max_single_deposit': Decimal('100000.00'),
                'requires_manager_approval_above': Decimal('50000.00'),
                'daily_branch_deposit_limit': Decimal('1500000.00')
            }
        )

        dep_txn, _ = Transaction.objects.get_or_create(
            reference_number='DEP-20261009-METRO101',
            defaults={
                'from_account': None,
                'to_account': savings_acc,
                'amount': Decimal('15000.00'),
                'transaction_type': Transaction.TXN_CASH_DEPOSIT,
                'status': Transaction.STATUS_COMPLETED,
                'description': f"Branch Counter Cash Deposit at {metro_branch.name} - Depositor: Alexander Vance"
            }
        )
        BranchCashDeposit.objects.get_or_create(
            reference_number='DEP-20261009-METRO101',
            defaults={
                'transaction': dep_txn,
                'customer': cust_profile,
                'account': savings_acc,
                'employee': emp_user,
                'branch': metro_branch,
                'amount': Decimal('15000.00'),
                'depositor_name': 'Alexander Vance',
                'remarks': 'Walk-in cash counter deposit (Initial branch credit)',
                'status': BranchCashDeposit.STATUS_COMPLETED
            }
        )
        self.stdout.write(self.style.SUCCESS("[OK] Branch deposit limits & counter records seeded."))

        # -------------------------------------------------------------
        # 11. Seed Customer Verification Applications & Documents
        # -------------------------------------------------------------
        # Alexander Vance: VERIFIED
        cust_profile.verification_status = CustomerProfile.VERIFICATION_VERIFIED
        cust_profile.save(update_fields=['verification_status'])

        vance_app, _ = CustomerApplication.objects.get_or_create(
            application_id='APP-20261001-1001',
            defaults={
                'customer': cust_profile,
                'branch': metro_branch,
                'status': CustomerApplication.STATUS_VERIFIED,
                'kyc_status': 'VERIFIED',
                'reviewed_by': emp_user,
                'reviewed_at': timezone.now() - timedelta(days=10)
            }
        )
        VerificationDocument.objects.get_or_create(
            application=vance_app,
            document_type=VerificationDocument.TYPE_IDENTITY,
            defaults={
                'document_name': 'US Passport - Alexander Vance',
                'document_number': 'P89201928',
                'status': VerificationDocument.STATUS_VERIFIED,
                'reviewed_by': emp_user,
                'reviewed_at': timezone.now() - timedelta(days=10)
            }
        )
        VerificationDocument.objects.get_or_create(
            application=vance_app,
            document_type=VerificationDocument.TYPE_ADDRESS,
            defaults={
                'document_name': 'Residential Lease - Evergreen Terrace',
                'document_number': 'LSE-2025-99',
                'status': VerificationDocument.STATUS_VERIFIED,
                'reviewed_by': emp_user,
                'reviewed_at': timezone.now() - timedelta(days=10)
            }
        )
        VerificationHistory.objects.get_or_create(
            application=vance_app,
            action='APPROVED',
            defaults={
                'employee': emp_user,
                'employee_name': emp_user.get_full_name(),
                'previous_status': 'PENDING',
                'new_status': 'VERIFIED',
                'reason': 'Identity verified via official US Passport and lease agreement.'
            }
        )

        # Sarah Jenkins: VERIFIED
        cust2_profile.verification_status = CustomerProfile.VERIFICATION_VERIFIED
        cust2_profile.save(update_fields=['verification_status'])

        CustomerApplication.objects.get_or_create(
            application_id='APP-20261002-1002',
            defaults={
                'customer': cust2_profile,
                'branch': metro_branch,
                'status': CustomerApplication.STATUS_VERIFIED,
                'kyc_status': 'VERIFIED',
                'reviewed_by': emp_user,
                'reviewed_at': timezone.now() - timedelta(days=8)
            }
        )

        # Customer: Devamani Raga (PENDING) - Registered 2026-10-09
        cust_deva_user = User.objects.filter(email='devamaniraga143@gmail.com').first()
        if not cust_deva_user:
            cust_deva_user = User.objects.create_user(
                username='devamani.raga',
                email='devamaniraga143@gmail.com',
                first_name='Devamani',
                last_name='Raga',
                role=User.ROLE_CUSTOMER,
                phone='09032759126'
            )
        cust_deva_user.set_password(demo_password)
        cust_deva_user.save()
        Token.objects.get_or_create(user=cust_deva_user)

        cust_deva_profile, _ = CustomerProfile.objects.get_or_create(
            user=cust_deva_user,
            defaults={
                'customer_id': 'CUST5625',
                'branch': metro_branch,
                'address': 'Plot 45, Golden Heights Colony, Metropolis',
                'kyc_status': CustomerProfile.KYC_PENDING,
                'verification_status': CustomerProfile.VERIFICATION_PENDING
            }
        )
        cust_deva_profile.verification_status = CustomerProfile.VERIFICATION_PENDING
        cust_deva_profile.kyc_status = CustomerProfile.KYC_PENDING
        cust_deva_profile.save()

        deva_acc, _ = Account.objects.get_or_create(
            account_number='100827369919',
            defaults={
                'customer': cust_deva_profile,
                'account_type': Account.ACCOUNT_SAVINGS,
                'balance': Decimal('500.00'),
                'currency': 'USD',
                'status': Account.STATUS_PENDING_VERIFICATION
            }
        )
        deva_acc.status = Account.STATUS_PENDING_VERIFICATION
        deva_acc.save()

        deva_app, _ = CustomerApplication.objects.get_or_create(
            application_id='APP-20261009-5625',
            defaults={
                'customer': cust_deva_profile,
                'branch': metro_branch,
                'status': CustomerApplication.STATUS_PENDING,
                'kyc_status': 'PENDING'
            }
        )
        deva_app.status = CustomerApplication.STATUS_PENDING
        deva_app.kyc_status = 'PENDING'
        deva_app.save()

        VerificationDocument.objects.get_or_create(
            application=deva_app,
            document_type=VerificationDocument.TYPE_IDENTITY,
            defaults={
                'document_name': 'Government ID - Devamani Raga',
                'document_number': 'ID-IND-903275',
                'file_name': 'devamani_id_card.pdf',
                'file_size_bytes': 285000,
                'status': VerificationDocument.STATUS_PENDING
            }
        )
        VerificationDocument.objects.get_or_create(
            application=deva_app,
            document_type=VerificationDocument.TYPE_ADDRESS,
            defaults={
                'document_name': 'Address Proof - Electricity Bill',
                'document_number': 'ELEC-2026-9919',
                'file_name': 'devamani_electricity_bill.pdf',
                'file_size_bytes': 192000,
                'status': VerificationDocument.STATUS_PENDING
            }
        )
        VerificationHistory.objects.get_or_create(
            application=deva_app,
            action='REGISTRATION_SUBMITTED',
            defaults={
                'employee': None,
                'employee_name': 'Customer Self-Registration',
                'previous_status': 'NONE',
                'new_status': 'PENDING',
                'reason': 'Account registered online on 2026-10-09. Awaiting employee KYC review.'
            }
        )

        # Customer: Neeraja bai (PENDING) - Registered 2026-10-11
        cust_neeraja_user = User.objects.filter(email='devamanirag@gmail.com').first()
        if not cust_neeraja_user:
            cust_neeraja_user = User.objects.create_user(
                username='neeraja.bai',
                email='devamanirag@gmail.com',
                first_name='Neeraja',
                last_name='bai',
                role=User.ROLE_CUSTOMER,
                phone='09034569126'
            )
        cust_neeraja_user.set_password(demo_password)
        cust_neeraja_user.save()
        Token.objects.get_or_create(user=cust_neeraja_user)

        cust_neeraja_profile, _ = CustomerProfile.objects.get_or_create(
            user=cust_neeraja_user,
            defaults={
                'customer_id': 'CUST3201',
                'branch': metro_branch,
                'address': 'Plot 48, Silver Springs Enclave, Metropolis',
                'kyc_status': CustomerProfile.KYC_PENDING,
                'verification_status': CustomerProfile.VERIFICATION_PENDING
            }
        )
        cust_neeraja_profile.verification_status = CustomerProfile.VERIFICATION_PENDING
        cust_neeraja_profile.kyc_status = CustomerProfile.KYC_PENDING
        cust_neeraja_profile.save()

        neeraja_acc, _ = Account.objects.get_or_create(
            account_number='100918276850',
            defaults={
                'customer': cust_neeraja_profile,
                'account_type': Account.ACCOUNT_SAVINGS,
                'balance': Decimal('500.00'),
                'currency': 'USD',
                'status': Account.STATUS_PENDING_VERIFICATION
            }
        )
        neeraja_acc.status = Account.STATUS_PENDING_VERIFICATION
        neeraja_acc.save()

        neeraja_app, _ = CustomerApplication.objects.get_or_create(
            application_id='APP-20261011-3201',
            defaults={
                'customer': cust_neeraja_profile,
                'branch': metro_branch,
                'status': CustomerApplication.STATUS_PENDING,
                'kyc_status': 'PENDING'
            }
        )
        neeraja_app.status = CustomerApplication.STATUS_PENDING
        neeraja_app.kyc_status = 'PENDING'
        neeraja_app.save()
        VerificationDocument.objects.get_or_create(
            application=neeraja_app,
            document_type=VerificationDocument.TYPE_IDENTITY,
            defaults={
                'document_name': 'Passport - Neeraja bai',
                'document_number': 'PASS-IND-320188',
                'file_name': 'neeraja_passport.pdf',
                'file_size_bytes': 340000,
                'status': VerificationDocument.STATUS_PENDING
            }
        )
        VerificationDocument.objects.get_or_create(
            application=neeraja_app,
            document_type=VerificationDocument.TYPE_ADDRESS,
            defaults={
                'document_name': 'Water Utility Bill',
                'document_number': 'WTR-2026-6850',
                'file_name': 'neeraja_water_bill.pdf',
                'file_size_bytes': 175000,
                'status': VerificationDocument.STATUS_PENDING
            }
        )
        VerificationHistory.objects.get_or_create(
            application=neeraja_app,
            action='REGISTRATION_SUBMITTED',
            defaults={
                'employee': None,
                'employee_name': 'Customer Self-Registration',
                'previous_status': 'NONE',
                'new_status': 'PENDING',
                'reason': 'Account registered online on 2026-10-11. Awaiting employee KYC review.'
            }
        )

        # Test Customer 3: David Miller (PENDING)
        cust3_user, _ = User.objects.get_or_create(
            username='david.miller',
            defaults={
                'email': 'david.miller@example.com',
                'first_name': 'David',
                'last_name': 'Miller',
                'role': User.ROLE_CUSTOMER,
                'phone': '+1 (555) 723-9012'
            }
        )
        cust3_user.set_password(demo_password)
        cust3_user.save()
        Token.objects.get_or_create(user=cust3_user)

        cust3_profile, _ = CustomerProfile.objects.get_or_create(
            user=cust3_user,
            defaults={
                'customer_id': 'CUST1003',
                'branch': metro_branch,
                'address': '550 Pinecrest Blvd, Apt 4B, Metropolis',
                'kyc_status': CustomerProfile.KYC_PENDING,
                'verification_status': CustomerProfile.VERIFICATION_PENDING
            }
        )
        Account.objects.get_or_create(
            account_number='100778899001',
            defaults={
                'customer': cust3_profile,
                'account_type': Account.ACCOUNT_SAVINGS,
                'balance': Decimal('1000.00'),
                'currency': 'USD',
                'status': Account.STATUS_PENDING_VERIFICATION
            }
        )
        miller_app, _ = CustomerApplication.objects.get_or_create(
            application_id='APP-20261011-1003',
            defaults={
                'customer': cust3_profile,
                'branch': metro_branch,
                'status': CustomerApplication.STATUS_PENDING,
                'kyc_status': 'PENDING'
            }
        )
        VerificationDocument.objects.get_or_create(
            application=miller_app,
            document_type=VerificationDocument.TYPE_IDENTITY,
            defaults={
                'document_name': "Driver's License - David Miller",
                'document_number': 'DL-NY-8839210',
                'file_name': 'david_miller_license.pdf',
                'file_size_bytes': 245000,
                'status': VerificationDocument.STATUS_PENDING
            }
        )
        VerificationDocument.objects.get_or_create(
            application=miller_app,
            document_type=VerificationDocument.TYPE_ADDRESS,
            defaults={
                'document_name': 'Electric Utility Bill - Metropolis Energy',
                'document_number': 'UTIL-2026-8819',
                'file_name': 'metropolis_energy_bill.pdf',
                'file_size_bytes': 189000,
                'status': VerificationDocument.STATUS_PENDING
            }
        )
        VerificationHistory.objects.get_or_create(
            application=miller_app,
            action='REGISTRATION_SUBMITTED',
            defaults={
                'employee': None,
                'employee_name': 'Customer Self-Registration',
                'previous_status': 'NONE',
                'new_status': 'PENDING',
                'reason': 'Online application submitted with ID and utility bill.'
            }
        )

        # Test Customer 4: Emma Watson (ADDITIONAL_INFORMATION_REQUIRED)
        cust4_user, _ = User.objects.get_or_create(
            username='emma.watson',
            defaults={
                'email': 'emma.w@example.com',
                'first_name': 'Emma',
                'last_name': 'Watson',
                'role': User.ROLE_CUSTOMER,
                'phone': '+1 (555) 612-4433'
            }
        )
        cust4_user.set_password(demo_password)
        cust4_user.save()
        Token.objects.get_or_create(user=cust4_user)

        cust4_profile, _ = CustomerProfile.objects.get_or_create(
            user=cust4_user,
            defaults={
                'customer_id': 'CUST1004',
                'branch': metro_branch,
                'address': '89 Heritage Way, Suite 12, Metropolis',
                'kyc_status': CustomerProfile.KYC_PENDING,
                'verification_status': CustomerProfile.VERIFICATION_PENDING
            }
        )
        cust4_profile.verification_status = CustomerProfile.VERIFICATION_PENDING
        cust4_profile.kyc_status = CustomerProfile.KYC_PENDING
        cust4_profile.save()

        Account.objects.get_or_create(
            account_number='100445566778',
            defaults={
                'customer': cust4_profile,
                'account_type': Account.ACCOUNT_SAVINGS,
                'balance': Decimal('1000.00'),
                'currency': 'USD',
                'status': Account.STATUS_PENDING_VERIFICATION
            }
        )
        watson_app, _ = CustomerApplication.objects.get_or_create(
            application_id='APP-20261010-1004',
            defaults={
                'customer': cust4_profile,
                'branch': metro_branch,
                'status': CustomerApplication.STATUS_PENDING,
                'kyc_status': 'PENDING'
            }
        )
        watson_app.status = CustomerApplication.STATUS_PENDING
        watson_app.kyc_status = 'PENDING'
        watson_app.save()
        VerificationDocument.objects.get_or_create(
            application=watson_app,
            document_type=VerificationDocument.TYPE_IDENTITY,
            defaults={
                'document_name': 'National Identity Card - Emma Watson',
                'document_number': 'NAT-ID-4491028',
                'file_name': 'national_id_card.pdf',
                'file_size_bytes': 312000,
                'status': VerificationDocument.STATUS_VERIFIED,
                'reviewed_by': emp_user,
                'reviewed_at': timezone.now() - timedelta(days=1)
            }
        )
        VerificationHistory.objects.get_or_create(
            application=watson_app,
            action='INFO_REQUESTED',
            defaults={
                'employee': emp_user,
                'employee_name': emp_user.get_full_name(),
                'previous_status': 'UNDER_REVIEW',
                'new_status': 'ADDITIONAL_INFORMATION_REQUIRED',
                'reason': 'Requested proof of address documentation.'
            }
        )

        # Test Customer 5: Robert Chen (REJECTED)
        cust5_user, _ = User.objects.get_or_create(
            username='robert.chen',
            defaults={
                'email': 'robert.chen@example.com',
                'first_name': 'Robert',
                'last_name': 'Chen',
                'role': User.ROLE_CUSTOMER,
                'phone': '+1 (555) 998-1122'
            }
        )
        cust5_user.set_password(demo_password)
        cust5_user.save()
        Token.objects.get_or_create(user=cust5_user)

        cust5_profile, _ = CustomerProfile.objects.get_or_create(
            user=cust5_user,
            defaults={
                'customer_id': 'CUST1005',
                'branch': metro_branch,
                'address': 'Unverified PO Box 404, Metropolis',
                'kyc_status': CustomerProfile.KYC_REJECTED,
                'verification_status': CustomerProfile.VERIFICATION_REJECTED
            }
        )
        Account.objects.get_or_create(
            account_number='100998811223',
            defaults={
                'customer': cust5_profile,
                'account_type': Account.ACCOUNT_SAVINGS,
                'balance': Decimal('1000.00'),
                'currency': 'USD',
                'status': Account.STATUS_PENDING_VERIFICATION
            }
        )
        chen_app, _ = CustomerApplication.objects.get_or_create(
            application_id='APP-20261008-1005',
            defaults={
                'customer': cust5_profile,
                'branch': metro_branch,
                'status': CustomerApplication.STATUS_REJECTED,
                'kyc_status': 'REJECTED',
                'rejection_reason': 'Submitted identity document was expired and address verification could not be validated (PO Box addresses are not accepted for banking verification).',
                'reviewed_by': emp_user,
                'reviewed_at': timezone.now() - timedelta(days=3)
            }
        )
        VerificationHistory.objects.get_or_create(
            application=chen_app,
            action='REJECTED',
            defaults={
                'employee': emp_user,
                'employee_name': emp_user.get_full_name(),
                'previous_status': 'UNDER_REVIEW',
                'new_status': 'REJECTED',
                'reason': 'Expired identification and invalid PO Box address provided.'
            }
        )
        self.stdout.write(self.style.SUCCESS("[OK] Customer verification applications seeded."))

        self.stdout.write(self.style.SUCCESS("""
======================================================================
SecureBank Demo Environment Successfully Seeded!
----------------------------------------------------------------------
Demo Accounts:
1. Customer Portal:
   - Email: customer@securebank.com  OR  ID: CUST1001
   - Password: {pwd}
   - Dashboard: /customer/dashboard

2. Employee Portal:
   - Email: employee@securebank.com  OR  ID: EMP2001
   - Password: {pwd}
   - Dashboard: /employee/dashboard

3. Branch Manager Portal:
   - Email: manager@securebank.com   OR  ID: MGR3001
   - Password: {pwd}
   - Dashboard: /manager/dashboard

* Maker-Checker Feature:
  Approval #{aid} was initiated by Employee (EMP2001).
  Only Manager (MGR3001) can review and approve it!
======================================================================
""".format(pwd=demo_password, aid='LOAN-APP-35000')))
