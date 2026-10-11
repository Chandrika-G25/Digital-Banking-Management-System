# SecureBank Production Deployment Guide

This guide walks you through deploying **SecureBank** using the decoupled production architecture:
* **Frontend**: React + Vite deployed on **Vercel**
* **Backend**: Django + Django REST Framework + Daphne (ASGI) deployed on **Render** (or **Railway**)
* **Database**: Managed **MySQL** database (Railway, Aiven, PlanetScale, Clever Cloud, or AWS RDS)

---

## Architecture Overview

```
                                      +------------------------------------+
                                      |         Vercel (Frontend)          |
                                      |   https://securebank.vercel.app    |
                                      +-----------------+------------------+
                                                        |
                            REST API HTTPS requests     |  WebSocket (wss://)
                                                        v
                                      +------------------------------------+
                                      |     Render / Railway (Backend)     |
                                      | https://securebank-api.onrender.com|
                                      |          (Daphne ASGI)             |
                                      +-----------------+------------------+
                                                        |
                                                        | MySQL Driver (PyMySQL)
                                                        v
                                      +------------------------------------+
                                      |        Managed MySQL Server        |
                                      |       Port 3306 (SSL Ready)        |
                                      +------------------------------------+
```

---

## Step 1: Set Up MySQL Database

You can use any cloud MySQL provider. Here are two popular zero-friction options:

### Option A: Railway (Quickest)
1. Go to [railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** -> **Provision MySQL**.
3. In the MySQL service tab, click **Variables** or **Connect**.
4. Copy the `DATABASE_URL` (format: `mysql://root:password@roundhouse.proxy.rlwy.net:3306/railway`).

### Option B: Aiven / PlanetScale / AWS RDS
1. Create a MySQL database instance.
2. Note the Host, Port (default 3306), Database Name, User, and Password.

---

## Step 2: Deploy the Backend (Render or Railway)

### Deploying on Render

1. **Push your code to GitHub**:
   Ensure your changes are committed and pushed to your GitHub repository.

2. **Create Web Service on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository.

3. **Configure Service Settings**:
   - **Name**: `securebank-backend`
   - **Region**: Closest to your users (e.g., Oregon, Frankfurt)
   - **Branch**: `main` (or your active branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh` (or `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput`)
   - **Start Command**: `daphne -b 0.0.0.0 -p $PORT config.asgi:application`

4. **Add Environment Variables**:
   Under **Environment Variables**, add:

   | Key | Value | Note |
   | :--- | :--- | :--- |
   | `SECRET_KEY` | *(Generate a 50+ character random string)* | Required |
   | `DEBUG` | `False` | Enforces production mode |
   | `ALLOWED_HOSTS` | `*` | Or `your-service.onrender.com` |
   | `DATABASE_URL` | `mysql://user:pass@host:3306/dbname` | Or configure individual `DB_*` vars |
   | `DB_ENGINE` | `mysql` | Used if individual vars are used |
   | `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` | Add your Vercel URL once created |
   | `CSRF_TRUSTED_ORIGINS` | `https://your-frontend.vercel.app,https://*.onrender.com` | Prevents CSRF errors |
   | `CHANNEL_LAYER_BACKEND` | `inmemory` | In-memory for single web instance |
   | `PYTHON_VERSION` | `3.12.0` | Matches project runtime |

5. **Deploy & Verify**:
   - Click **Create Web Service**.
   - Monitor the build logs. You will see migrations execute and static assets collect.
   - Once live, visit: `https://your-service.onrender.com/api/v1/health/`
   - Expected response:
     ```json
     {"status": "healthy", "service": "SecureBank API", "version": "1.0.0"}
     ```

6. **Seed Initial Demo Data (Optional)**:
   - On the Render dashboard, open the **Shell** tab and run:
     ```bash
     python manage.py seed_demo_data
     ```
   - This creates initial branches, teller employees, managers, and demo customers.

---

## Step 3: Deploy the Frontend (Vercel)

1. **Sign in to Vercel**:
   - Go to [vercel.com](https://vercel.com/) and sign in with GitHub.
   - Click **Add New...** -> **Project**.

2. **Import Repository**:
   - Select your SecureBank repository.

3. **Configure Project**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `frontend`.
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

4. **Set Environment Variables**:
   Under **Environment Variables**, add:

   | Name | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://your-service.onrender.com` *(from Step 2)* |
   | `VITE_WS_URL` | `wss://your-service.onrender.com` *(optional: auto-derived)* |

5. **Deploy**:
   - Click **Deploy**.
   - Vercel will install dependencies, run `npm run build`, and deploy in ~30 seconds.
   - Your frontend URL will look like: `https://securebank-app.vercel.app`.

6. **Connect CORS**:
   - Copy your Vercel URL (`https://securebank-app.vercel.app`).
   - Go back to your backend on Render -> **Environment Variables**.
   - Update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to include your Vercel domain.
   - Save changes (Render will trigger a quick redeploy).

---

## Step 4: Verification & Live Testing

Once both services are deployed:

1. **Landing Page**:
   Visit `https://your-frontend.vercel.app/`. Ensure the hero section loads with the **Open a New Bank Account** button.

2. **Open an Account Online**:
   Click **Open a New Bank Account** or go to `/customer/open-account`.
   - Step through the 5-step registration wizard.
   - Confirm generation of the real Customer ID (`SB100001` format).

3. **Customer Login**:
   Visit `/customer/login`.
   - Log in with your new Customer ID and password.
   - Verify that unverified applications route directly to `/customer/verification-status`.

4. **Employee Verification Portal**:
   Visit `/employee/login`.
   - Sign in as employee (`emp_officer_1` or demo credentials).
   - Go to `/employee/customer-verification`.
   - Review and approve the application, verifying real-time WebSocket status updates.

---

## Deployment Checklist & Security Summary

- [x] **WhiteNoise Static File Compression**: Configured in Django `MIDDLEWARE` and `STATICFILES_STORAGE`.
- [x] **Vercel SPA Routing (`vercel.json`)**: Configured to route all paths to `index.html`.
- [x] **Daphne ASGI Process**: Configured in `Procfile` for WebSocket and HTTP traffic.
- [x] **Dynamic Base URLs**: `VITE_API_URL` and `VITE_WS_URL` dynamic loading with local fallback.
- [x] **CORS & CSRF Whitelisting**: Environment-driven trusted origin management.
- [x] **Password Protection**: Passwords hashed with PBKDF2; never transmitted in plaintext or returned in API responses.
- [x] **Health Check Endpoint**: `/api/v1/health/` active for uptime monitoring.
