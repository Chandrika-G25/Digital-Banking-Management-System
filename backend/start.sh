#!/usr/bin/env bash
# SecureBank Backend Start Script
set -o errexit

echo "==> Starting Daphne ASGI server on port ${PORT:-8000}..."
exec daphne -b 0.0.0.0 -p "${PORT:-8000}" config.asgi:application
