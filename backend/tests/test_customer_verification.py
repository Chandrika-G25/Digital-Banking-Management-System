import json
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import (
    Branch, CustomerProfile, EmployeeProfile,
    CustomerApplication, VerificationDocument, VerificationHistory
)
from apps.banking.models import Account, Transaction
from apps.notifications.models import Notification
from apps.audit.models import AuditLog

User = get_user_model()

class CustomerVerificationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Branch
        self.branch = Branch.objects.create(
            name="Downtown Metro Main Branch",
            code="METRO01",
            address="100 Financial Center Blvd",
            city="Metropolis",
            phone="+1 (555) 019-2831"
        )
        self.other_branch = Branch.objects.create(
            name="Westside Commercial Branch",
            code="WEST02",
            address="450 West Horizon Avenue",
            city="Westport",
            phone="+1 (555) 018-9942"
        )

        # Employee (authorized for customer verification)
        self.employee_user = User.objects.create_user(
            username="test_employee",
            email="test_emp@securebank.com",
            password="DemoPass123!",
            role=User.ROLE_EMPLOYEE,
            first_name="Elena",
            last_name="Rostova"
        )
        self.employee_profile = EmployeeProfile.objects.create(
            user=self.employee_user,
            employee_id="EMP9901",
            branch=self.branch,
            can_verify_customers=True
        )

        # Employee without verification permission
        self.unauthorized_employee = User.objects.create_user(
            username="unauth_employee",
            email="unauth_emp@securebank.com",
            password="DemoPass123!",
            role=User.ROLE_EMPLOYEE,
            first_name="Trainee",
            last_name="Intern"
        )
        self.unauthorized_profile = EmployeeProfile.objects.create(
            user=self.unauthorized_employee,
            employee_id="EMP9902",
            branch=self.branch,
            can_verify_customers=False
        )

    def test_01_customer_registration_starts_pending(self):
        """Newly registered customer must have PENDING verification and PENDING_VERIFICATION account."""
        reg_data = {
            "username": "new_cust_1",
            "email": "new_cust_1@example.com",
            "password": "SecurePassword123!",
            "first_name": "Oliver",
            "last_name": "Queen",
            "phone": "+1 (555) 345-6789",
            "branch_id": self.branch.id
        }
        res = self.client.post("/api/v1/auth/register/", data=reg_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["verification_status"], "PENDING")
        self.assertEqual(res.data["account_status"], "PENDING_VERIFICATION")
        self.assertIn("awaiting verification by our bank staff", res.data["message"])

        # Check in DB
        user = User.objects.get(username="new_cust_1")
        profile = user.customer_profile
        self.assertEqual(profile.verification_status, "PENDING")
        self.assertEqual(profile.kyc_status, "PENDING")

        account = profile.accounts.first()
        self.assertEqual(account.status, "PENDING_VERIFICATION")

        app = CustomerApplication.objects.filter(customer=profile).first()
        self.assertIsNotNone(app)
        self.assertEqual(app.status, "PENDING")

        # Customer notification sent
        notif = Notification.objects.filter(user=user).first()
        self.assertIsNotNone(notif)
        self.assertIn("awaiting verification", notif.message)

    def test_02_unverified_customer_cannot_transfer_funds(self):
        """Unverified accounts must be blocked from initiating fund transfers."""
        # Register user
        reg_data = {
            "username": "unverified_cust",
            "email": "unverified@example.com",
            "password": "DemoPass123!",
            "first_name": "Bruce",
            "last_name": "Wayne",
            "branch_id": self.branch.id
        }
        reg_res = self.client.post("/api/v1/auth/register/", data=reg_data, format="json")
        token = reg_res.data["token"]
        from_acc_id = User.objects.get(username="unverified_cust").customer_profile.accounts.first().id

        self.client.credentials(HTTP_AUTHORIZATION="Token " + token)

        transfer_data = {
            "from_account_id": from_acc_id,
            "to_account_number": "100192837465",
            "amount": "100.00",
            "description": "Attempted unauthorized transfer"
        }
        res = self.client.post("/api/v1/customer/transfers/", data=transfer_data, format="json")
        # Must be rejected with 403 Forbidden
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_customer_cannot_approve_own_account(self):
        """Customers must never have access to employee verification endpoints."""
        reg_res = self.client.post("/api/v1/auth/register/", data={
            "username": "hacker_cust",
            "email": "hacker@example.com",
            "password": "DemoPass123!",
            "first_name": "Hacker",
            "last_name": "Smith",
            "branch_id": self.branch.id
        }, format="json")
        token = reg_res.data["token"]
        app_id = reg_res.data["application_id"]

        self.client.credentials(HTTP_AUTHORIZATION="Token " + token)

        # Attempt to call employee approve endpoint
        res = self.client.post(f"/api/v1/employee/customer-verification/{app_id}/approve/", data={}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_04_unauthorized_employee_cannot_verify(self):
        """Employees without CUSTOMER_VERIFICATION permission cannot approve applications."""
        # Create application
        user = User.objects.create_user(username="cust_test4", email="c4@example.com", password="pwd", role=User.ROLE_CUSTOMER)
        profile = CustomerProfile.objects.create(user=user, customer_id="CUST4001", branch=self.branch)
        app = CustomerApplication.objects.create(application_id="APP-TEST-004", customer=profile, branch=self.branch, status="PENDING")

        # Login as unauthorized employee
        self.client.force_authenticate(user=self.unauthorized_employee)
        res = self.client.post(f"/api/v1/employee/customer-verification/{app.application_id}/approve/", data={}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_05_authorized_employee_review_workflow(self):
        """Authorized employee can list, review, request info, resubmit, reject, and approve."""
        # Create candidate customer
        cust_user = User.objects.create_user(
            username="candidate_cust",
            email="candidate@example.com",
            password="DemoPass123!",
            role=User.ROLE_CUSTOMER,
            first_name="Diana",
            last_name="Prince",
            phone="+1 (555) 777-8899"
        )
        cust_profile = CustomerProfile.objects.create(
            user=cust_user,
            customer_id="CUST5001",
            branch=self.branch,
            address="400 Amazon Way, Metropolis",
            kyc_status="PENDING",
            verification_status="PENDING"
        )
        cust_acc = Account.objects.create(
            customer=cust_profile,
            account_number="100998877112",
            account_type=Account.ACCOUNT_SAVINGS,
            balance=Decimal("1000.00"),
            status=Account.STATUS_PENDING_VERIFICATION
        )
        app = CustomerApplication.objects.create(
            application_id="APP-TEST-5001",
            customer=cust_profile,
            branch=self.branch,
            status="PENDING"
        )
        VerificationDocument.objects.create(
            application=app,
            document_type=VerificationDocument.TYPE_IDENTITY,
            document_name="Diplomatic Passport",
            document_number="DP-99812",
            status="PENDING"
        )

        # 1. Employee lists applications
        self.client.force_authenticate(user=self.employee_user)
        list_res = self.client.get("/api/v1/employee/customer-verification/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertIn("kpis", list_res.data)
        self.assertGreaterEqual(list_res.data["kpis"]["total_pending"], 1)

        # Verify contact information is appropriately masked
        found_item = next((item for item in list_res.data["applications"] if item["application_id"] == app.application_id), None)
        self.assertIsNotNone(found_item)
        self.assertIn("***", found_item["masked_email"])
        self.assertIn("***", found_item["masked_phone"])

        # 2. Employee views detailed application
        detail_res = self.client.get(f"/api/v1/employee/customer-verification/{app.application_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["application_id"], app.application_id)
        self.assertIn("documents", detail_res.data)
        self.assertIn("duplicate_warnings", detail_res.data)
        self.assertIn("missing_or_invalid", detail_res.data)

        # 3. Request Additional Information
        req_res = self.client.post(
            f"/api/v1/employee/customer-verification/{app.application_id}/request-information/",
            data={"missing_information": "Please provide proof of address document."},
            format="json"
        )
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        cust_profile.refresh_from_db()
        self.assertEqual(app.status, "ADDITIONAL_INFORMATION_REQUIRED")
        self.assertEqual(cust_profile.verification_status, "ADDITIONAL_INFORMATION_REQUIRED")

        # 4. Customer views status & resubmits additional info
        self.client.force_authenticate(user=cust_user)
        status_res = self.client.get("/api/v1/customer/verification-status/")
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data["status"], "ADDITIONAL_INFORMATION_REQUIRED")
        self.assertIn("proof of address", status_res.data["requested_information"])

        resubmit_res = self.client.post(
            "/api/v1/customer/additional-information/",
            data={
                "information_response": "Here is my residential lease document.",
                "document_type": "ADDRESS_PROOF",
                "document_name": "Residential Lease Agreement",
                "document_number": "LSE-2026-01"
            },
            format="json"
        )
        self.assertEqual(resubmit_res.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, "PENDING")

        # 5. Employee Approves Application
        self.client.force_authenticate(user=self.employee_user)
        approve_res = self.client.post(
            f"/api/v1/employee/customer-verification/{app.application_id}/approve/",
            data={"notes": "All checks verified and passed."},
            format="json"
        )
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_res.data["status"], "VERIFIED")

        app.refresh_from_db()
        cust_profile.refresh_from_db()
        cust_acc.refresh_from_db()

        self.assertEqual(app.status, "VERIFIED")
        self.assertEqual(cust_profile.verification_status, "VERIFIED")
        self.assertEqual(cust_profile.kyc_status, "VERIFIED")
        self.assertEqual(cust_acc.status, Account.STATUS_ACTIVE)

        # Audit log verified
        audit = AuditLog.objects.filter(target_id=app.application_id, action="CUSTOMER_VERIFICATION_APPROVED").first()
        self.assertIsNotNone(audit)

        # Verification history verified
        hist = VerificationHistory.objects.filter(application=app, action="APPROVED").first()
        self.assertIsNotNone(hist)
        self.assertEqual(hist.new_status, "VERIFIED")
