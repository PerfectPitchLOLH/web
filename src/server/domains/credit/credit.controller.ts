import { NextRequest } from 'next/server'

import { STRIPE_PRICES } from '@/lib/stripe.prices'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import type { PaymentService } from '../payment/payment.service'
import { CREDIT_BUNDLES } from './credit.constants'
import type { CreditService } from './credit.service'
import type {
  CreditBundleId,
  CreditHistoryParams,
  PurchaseBundleRequest,
} from './credit.types'

export class CreditController {
  constructor(
    private service: CreditService,
    private paymentService?: PaymentService,
  ) {}

  async getUserCredits(userId: string) {
    try {
      const credits = await this.service.getUserCreditsBalance(userId)
      return createSuccessResponse(credits)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async createBundlePurchaseCheckout(
    userId: string,
    email: string,
    request: NextRequest,
  ) {
    try {
      if (!this.paymentService) {
        return handleApiError(new Error('Payment service not configured'))
      }

      const body = (await request.json()) as PurchaseBundleRequest
      const bundle =
        CREDIT_BUNDLES[
          body.bundleId.toUpperCase() as keyof typeof CREDIT_BUNDLES
        ]

      if (!bundle) {
        return createSuccessResponse(
          { error: 'Bundle invalide' },
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      const checkoutSession = await this.paymentService.createCheckoutSession(
        userId,
        email,
        {
          bundleId: bundle.id,
          bundleName: bundle.name,
          minutes: bundle.minutes,
          priceId: this.getPriceId(bundle.id),
        },
      )

      return createSuccessResponse(checkoutSession, HTTP_STATUS.CREATED)
    } catch (error) {
      return handleApiError(error)
    }
  }

  private getPriceId(bundleId: CreditBundleId): string {
    return STRIPE_PRICES.credits[bundleId]
  }

  async purchaseBundle(userId: string, request: NextRequest) {
    try {
      const body = (await request.json()) as PurchaseBundleRequest
      const credits = await this.service.purchaseBundle(userId, body.bundleId)
      return createSuccessResponse(credits, HTTP_STATUS.CREATED)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getBundles() {
    try {
      const bundles = this.service.getBundles()
      return createSuccessResponse(bundles)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getTransactionHistory(userId: string, request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url)
      const params: CreditHistoryParams = {
        page: searchParams.get('page')
          ? parseInt(searchParams.get('page')!)
          : undefined,
        limit: searchParams.get('limit')
          ? parseInt(searchParams.get('limit')!)
          : undefined,
        type:
          (searchParams.get('type') as CreditHistoryParams['type']) ||
          undefined,
      }

      const history = await this.service.getTransactionHistory(userId, params)
      return createSuccessResponse(history)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
