#!/bin/bash
set -e

echo "🔍 Checking for dependency changes..."

if [ -f package.json ]; then
  echo "📦 Installing/updating dependencies..."
  npm install
  echo "✅ Dependencies are up to date"
fi

echo "🔑 Starting Stripe CLI webhook listener..."

STRIPE_OUTPUT="/tmp/stripe-listen.log"

if [ -f .env ]; then
  STRIPE_SECRET_KEY=$(grep "^STRIPE_SECRET_KEY=" .env | cut -d'=' -f2 | tr -d '"')

  if [ -n "$STRIPE_SECRET_KEY" ]; then
    stripe listen --api-key "$STRIPE_SECRET_KEY" --forward-to localhost:3000/api/webhooks/stripe > "$STRIPE_OUTPUT" 2>&1 &
    STRIPE_PID=$!

    echo "⏳ Waiting for Stripe webhook secret..."
    for i in {1..30}; do
      if grep -q "webhook signing secret is" "$STRIPE_OUTPUT" 2>/dev/null; then
        WEBHOOK_SECRET=$(grep "webhook signing secret is" "$STRIPE_OUTPUT" | sed -n 's/.*webhook signing secret is \(whsec_[a-zA-Z0-9_]*\).*/\1/p' | head -1)

        if [ -n "$WEBHOOK_SECRET" ]; then
          echo "✅ Webhook secret captured: ${WEBHOOK_SECRET:0:20}..."

          if [ -f .env.local ] && grep -q "^STRIPE_WEBHOOK_SECRET=" .env.local; then
            sed -i "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=\"$WEBHOOK_SECRET\"|" .env.local
          else
            echo "STRIPE_WEBHOOK_SECRET=\"$WEBHOOK_SECRET\"" >> .env.local
          fi

          echo "✅ Updated STRIPE_WEBHOOK_SECRET in .env.local"
          break
        fi
      fi

      if [ $i -eq 30 ]; then
        echo "⚠️  Warning: Could not capture webhook secret after 30 seconds"
        echo "⚠️  Stripe listen might not be running properly"
        if [ -f "$STRIPE_OUTPUT" ]; then
          cat "$STRIPE_OUTPUT"
        fi
      fi

      sleep 1
    done

    tail -f "$STRIPE_OUTPUT" &
  else
    echo "⚠️  STRIPE_SECRET_KEY not found in .env, skipping Stripe webhook setup"
  fi
else
  echo "⚠️  .env file not found, skipping Stripe webhook setup"
fi

echo "🚀 Starting application..."
exec "$@"
