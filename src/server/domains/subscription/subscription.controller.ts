import type { NextRequest } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import type { SubscriptionService } from './subscription.service'
import type {
  CreateCheckoutSessionRequest,
  CreatePortalSessionRequest,
} from './subscription.types'

type UpgradeSubscriptionRequest = {
  priceId: string
}

export class SubscriptionController {
  constructor(private service: SubscriptionService) {}

  async getPlans() {
    try {
      const data = await this.service.getPlans()
      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getUserSubscription(userId: string) {
    try {
      const data = await this.service.getUserSubscription(userId)
      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    request: NextRequest,
  ) {
    try {
      const body = (await request.json()) as CreateCheckoutSessionRequest
      const data = await this.service.createCheckoutSession(userId, email, body)
      return createSuccessResponse(data, HTTP_STATUS.CREATED)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async createPortalSession(userId: string, request: NextRequest) {
    try {
      const body = (await request.json()) as CreatePortalSessionRequest
      const data = await this.service.createPortalSession(
        userId,
        body.returnUrl,
      )
      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async cancelSubscription(userId: string) {
    try {
      await this.service.cancelSubscription(userId)
      return createSuccessResponse({ message: 'Résiliation programmée' })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async reactivateSubscription(userId: string) {
    try {
      await this.service.reactivateSubscription(userId)
      return createSuccessResponse({ message: 'Abonnement réactivé' })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async upgradeSubscription(userId: string, request: NextRequest) {
    try {
      const body = (await request.json()) as UpgradeSubscriptionRequest
      console.log("[CONTROLLER] Requête d'upgrade reçue:", {
        userId,
        priceId: body.priceId,
        timestamp: new Date().toISOString(),
      })

      const checkoutSession = await this.service.upgradeSubscription(
        userId,
        body.priceId,
      )

      console.log('[CONTROLLER] Session Checkout créée avec succès:', {
        userId,
        sessionId: checkoutSession.sessionId,
        url: checkoutSession.url,
      })

      return createSuccessResponse({
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.sessionId,
      })
    } catch (error) {
      console.error("[CONTROLLER] Erreur lors de l'upgrade:", {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      })
      return handleApiError(error)
    }
  }
}
