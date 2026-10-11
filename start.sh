#!/usr/bin/env bash
# SecureBank Root Start Script for Render / Cloud Hosts
set -o errexit

if [ -d "backend" ]; then
    echo "==> Entering backend directory..."
    cd backend
fi

echo "==> Starting Daphne ASGI server on port ${PORT:-8000}..."
exec daphne -b 0.0.0.0 -p "${PORT:-8000}" config.asgi:application
