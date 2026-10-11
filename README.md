# SecureBank — Digital Banking Management System
> **"Your Trust. Our Priority."**


---

## Architecture Overview

```
SecureBank
├── frontend/                     # React 19 + Vite Frontend SPA (Plain CSS, Lucide icons)
│   ├── src/
│   │   ├── components/           # Reusable UI cards, tables, badges, receipts, modals
│   │   ├── layouts/              # Role-aware dashboard layouts & WebSocket manager
│   │   ├── pages/                # Landing, Role Selection, Login portals, Dashboards
│   │   ├── services/             # API client, Auth service, and WebSocket connection
│   │   └── index.css             # Navy/Royal Blue design system
│   ├── vite.config.js            # Reverse proxy configuration (/api & /ws)
│   └── package.json
│
└── backend/                      # Python 3.12 + Django 5.1 ASGI Application
    ├── config/                   # Settings, ASGI/WSGI, URLs, Routing
    ├── apps/
    │   ├── accounts/             # User (Customer/Employee/Manager), Profiles, Branches
    │   ├── banking/              # Accounts, Transactions, Double-Entry Ledgers, Transfers
    │   ├── approvals/            # Loans, KYC, Service Requests, Maker-Checker
    │   ├── notifications/        # Real-time WebSocket consumers & alerts
    │   └── audit/                # Immutable branch audit log engine
    ├── requirements.txt          # Python dependencies
    ├── .env.example              # Environment template (SQLite & PostgreSQL)
    └── manage.py
```

---

## Key Features

### 1. Three Segregated Authentication Portals
- **Role Selection Gate (`/login`)**: Three distinct cards routing to independent login pages.
- **Customer Banking (`/customer/login`)**: Directs to `/customer/dashboard` after validating customer credentials.
- **Employee Portal (`/employee/login`)**: Directs to `/employee/dashboard`; rejects non-employee logins.
- **Branch Admin / Manager (`/manager/login`)**: Directs to `/manager/dashboard`; rejects unauthorized roles.

### 2. Transaction Integrity & Atomic Double-Entry Ledgers
- **Atomic Concurrency Protection**: Transactions execute inside `transaction.atomic()` with `select_for_update()` row locking on accounts to eliminate race conditions and double spending.
- **Strict Decimal Arithmetic**: All monetary fields and operations use Python `Decimal` with 2 decimal places. Floating-point arithmetic is never used for balances.
- **Double-Entry Ledgers**: Every transfer creates matching `LedgerEntry` records (`DEBIT` for the sender, `CREDIT` for the receiver).
- **Idempotency Protection**: Client-provided idempotency keys prevent duplicate deductions on network retries.
- **Electronic Vouchers**: Instant printable/downloadable transaction receipts with unique reference numbers (`TXN-YYYYMMDD-...`).

### 3. Maker-Checker Dual Control Governance
- High-risk operations (such as high-value transfers, loan releases, and account freezes) require two distinct individuals.
- The staff member who initiates an approval request is programmatically blocked from approving it; an independent Branch Manager must sign off.

### 4. Genuine Real-Time Updates (Django Channels & WebSockets)
- Persistent WebSocket connection to `/ws/notifications/?token=<token>`.
- Automatic live balance refresh across open customer tabs upon receiving funds.
- Instant transaction notification popups.
- Live staff and branch manager alert feeds for new customer service requests and loans.
- Automatic exponential-backoff reconnection and heartbeat keep-alive.

---

## Demo Test Accounts

The project includes pre-seeded demo users with realistic balances and transactions:

| Role | Portal URL | Identifier (Username / ID / Email) | Password | Assigned Branch |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `/customer/login` | `customer@securebank.com` or `CUST1001` | `DemoPass123!` | Downtown Metro Main Branch |
| **Employee** | `/employee/login` | `employee@securebank.com` or `EMP2001` | `DemoPass123!` | Downtown Metro Main Branch |
| **Branch Manager** | `/manager/login` | `manager@securebank.com` or `MGR3001` | `DemoPass123!` | Downtown Metro Main Branch |
| **Recipient Customer** | `/customer/login` | `sarah.jenkins` or `CUST1002` | `DemoPass123!` | Downtown Metro Main Branch |

*Note: Demo balances ($15,450.00 Savings, $4,820.50 Current) are simulated and cannot be mistaken for real currency.*

---

## Quickstart & Local Setup

### Prerequisites
- Python 3.11+ or 3.12+
- Node.js 18+ and npm

### 1. Backend Setup (Django & Channels)
```bash
cd backend

# Create and activate Python virtual environment
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment file
copy .env.example .env

# Apply database migrations
python manage.py migrate

# Seed database with demo accounts, transactions, and branches
python manage.py seed_demo_data

# Run ASGI development server
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup (React & Vite)
In a second terminal:
```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server with proxy to backend
npm run dev
```

Open your browser at **`http://localhost:5173/`**.

---

## REST API Documentation (`/api/v1/`)

