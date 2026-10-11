import json
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import (
    Branch, CustomerProfile, EmployeeProfile, CustomerApplication,
    VerificationDocument, VerificationHistory, generate_customer_id
)
from apps.banking.models import Account
from apps.approvals.models import KYCRecord

User = get_user_model()


class AccountOpeningFeatureTestCase(TestCase):
    """
    Acceptance tests for:
    SecureBank Feature: Account Opening with Customer ID and Password
    """

    def setUp(self):
        self.client = APIClient()

        # Create branch
        self.branch = Branch.objects.create(
            name="Downtown Financial Center",
            code="DFC01",
            address="100 Wall Street",
            city="New York",
            phone="+1 (555) 019-2834"
        )

        # Create employee with verification permission
        self.employee_user = User.objects.create_user(
            username="emp_officer_1",
            email="officer1@securebank.com",
            password="EmployeePass1234!",
            first_name="Victoria",
            last_name="Chase",
            role=User.ROLE_EMPLOYEE
        )
        self.employee_profile = EmployeeProfile.objects.create(
            user=self.employee_user,
            employee_id="EMP5001",
            branch=self.branch,
            department="Operations",
            can_verify_customers=True
        )

    def test_01_customer_id_generation_format(self):
        """Test Customer ID generator produces sequential SB100001, SB100002... format safely."""
        id1 = generate_customer_id()
        self.assertTrue(id1.startswith("SB"))
        self.assertGreaterEqual(len(id1), 8)

        # Mock creating a customer with id1
        user = User.objects.create_user(username="test_user_id1", email="test1@bank.com", password="StrongPassword123!")
        CustomerProfile.objects.create(user=user, customer_id=id1, branch=self.branch)

        id2 = generate_customer_id()
        self.assertNotEqual(id1, id2)
        self.assertTrue(id2.startswith("SB"))

    def test_02_password_minimum_12_characters_enforced(self):
        """Registration must enforce minimum password length of 12 characters."""
        short_password_payload = {
            "first_name": "James",
            "last_name": "Gordon",
            "email": "jgordon@gotham.com",
            "phone": "+1 (555) 123-4567",
            "password": "Short123!",  # Only 9 characters
            "confirm_password": "Short123!",
            "account_type": "SAVINGS",
            "branch_id": self.branch.id
        }
        res = self.client.post("/api/v1/customer/register/", data=short_password_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", str(res.data))

    def test_03_successful_registration_with_customer_id(self):
        """Customer submits multi-step registration, gets unique SB100001 ID, PENDING status, and exact message."""
        payload = {
            "first_name": "Diana",
            "last_name": "Prince",
            "email": "diana.prince@themyscira.com",
            "phone": "+1 (555) 987-6543",
            "gender": "Female",
            "address": "456 Amazon Way",
            "city": "Gateway City",
            "state": "California",
            "postal_code": "90210",
            "account_type": "SAVINGS",
            "branch_id": self.branch.id,
            "nominee_name": "Hippolyta",
            "nominee_relationship": "Mother",
            "nominee_phone": "+1 (555) 111-2222",
            "initial_deposit": "750.00",
            "identity_type": "PASSPORT",
            "identity_number": "P987654321",
            "terms_accepted": True,
            "password": "SecurePassword2026!#",  # 19 characters, strong
            "confirm_password": "SecurePassword2026!#"
        }

        res = self.client.post("/api/v1/customer/register/", data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Check response fields
        customer_id = res.data["customer_id"]
        app_id = res.data["application_id"]
        self.assertTrue(customer_id.startswith("SB"))
        self.assertTrue(app_id.startswith("APP-"))
        self.assertEqual(res.data["verification_status"], "PENDING")
        self.assertEqual(res.data["account_status"], "PENDING_VERIFICATION")
        self.assertEqual(res.data["redirect_url"], "/customer/verification-status")

        # Verify password is NOT in response
        self.assertNotIn("password", res.data)
        self.assertNotIn("password_hash", str(res.data))

        # Verify exact required message
        expected_msg_fragment = f"Your SecureBank application has been submitted successfully. Your Customer ID is {customer_id}."
        self.assertIn(expected_msg_fragment, res.data["message"])

        # Check DB persistence
        user = User.objects.get(email="diana.prince@themyscira.com")
        self.assertFalse(user.password.startswith("SecurePassword2026!#"))  # Must be hashed
        self.assertTrue(user.check_password("SecurePassword2026!#"))

        profile = user.customer_profile
        self.assertEqual(profile.customer_id, customer_id)
        self.assertEqual(profile.city, "Gateway City")
        self.assertEqual(profile.nominee_name, "Hippolyta")

        application = CustomerApplication.objects.get(application_id=app_id)
        self.assertEqual(application.status, CustomerApplication.STATUS_PENDING)
        self.assertEqual(application.account_type_requested, "SAVINGS")
        self.assertEqual(application.initial_deposit_amount, Decimal("750.00"))

        account = profile.accounts.first()
        self.assertEqual(account.status, Account.STATUS_PENDING_VERIFICATION)

    def test_04_customer_login_routing(self):
        """Pending customers redirected to verification status; verified customers to dashboard."""
        # 1. Register customer
        reg_payload = {
            "first_name": "Arthur",
            "last_name": "Curry",
            "email": "arthur.curry@atlantis.com",
            "phone": "+1 (555) 444-5555",
            "password": "AtlantisKing2026!#",
            "confirm_password": "AtlantisKing2026!#",
            "account_type": "CURRENT",
            "branch_id": self.branch.id
        }
        reg_res = self.client.post("/api/v1/customer/register/", data=reg_payload, format="json")
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
        customer_id = reg_res.data["customer_id"]

        # 2. Login as pending customer using Customer ID
        login_res = self.client.post("/api/v1/auth/customer/login/", data={
            "identifier": customer_id,
            "password": "AtlantisKing2026!#"
        }, format="json")
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertEqual(login_res.data["redirect_url"], "/customer/verification-status")
        self.assertEqual(login_res.data["verification_status"], "PENDING")

        # 3. Check customer cannot transfer funds while pending
        cust_token = login_res.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION="Token " + cust_token)
        from_acc = User.objects.get(email="arthur.curry@atlantis.com").customer_profile.accounts.first()
        transfer_res = self.client.post("/api/v1/customer/transfers/", data={
            "from_account_id": from_acc.id,
            "to_account_number": "100192837465",
            "amount": "50.00"
        }, format="json")
        self.assertEqual(transfer_res.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Check verification status endpoint
        status_res = self.client.get("/api/v1/customer/verification-status/")
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data["customer_id"], customer_id)
        self.assertEqual(status_res.data["status"], "PENDING")

    def test_05_employee_verification_workflow(self):
        """Employee reviews and approves application, activating account and preserving credentials."""
        # Register customer
        reg_payload = {
            "first_name": "Barry",
            "last_name": "Allen",
            "email": "barry.allen@centralcity.com",
            "phone": "+1 (555) 777-8888",
            "password": "SpeedForcePassword2026!#",
            "confirm_password": "SpeedForcePassword2026!#",
            "account_type": "SAVINGS",
            "branch_id": self.branch.id
        }
        reg_res = self.client.post("/api/v1/customer/register/", data=reg_payload, format="json")
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
        customer_id = reg_res.data["customer_id"]
        app_id = reg_res.data["application_id"]

        # Login as employee
        emp_login = self.client.post("/api/v1/auth/login/", data={
            "identifier": "emp_officer_1",
            "password": "EmployeePass1234!",
            "expected_role": "EMPLOYEE"
        }, format="json")
        self.assertEqual(emp_login.status_code, status.HTTP_200_OK)
        emp_token = emp_login.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION="Token " + emp_token)

        # 1. Fetch pending list
        list_res = self.client.get("/api/v1/employee/customer-verification/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        apps = list_res.data.get("applications", list_res.data.get("results", []))
        app_item = next((item for item in apps if item["application_id"] == app_id), None)
        self.assertIsNotNone(app_item)
        self.assertEqual(app_item["customer_id"], customer_id)

        # 2. Approve application
        approve_res = self.client.post(f"/api/v1/employee/customer-verification/{app_id}/approve/", data={
            "notes": "All identity checks passed. KYC fully compliant."
        }, format="json")
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_res.data["verification_status"], "VERIFIED")
        self.assertEqual(approve_res.data["account_status"], "ACTIVE")

        # 3. Verify Customer credentials preserved and login redirects to dashboard
        self.client.credentials()  # Clear auth
        cust_login_after = self.client.post("/api/v1/auth/customer/login/", data={
            "identifier": customer_id,
            "password": "SpeedForcePassword2026!#"
        }, format="json")
        self.assertEqual(cust_login_after.status_code, status.HTTP_200_OK)
        self.assertEqual(cust_login_after.data["redirect_url"], "/customer/dashboard")
        self.assertEqual(cust_login_after.data["verification_status"], "VERIFIED")

        # 4. Verify account in DB is ACTIVE
        user = User.objects.get(email="barry.allen@centralcity.com")
        self.assertEqual(user.customer_profile.verification_status, "VERIFIED")
        self.assertEqual(user.customer_profile.accounts.first().status, "ACTIVE")

    def test_06_employee_rejection_workflow(self):
        """Employee rejects application with mandatory reason."""
        reg_payload = {
            "first_name": "Lex",
            "last_name": "Luthor",
            "email": "lex@lexcorp.com",
            "phone": "+1 (555) 999-0000",
            "password": "LuthorCorpSuperPass2026!",
            "confirm_password": "LuthorCorpSuperPass2026!",
            "account_type": "CURRENT",
            "branch_id": self.branch.id
        }
        reg_res = self.client.post("/api/v1/customer/register/", data=reg_payload, format="json")
        app_id = reg_res.data["application_id"]
        customer_id = reg_res.data["customer_id"]

        # Authenticate as employee
        from rest_framework.authtoken.models import Token
        emp_token, _ = Token.objects.get_or_create(user=self.employee_user)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + emp_token.key)

        # Reject application
        reject_res = self.client.post(f"/api/v1/employee/customer-verification/{app_id}/reject/", data={
            "reason": "Provided identification could not be verified against government databases.",
            "notes": "Failed watchlist screening."
        }, format="json")
        self.assertEqual(reject_res.status_code, status.HTTP_200_OK)
        self.assertEqual(reject_res.data["verification_status"], "REJECTED")

        # Verify customer account remains restricted
        user = User.objects.get(email="lex@lexcorp.com")
        self.assertEqual(user.customer_profile.verification_status, "REJECTED")
        self.assertIn(user.customer_profile.accounts.first().status, ["PENDING_VERIFICATION", "FROZEN"])
        self.assertNotEqual(user.customer_profile.accounts.first().status, "ACTIVE")
