import type { NextRequest } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import type { PaymentService } from './payment.service'
import type { CreatePaymentIntentRequest } from './payment.types'

export class PaymentController {
  constructor(private service: PaymentService) {}

  async createPaymentIntent(
    userId: string,
    email: string,
    request: NextRequest,
  ) {
    try {
      if (!userId || !email) {
        throw new Error('userId and email are required')
      }

      const body = (await request.json()) as CreatePaymentIntentRequest
      const data = await this.service.createPaymentIntent(userId, email, body)
      return createSuccessResponse(data, HTTP_STATUS.CREATED)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getPaymentIntentStatus(paymentIntentId: string) {
    try {
      const data = await this.service.getPaymentIntentStatus(paymentIntentId)
      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async cancelPaymentIntent(paymentIntentId: string) {
    try {
      await this.service.cancelPaymentIntent(paymentIntentId)
      return createSuccessResponse({ message: 'Paiement annulé' })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
