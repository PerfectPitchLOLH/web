#!/bin/bash
set -e

echo "🔍 Checking for dependency changes..."

if [ -f package.json ]; then
  echo "📦 Installing/updating dependencies..."
  npm install
  echo "✅ Dependencies are up to date"
fi

echo "🚀 Starting application..."
exec "$@"
