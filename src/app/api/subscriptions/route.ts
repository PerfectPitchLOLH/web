import { NextRequest } from 'next/server'

import { subscriptionController } from '@/server/domains/subscription'
import {
  PLAN_FEATURES,
  PLAN_PRICING,
} from '@/server/domains/subscription/subscription.constants'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'
import { createSuccessResponse } from '@/server/shared/utils/api.utils'

export async function GET(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response

  const { session } = auth

  if (session.devMode?.isActive) {
    const tier = session.devMode.subscription.tier
    const features = PLAN_FEATURES[tier]
    const pricing = PLAN_PRICING[tier]

    return createSuccessResponse({
      hasActiveSubscription: true,
      subscription: {
        id: 'dev_mode_subscription',
        status: 'active' as const,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        plan: {
          id: tier,
          name: tier.charAt(0).toUpperCase() + tier.slice(1),
          stripePriceId: `dev_mode_${tier}`,
          monthlyPrice: pricing.monthly,
          yearlyPrice: pricing.yearly,
          transcriptionMinutes: features.transcriptionMinutes,
        },
      },
      invoices: [],
    })
  }

  return subscriptionController.getUserSubscription(session.user.id)
}

export async function POST(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return subscriptionController.createCheckoutSession(
    auth.session.user.id,
    auth.session.user.email,
    request,
  )
}
