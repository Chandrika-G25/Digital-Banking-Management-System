# Digital Banking Management System (SecureBank)
> **"Your Trust. Our Priority." — Enterprise-Grade Multi-Role Banking & Financial Ledger Platform**

[![React](https://img.shields.io/badge/Frontend-React.js%2019-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript%20ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/Markup-HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/Styles-CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Python](https://img.shields.io/badge/Backend-Python%203.12-3776AB?logo=python&logoColor=white)](https://python.org/)
[![Django](https://img.shields.io/badge/Framework-Django%205.1-092E20?logo=django&logoColor=white)](https://djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/API-Django%20REST%20Framework-red?logo=django)](https://www.django-rest-framework.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)

---

## Technical Skills & Architecture Stack

| Category | Technology | Usage & Core Responsibilities in SecureBank |
| :--- | :--- | :--- |
| **Frontend Framework** | **React.js (v19)** | Single Page Application (SPA), role-guarded routing (`react-router-dom`), centralized authentication state, dynamic interactive forms, and reusable component ecosystem. |
| **Frontend Markup** | **HTML5** | Semantic structure for accessible banking forms, multi-step wizards, audit tables, and downloadable transaction vouchers. |
| **Frontend Styling** | **CSS3 (Vanilla)** | Custom royal navy design system, responsive flexbox & grid layouts, glassmorphic navigation, status badges, and transition micro-interactions. |
| **Frontend Scripting** | **JavaScript (ES6+)** | Asynchronous HTTP handling (`axios`), persistent WebSocket connection manager, client-side input masking, and reactive UI updates. |
| **Backend Language** | **Python (v3.12)** | Core banking domain logic, mathematical decimal precision, cryptographic password hashing, automated test suites, and database transactions. |
| **Web Framework** | **Django (v5.1)** | Enterprise MVC framework managing ORM models, migrations, authentication sessions, CSRF protection, and WhiteNoise static asset serving. |
| **API Architecture** | **REST APIs (DRF)** | Standardized RESTful endpoints (`/api/v1/`), token authentication, request serializers, idempotency enforcement, and permission classes. |
| **Relational Database** | **MySQL** | Production ACID-compliant database with foreign keys, transaction isolation, indexed account lookups, and double-entry ledger persistence. |
| **Real-Time WebSockets** | **Daphne (ASGI) & Channels** | Persistent bidirectional notification pipeline for instant balance refresh, customer service alerts, and manager approvals. |

---

## Architecture Overview

```
SecureBank
├── frontend/                     # React 19 + Vite Frontend SPA (HTML5, CSS3, JS ES6+)
│   ├── src/
│   │   ├── components/           # Reusable UI cards, tables, badges, receipts, modals
│   │   ├── layouts/              # Role-aware dashboard layouts & WebSocket manager
│   │   ├── pages/                # Multi-step account opening, verification, logins, dashboards
│   │   ├── services/             # API client (Axios), Auth service, and WebSocket connection
│   │   └── index.css             # Navy/Royal Blue design system
│   ├── vite.config.js            # Reverse proxy configuration (/api & /ws)
│   ├── vercel.json               # SPA production rewrites for Vercel
│   └── package.json
│
├── backend/                      # Python 3.12 + Django 5.1 ASGI Application
│   ├── config/                   # Settings (MySQL support), ASGI/WSGI, URLs, Routing
│   ├── apps/
│   │   ├── accounts/             # User (Customer/Employee/Manager), Profiles, Branches, Online Account Opening
│   │   ├── banking/              # Accounts, Transactions, Double-Entry Ledgers, Cash Deposits
│   │   ├── approvals/            # Loans, KYC, Service Requests, Dual-Control Approvals
│   │   ├── notifications/        # Real-time WebSocket consumers & alert dispatchers
│   │   └── audit/                # Immutable branch audit log engine
│   ├── Procfile                  # Daphne ASGI process for Render / Railway
│   ├── build.sh                  # Production build script (migrate + collectstatic)
│   ├── requirements.txt          # Python dependencies (Django, DRF, PyMySQL, Daphne, WhiteNoise)
│   ├── .env.example              # Development environment template
│   └── manage.py
│
├── DEPLOYMENT.md                 # Complete production deployment guide (Vercel + Render/Railway + MySQL)
├── render.yaml                   # Infrastructure-as-code blueprint
└── README.md
```

---

## Key Features

### 1. Three Segregated Authentication Portals (Role-Based Access Control)
- **Role Selection Gate (`/login`)**: Three distinct cards routing to independent login pages.
- **Customer Banking (`/customer/login`)**: Directs to `/customer/dashboard` after validating customer credentials.
- **Employee Portal (`/employee/login`)**: Directs to `/employee/dashboard`; restricts non-branch-staff access.
- **Branch Admin / Manager (`/manager/login`)**: Directs to `/manager/dashboard`; restricts unauthorized personnel.

### 2. Customer Online Account Opening & KYC Verification
- **Multi-Step Onboarding Form (`/customer/open-account`)**:
  - **Step 1: Personal Details**: Name, DOB, contact information, residential address, city, state, and postal code.
  - **Step 2: Account Specifications**: Choice of Savings or Current account, preferred branch, initial deposit amount.
  - **Step 3: Identity & KYC Submission**: Government ID type, document number, document upload, and initial password setup.
- **Controlled Status Lifecycle**: Accounts register in `PENDING` verification status, awaiting staff review.
- **Customer Verification Portal (`/customer/verification-status`)**: Customers track live application progress with real-time feedback.
- **Employee Verification Dashboard (`/employee/customer-verification`)**: Bank staff review KYC documentation, examine identity credentials, and approve or reject accounts with structured audit trails.

### 3. Transaction Integrity & Atomic Double-Entry Ledgers
- **Atomic Concurrency Protection**: Transfers execute inside `transaction.atomic()` with `select_for_update()` row locking on accounts to eliminate race conditions and double spending.
- **Strict Decimal Arithmetic**: All monetary fields and operations use Python `Decimal` with 2 decimal places. Floating-point arithmetic is never used for balances.
- **Double-Entry Ledgers**: Every transfer creates matching `LedgerEntry` records (`DEBIT` for the sender, `CREDIT` for the receiver).
- **Idempotency Protection**: Client-provided idempotency keys prevent duplicate deductions on network retries.
- **Electronic Vouchers**: Instant printable/downloadable transaction receipts with unique reference numbers (`TXN-YYYYMMDD-...`).

### 4. Over-The-Counter Cash Deposits with Dual Control
- **Teller Cash Deposit Desk (`/employee/cash-deposit`)**: Branch staff perform over-the-counter cash deposits for customer accounts.
- **Maker-Checker Dual Approval**: Cash deposits exceeding $10,000 automatically trigger a manager approval requirement before crediting account balance.
- **Manager Approval Desk (`/manager/cash-deposits`)**: Branch managers inspect high-value deposits and authorize or reject transactions.

### 5. Genuine Real-Time Updates (Django Channels & WebSockets)
- Persistent WebSocket connection to `/ws/notifications/?token=<token>`.
- Automatic live balance refresh across open customer tabs upon receiving funds.
- Instant transaction notification popups.
- Live staff and branch manager alert feeds for new customer service requests, deposits, and loans.
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

*Note: Demo balances are simulated and for evaluation purposes only.*

---

## Quickstart & Local Setup

### Prerequisites
- Python 3.11+ or 3.12+
- Node.js 18+ and npm
- MySQL Server 8.0+ (or SQLite for quick local test)

### 1. Backend Setup (Django & Python)
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
```

#### MySQL Database Configuration (`backend/.env`):
```env
DB_ENGINE=mysql
DB_NAME=securebank_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306
```

Apply migrations and seed initial bank data:
```bash
# Run database migrations
python manage.py migrate

# Seed database with branches, accounts, and demo users
python manage.py seed_demo_data

# Start Daphne ASGI development server
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup (React & Vite)
In a second terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at **`http://localhost:5173/`**.

---

## REST API Documentation (`/api/v1/`)

### Authentication & Onboarding
- `POST /api/v1/auth/login/` — Authenticate by username/email/ID + password + role.
- `POST /api/v1/auth/logout/` — Invalidate session / auth token.
- `GET  /api/v1/auth/me/` — Retrieve authenticated user profile and assigned branch.
- `POST /api/v1/auth/register/` — Self-register new customer account.
- `POST /api/v1/auth/open-account/` — Multi-step online customer account opening & KYC submission.
- `GET  /api/v1/auth/branches/` — List bank branches.

### Customer Operations
- `GET  /api/v1/customer/dashboard-summary/` — Net liquidity, recent transactions, 30-day income/expense stats.
- `GET  /api/v1/customer/accounts/` — List customer accounts and balances.
- `GET  /api/v1/customer/transactions/` — Search & filter transaction history (type, date range, pagination).
- `POST /api/v1/customer/transfers/` — Atomic money transfer with idempotency key.
- `GET  /api/v1/customer/beneficiaries/` — List saved transfer beneficiaries.
- `POST /api/v1/customer/beneficiaries/` — Add new beneficiary.
- `GET  /api/v1/customer/bills/` — List paid utility bills.
- `POST /api/v1/customer/bills/` — Pay utility bill (Electricity, Water, Internet, Mobile).
- `GET  /api/v1/customer/verification-status/` — Retrieve real-time account and KYC verification status.

### Staff & Employee Operations
- `GET  /api/v1/employee/dashboard/` — Branch metrics and activity feed.
- `GET  /api/v1/employee/customers/` — Search customer directory with masked accounts.
- `GET  /api/v1/employee/customer-verification/` — List pending customer account verifications.
- `POST /api/v1/employee/customer-verification/` — Approve or reject customer account & KYC.
- `POST /api/v1/employee/cash-deposits/` — Process over-the-counter cash deposits.
- `GET  /api/v1/employee/service-requests/` — Branch service requests.

### Branch Administration (Manager)
- `GET  /api/v1/manager/dashboard/` — Branch customer count, volume, 7-day trend chart.
- `GET  /api/v1/manager/cash-deposits/` — Review pending high-value cash deposits.
- `POST /api/v1/manager/cash-deposits/` — Authorize or reject cash deposit.
- `GET  /api/v1/manager/approvals/` — Maker-Checker pending approvals queue.
- `GET  /api/v1/manager/audit-logs/` — Chronological immutable audit trail.
- `GET  /api/v1/manager/reports/` — Branch performance report & deposits breakdown.

---

## Running Automated Tests

Execute the automated backend test suite:
```bash
cd backend
python manage.py test tests
```
The test suite validates:
- Login and logout with session/token invalidation
- Portal role guards & unauthorized access rejection
- Customer online account opening & verification lifecycle
- Cross-branch access restriction
- Atomic transfers with matching double-entry ledgers
- Cash deposit limits and manager threshold approvals
- Idempotency key duplicate prevention
- Maker-Checker governance enforcement

---

## Production Deployment

Refer to [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions:
- **Frontend**: Deploy to **Vercel** (`frontend/vercel.json` SPA configuration included).
- **Backend**: Deploy to **Render** or **Railway** using the included `Procfile` (`daphne -b 0.0.0.0 -p $PORT config.asgi:application`).
- **Database**: Connect a managed **MySQL** instance.

---

## Security Disclaimer

SecureBank is a software demonstration of secure banking architectural principles. It is designed for educational, portfolio, and evaluation purposes and is not connected to live banking networks or clearinghouses.