### Authentication
- `POST /api/v1/auth/login/` — Authenticate by username/email/ID + password + expected role.
- `POST /api/v1/auth/logout/` — Invalidate session / auth token.
- `GET  /api/v1/auth/me/` — Retrieve authenticated user profile and assigned branch.
- `PUT  /api/v1/auth/me/` — Update profile details and address.
- `POST /api/v1/auth/register/` — Self-register new customer account.
- `POST /api/v1/auth/change-password/` — Change password.
- `POST /api/v1/auth/password-reset/` — Generate secure password reset token.
- `POST /api/v1/auth/password-reset/confirm/` — Confirm password reset.
- `GET  /api/v1/auth/branches/` — List bank branches.

### Customer Operations
- `GET  /api/v1/customer/dashboard-summary/` — Net liquidity, recent transactions, 30-day income/expense stats.
- `GET  /api/v1/customer/accounts/` — List customer accounts and balances.
- `POST /api/v1/customer/accounts/` — Open new high-yield savings, checking, or fixed deposit account.
- `GET  /api/v1/customer/transactions/` — Search & filter transaction history (type, date range, pagination).
- `GET  /api/v1/customer/statements/` — Download official CSV statement.
- `POST /api/v1/customer/transfers/` — Atomic money transfer with idempotency key.
- `GET  /api/v1/customer/beneficiaries/` — List saved transfer beneficiaries.
- `POST /api/v1/customer/beneficiaries/` — Add new beneficiary.
- `GET  /api/v1/customer/bills/` — List paid utility bills.
- `POST /api/v1/customer/bills/` — Pay utility bill (Electricity, Water, Internet, Mobile).
- `GET  /api/v1/customer/loans/` — List customer loan applications.
- `POST /api/v1/customer/loans/` — Submit new financing application.
- `GET  /api/v1/customer/kyc/` — List KYC verification records.
- `POST /api/v1/customer/kyc/` — Submit government ID for verification.

### Staff & Employee Operations
- `GET  /api/v1/employee/dashboard/` — Branch metrics and activity feed.
- `GET  /api/v1/employee/customers/` — Search customer directory with masked accounts.
- `GET  /api/v1/employee/kyc/` — Review submitted KYC documents.
- `POST /api/v1/employee/kyc/` — Approve or reject KYC document.
- `GET  /api/v1/employee/service-requests/` — Branch service requests.
- `POST /api/v1/employee/service-requests/` — Update ticket status.
- `GET  /api/v1/employee/transactions/` — Branch transaction investigation.
- `POST /api/v1/employee/onboard-customer/` — Assist in-branch customer onboarding.

### Branch Administration (Manager)
- `GET  /api/v1/manager/dashboard/` — Branch customer count, volume, 7-day trend chart.
- `GET  /api/v1/manager/approvals/` — Maker-Checker pending approvals queue.
- `POST /api/v1/manager/approvals/` — Authorize/Reject approval (initiators blocked).
- `GET  /api/v1/manager/loans/` — Branch loan applications queue.
- `POST /api/v1/manager/loans/` — Underwrite & approve loan (auto-disburses funds).
- `GET  /api/v1/manager/employees/` — List branch employees.
- `POST /api/v1/manager/employees/` — Toggle staff active status or update designation.
- `GET  /api/v1/manager/audit-logs/` — Chronological immutable audit trail.
- `GET  /api/v1/manager/reports/` — Branch performance report & deposits breakdown.

---

## WebSocket Event Specification

- **Endpoint**: `ws://127.0.0.1:8000/ws/notifications/?token=<auth_token>`
- **Channel Layer**: In-memory `channels.layers.InMemoryChannelLayer` for local dev; Redis for production.

### Emitted Events:
1. `CONNECTION_ESTABLISHED`: Emitted upon connection with unread notifications count.
2. `BALANCE_UPDATED`: `{ account_number, new_balance, currency }` — Live dashboard balance refresh.
3. `NOTIFICATION`: `{ id, title, message, notification_type, created_at }` — Transaction or security notification.
4. `STAFF_ALERT`: Broadcast to branch staff channel when customer submits service request or KYC document.
5. `APPROVAL_ALERT`: Broadcast to branch managers when high-risk approval or loan requires review.

---

## Switching from SQLite to PostgreSQL

To deploy with PostgreSQL:
1. Install `psycopg2-binary`:
   ```bash
   pip install psycopg2-binary
   ```
2. In `backend/.env`, configure your PostgreSQL credentials:
   ```env
   DB_ENGINE=postgresql
   DB_NAME=securebank
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   ```
3. Run migrations and demo seeding:
   ```bash
   python manage.py migrate
   python manage.py seed_demo_data
   ```

---

## Running Tests

Execute the automated backend test suite:
```bash
cd backend
python manage.py test tests
```
The test suite validates:
- Login and logout with session/token invalidation
- Portal role guards & unauthorized access rejection
- Cross-branch access restriction
- Atomic transfers with matching double-entry ledgers
- Insufficient balance handling
- Invalid beneficiary rejection
- Idempotency key duplicate prevention
- Maker-Checker violation enforcement (initiator cannot self-approve)
- Immutable audit log generation

---

## Security Disclaimer

SecureBank is a software demonstration of secure banking architectural principles. It is designed for educational, demonstration, and evaluation purposes and is not connected to live banking networks or external clearinghouses.
