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

export class SubscriptionController {
  constructor(private service: SubscriptionService) {}

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
      const subscription = await this.service.getUserSubscription(userId)

      if (!subscription.subscription) {
        return createSuccessResponse(
          { message: 'Aucun abonnement actif' },
          HTTP_STATUS.NOT_FOUND,
        )
      }

      return createSuccessResponse({ message: 'Abonnement annulé' })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
