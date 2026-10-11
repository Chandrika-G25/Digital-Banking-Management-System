import urllib.request
import json

def api_call(url, token=None, method='GET', data=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Token {token}'
    req = urllib.request.Request(
        url,
        headers=headers,
        data=json.dumps(data).encode() if data else None,
        method=method
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

# 1. Login as employee
status, emp_login = api_call(
    'http://127.0.0.1:8000/api/v1/auth/login/',
    method='POST',
    data={'identifier': 'employee@securebank.com', 'password': 'DemoPass123!', 'expected_role': 'EMPLOYEE'}
)
print("1. Employee Login status:", status)
emp_token = emp_login.get('token')

# 2. Get customer verification applications
status, app_data = api_call(
    'http://127.0.0.1:8000/api/v1/employee/customer-verification/',
    token=emp_token
)
print("2. Employee Verification Apps status:", status)
print("KPIs:", app_data.get('kpis'))
apps = app_data.get('applications', [])
print(f"Total apps returned: {len(apps)}")
for a in apps:
    print(f" - {a.get('customer_name')} ({a.get('customer_id')}): status={a.get('account_verification_status')}, email={a.get('masked_email')}, phone={a.get('masked_phone')}")

# 3. Login as Devamani Raga
status, deva_login = api_call(
    'http://127.0.0.1:8000/api/v1/auth/login/',
    method='POST',
    data={'identifier': 'devamaniraga143@gmail.com', 'password': 'DemoPass123!', 'expected_role': 'CUSTOMER'}
)
print("\n3. Devamani Login status:", status)
deva_token = deva_login.get('token')

# 4. Devamani Customer verification status
status, deva_verif = api_call(
    'http://127.0.0.1:8000/api/v1/customer/verification-status/',
    token=deva_token
)
print("4. Devamani Verification Status endpoint:", status)
print(" - App ID:", deva_verif.get('application_id'))
print(" - Status:", deva_verif.get('status'))
print(" - KYC Status:", deva_verif.get('kyc_status'))
print(" - Account Status:", deva_verif.get('account_status'))
print(" - Next Steps:", deva_verif.get('next_steps'))
print(" - Documents Count:", len(deva_verif.get('documents', [])))

# 5. Check transfer restriction for unverified customer
status, transfer_res = api_call(
    'http://127.0.0.1:8000/api/v1/customer/transfers/',
    token=deva_token,
    method='POST',
    data={'source_account_id': 1, 'recipient_account_number': '100123456789', 'amount': '100.00'}
)
print("\n5. Devamani Transfer Attempt (should be blocked): status =", status)
print(" - Response:", transfer_res)
