#!/usr/bin/env bash
# SecureBank Root Cloud Build Script (Render, Railway, Fly.io, etc.)
set -o errexit

if [ -d "backend" ]; then
    echo "==> Navigating to backend directory..."
    cd backend
fi

echo "==> [1/3] Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> [2/3] Running database migrations..."
python manage.py migrate --noinput

echo "==> [3/3] Collecting static files with WhiteNoise..."
python manage.py collectstatic --noinput

echo "==> SecureBank build completed successfully!"
