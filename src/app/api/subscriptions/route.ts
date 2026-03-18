import { NextRequest } from 'next/server'

import { subscriptionController } from '@/server/domains/subscription'
import {
  PLAN_FEATURES,
  PLAN_PRICING,
} from '@/server/domains/subscription/subscription.constants'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/server/shared/utils/api.utils'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  if (session.devMode?.isActive) {
    const tier = session.devMode.subscription.tier
    const features = PLAN_FEATURES[tier]
    const pricing = PLAN_PRICING[tier]

    const mockSubscription = {
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
    }

    return createSuccessResponse(mockSubscription, HTTP_STATUS.OK)
  }

  return subscriptionController.getUserSubscription(session.user.id)
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || !session?.user?.email) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  return subscriptionController.createCheckoutSession(
    session.user.id,
    session.user.email,
    request,
  )
}
