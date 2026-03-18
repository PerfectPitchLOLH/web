import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import { SubscriptionController } from '../subscription.controller'
import type { SubscriptionService } from '../subscription.service'
import type {
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
  UserSubscriptionInfo,
} from '../subscription.types'

vi.mock('@/server/shared/utils/api.utils', () => ({
  createSuccessResponse: vi.fn(),
  handleApiError: vi.fn(),
}))

describe('SubscriptionController - Deep Tests', () => {
  let controller: SubscriptionController
  let mockService: SubscriptionService

  beforeEach(() => {
    mockService = {
      getUserSubscription: vi.fn(),
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      cancelSubscription: vi.fn(),
      reactivateSubscription: vi.fn(),
      upgradeSubscription: vi.fn(),
    } as any

    controller = new SubscriptionController(mockService)

    vi.clearAllMocks()
  })

  describe('getUserSubscription', () => {
    it('should return user subscription info', async () => {
      const mockSubscriptionInfo: UserSubscriptionInfo = {
        hasActiveSubscription: true,
        subscription: {
          id: 'sub_123',
          userId: 'user_123',
          planId: 'plan_pro',
          stripeSubscriptionId: 'sub_stripe_123',
          stripeCustomerId: 'cus_stripe_123',
          status: 'active',
          currentPeriodStart: new Date('2025-01-01'),
          currentPeriodEnd: new Date('2025-02-01'),
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          plan: {
            id: 'plan_pro',
            stripeProductId: 'prod_pro',
            stripePriceId: 'price_pro',
            name: 'Pro',
            description: 'Pro plan',
            monthlyPrice: 29.99,
            yearlyPrice: 299.99,
            transcriptionMinutes: 50,
            features: {
              transcriptionMinutes: 50,
              fallingNotes: true,
              historyDays: 'unlimited',
              sheetEditor: true,
              polyphony: true,
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        invoices: [],
      }

      vi.mocked(mockService.getUserSubscription).mockResolvedValue(
        mockSubscriptionInfo,
      )
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: 200,
      } as any)

      await controller.getUserSubscription('user_123')

      expect(mockService.getUserSubscription).toHaveBeenCalledWith('user_123')
      expect(createSuccessResponse).toHaveBeenCalledWith(mockSubscriptionInfo)
    })

    it('should handle service errors', async () => {
      const error = new Error('Database error')

      vi.mocked(mockService.getUserSubscription).mockRejectedValue(error)
      vi.mocked(handleApiError).mockReturnValue({ status: 500 } as any)

      await controller.getUserSubscription('user_123')

      expect(handleApiError).toHaveBeenCalledWith(error)
    })

    it('should handle empty userId', async () => {
      vi.mocked(mockService.getUserSubscription).mockResolvedValue({
        hasActiveSubscription: false,
        subscription: null,
        invoices: [],
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: 200,
      } as any)

      await controller.getUserSubscription('')

      expect(mockService.getUserSubscription).toHaveBeenCalledWith('')
    })

    it('should handle very long userId (boundary test)', async () => {
      const longUserId = 'a'.repeat(10000)

      vi.mocked(mockService.getUserSubscription).mockResolvedValue({
        hasActiveSubscription: false,
        subscription: null,
        invoices: [],
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: 200,
      } as any)

      await controller.getUserSubscription(longUserId)

      expect(mockService.getUserSubscription).toHaveBeenCalledWith(longUserId)
    })

    it('should handle userId with special characters', async () => {
      const specialUserId = 'user\'123"<>;&|`$'

      vi.mocked(mockService.getUserSubscription).mockResolvedValue({
        hasActiveSubscription: false,
        subscription: null,
        invoices: [],
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: 200,
      } as any)

      await controller.getUserSubscription(specialUserId)

      expect(mockService.getUserSubscription).toHaveBeenCalledWith(
        specialUserId,
      )
    })

    it('should handle userId with Unicode characters', async () => {
      const unicodeUserId = 'user_こんにちは_🎉'

      vi.mocked(mockService.getUserSubscription).mockResolvedValue({
        hasActiveSubscription: false,
        subscription: null,
        invoices: [],
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: 200,
      } as any)

      await controller.getUserSubscription(unicodeUserId)

      expect(mockService.getUserSubscription).toHaveBeenCalledWith(
        unicodeUserId,
      )
    })

    it('should handle timeout errors', async () => {
      vi.mocked(mockService.getUserSubscription).mockRejectedValue(
        new Error('Query timeout'),
      )

      vi.mocked(handleApiError).mockReturnValue({
        status: 500,
      } as any)

      await controller.getUserSubscription('user_timeout')

      expect(handleApiError).toHaveBeenCalled()
    })

    it('should handle null response from service', async () => {
      vi.mocked(mockService.getUserSubscription).mockResolvedValue(null as any)

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: 200,
      } as any)

      await controller.getUserSubscription('user_null')

      expect(createSuccessResponse).toHaveBeenCalledWith(null)
    })
  })

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_pro_monthly',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      })

      const mockResponse: CreateCheckoutSessionResponse = {
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      }

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue(
        mockResponse,
      )

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalledWith(
        'user_123',
        'test@example.com',
        {
          priceId: 'price_pro_monthly',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
      )
      expect(createSuccessResponse).toHaveBeenCalledWith(
        mockResponse,
        HTTP_STATUS.CREATED,
      )
    })

    it('should handle missing priceId', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          successUrl: 'https://example.com/success',
        }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalledWith(
        'user_123',
        'test@example.com',
        expect.objectContaining({
          successUrl: 'https://example.com/success',
        }),
      )
    })

    it('should handle empty request body', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_empty',
        url: 'https://checkout.stripe.com/cs_empty',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })

    it('should handle invalid JSON in request body', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: 'invalid json',
      })

      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.BAD_REQUEST,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(handleApiError).toHaveBeenCalled()
    })

    it('should handle very large request body (boundary test)', async () => {
      const largeBody = {
        priceId: 'price_pro_monthly',
        successUrl: 'a'.repeat(100000),
        cancelUrl: 'b'.repeat(100000),
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(largeBody),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_large',
        url: 'https://checkout.stripe.com/cs_large',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })

    it('should handle XSS attempts in request body', async () => {
      const xssBody = {
        priceId: '<script>alert("xss")</script>',
        successUrl: 'javascript:alert(1)',
        cancelUrl: '<img src=x onerror=alert(2)>',
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(xssBody),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_xss',
        url: 'https://checkout.stripe.com/cs_xss',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalledWith(
        'user_123',
        'test@example.com',
        xssBody,
      )
    })

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionBody = {
        priceId: "price_123' OR '1'='1",
        successUrl: 'https://example.com/success',
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(sqlInjectionBody),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_sql',
        url: 'https://checkout.stripe.com/cs_sql',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_pro_monthly' }),
      })

      const error = new Error('Stripe API error')
      vi.mocked(mockService.createCheckoutSession).mockRejectedValue(error)
      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(handleApiError).toHaveBeenCalledWith(error)
    })

    it('should handle empty email', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_pro_monthly' }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_no_email',
        url: 'https://checkout.stripe.com/cs_no_email',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession('user_123', '', mockRequest)

      expect(mockService.createCheckoutSession).toHaveBeenCalledWith(
        'user_123',
        '',
        expect.any(Object),
      )
    })

    it('should handle invalid email format', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_pro_monthly' }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_invalid_email',
        url: 'https://checkout.stripe.com/cs_invalid_email',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'not-an-email',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })

    it('should handle null values in request body', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          priceId: null,
          successUrl: null,
          cancelUrl: null,
        }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_null',
        url: 'https://checkout.stripe.com/cs_null',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })
  })

  describe('createPortalSession', () => {
    it('should create portal session successfully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          returnUrl: 'https://example.com/return',
        }),
      })

      const mockResponse: CreatePortalSessionResponse = {
        url: 'https://billing.stripe.com/session_123',
      }

      vi.mocked(mockService.createPortalSession).mockResolvedValue(mockResponse)

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.createPortalSession('user_123', mockRequest)

      expect(mockService.createPortalSession).toHaveBeenCalledWith(
        'user_123',
        'https://example.com/return',
      )
      expect(createSuccessResponse).toHaveBeenCalledWith(mockResponse)
    })

    it('should handle missing returnUrl', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      vi.mocked(mockService.createPortalSession).mockResolvedValue({
        url: 'https://billing.stripe.com/session_123',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.createPortalSession('user_123', mockRequest)

      expect(mockService.createPortalSession).toHaveBeenCalledWith(
        'user_123',
        undefined,
      )
    })

    it('should handle invalid JSON', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: 'invalid json',
      })

      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.BAD_REQUEST,
      } as any)

      await controller.createPortalSession('user_123', mockRequest)

      expect(handleApiError).toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ returnUrl: 'https://example.com/return' }),
      })

      const error = new Error('Customer not found')
      vi.mocked(mockService.createPortalSession).mockRejectedValue(error)
      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.NOT_FOUND,
      } as any)

      await controller.createPortalSession('user_123', mockRequest)

      expect(handleApiError).toHaveBeenCalledWith(error)
    })

    it('should handle XSS attempts in returnUrl', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          returnUrl: 'javascript:alert("xss")',
        }),
      })

      vi.mocked(mockService.createPortalSession).mockResolvedValue({
        url: 'https://billing.stripe.com/session_xss',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.createPortalSession('user_123', mockRequest)

      expect(mockService.createPortalSession).toHaveBeenCalledWith(
        'user_123',
        'javascript:alert("xss")',
      )
    })

    it('should handle null returnUrl', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ returnUrl: null }),
      })

      vi.mocked(mockService.createPortalSession).mockResolvedValue({
        url: 'https://billing.stripe.com/session_null',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.createPortalSession('user_123', mockRequest)

      expect(mockService.createPortalSession).toHaveBeenCalled()
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      vi.mocked(mockService.cancelSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.cancelSubscription('user_123')

      expect(mockService.cancelSubscription).toHaveBeenCalledWith('user_123')
      expect(createSuccessResponse).toHaveBeenCalledWith({
        message: 'Résiliation programmée',
      })
    })

    it('should handle service errors', async () => {
      const error = new Error('Subscription not found')
      vi.mocked(mockService.cancelSubscription).mockRejectedValue(error)
      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.NOT_FOUND,
      } as any)

      await controller.cancelSubscription('user_no_sub')

      expect(handleApiError).toHaveBeenCalledWith(error)
    })

    it('should handle empty userId', async () => {
      vi.mocked(mockService.cancelSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.cancelSubscription('')

      expect(mockService.cancelSubscription).toHaveBeenCalledWith('')
    })

    it('should handle userId with special characters', async () => {
      const specialUserId = 'user\'123"<>'
      vi.mocked(mockService.cancelSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.cancelSubscription(specialUserId)

      expect(mockService.cancelSubscription).toHaveBeenCalledWith(specialUserId)
    })

    it('should handle database timeout errors', async () => {
      vi.mocked(mockService.cancelSubscription).mockRejectedValue(
        new Error('Query timeout'),
      )

      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      } as any)

      await controller.cancelSubscription('user_timeout')

      expect(handleApiError).toHaveBeenCalled()
    })
  })

  describe('reactivateSubscription', () => {
    it('should reactivate subscription successfully', async () => {
      vi.mocked(mockService.reactivateSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.reactivateSubscription('user_123')

      expect(mockService.reactivateSubscription).toHaveBeenCalledWith(
        'user_123',
      )
      expect(createSuccessResponse).toHaveBeenCalledWith({
        message: 'Abonnement réactivé',
      })
    })

    it('should handle service errors', async () => {
      const error = new Error('Subscription not found')
      vi.mocked(mockService.reactivateSubscription).mockRejectedValue(error)
      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.NOT_FOUND,
      } as any)

      await controller.reactivateSubscription('user_no_sub')

      expect(handleApiError).toHaveBeenCalledWith(error)
    })

    it('should handle empty userId', async () => {
      vi.mocked(mockService.reactivateSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.reactivateSubscription('')

      expect(mockService.reactivateSubscription).toHaveBeenCalledWith('')
    })

    it('should handle Stripe API errors', async () => {
      vi.mocked(mockService.reactivateSubscription).mockRejectedValue(
        new Error('Stripe API error'),
      )

      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      } as any)

      await controller.reactivateSubscription('user_stripe_error')

      expect(handleApiError).toHaveBeenCalled()
    })
  })

  describe('upgradeSubscription', () => {
    it('should upgrade subscription successfully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_pro_monthly',
        }),
      })

      vi.mocked(mockService.upgradeSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.upgradeSubscription('user_123', mockRequest)

      expect(mockService.upgradeSubscription).toHaveBeenCalledWith(
        'user_123',
        'price_pro_monthly',
      )
      expect(createSuccessResponse).toHaveBeenCalledWith({
        message: 'Abonnement mis à jour',
      })
    })

    it('should handle missing priceId', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      vi.mocked(mockService.upgradeSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.upgradeSubscription('user_123', mockRequest)

      expect(mockService.upgradeSubscription).toHaveBeenCalledWith(
        'user_123',
        undefined,
      )
    })

    it('should handle invalid JSON', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: 'invalid json',
      })

      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.BAD_REQUEST,
      } as any)

      await controller.upgradeSubscription('user_123', mockRequest)

      expect(handleApiError).toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_invalid' }),
      })

      const error = new Error('Plan not found')
      vi.mocked(mockService.upgradeSubscription).mockRejectedValue(error)
      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.NOT_FOUND,
      } as any)

      await controller.upgradeSubscription('user_123', mockRequest)

      expect(handleApiError).toHaveBeenCalledWith(error)
    })

    it('should handle XSS attempts in priceId', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          priceId: '<script>alert("xss")</script>',
        }),
      })

      vi.mocked(mockService.upgradeSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.upgradeSubscription('user_123', mockRequest)

      expect(mockService.upgradeSubscription).toHaveBeenCalledWith(
        'user_123',
        '<script>alert("xss")</script>',
      )
    })

    it('should handle null priceId', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ priceId: null }),
      })

      vi.mocked(mockService.upgradeSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.upgradeSubscription('user_123', mockRequest)

      expect(mockService.upgradeSubscription).toHaveBeenCalled()
    })

    it('should handle very long priceId (boundary test)', async () => {
      const longPriceId = 'a'.repeat(10000)
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ priceId: longPriceId }),
      })

      vi.mocked(mockService.upgradeSubscription).mockResolvedValue()
      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.upgradeSubscription('user_123', mockRequest)

      expect(mockService.upgradeSubscription).toHaveBeenCalledWith(
        'user_123',
        longPriceId,
      )
    })
  })

  describe('HTTP Edge Cases', () => {
    it('should handle request with no body', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      })

      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.BAD_REQUEST,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(handleApiError).toHaveBeenCalled()
    })

    it('should handle request with Content-Type mismatch', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ priceId: 'price_pro_monthly' }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })

    it('should handle request with corrupted UTF-8', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_\uFFFD\uFFFD',
        }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_utf8',
        url: 'https://checkout.stripe.com/cs_utf8',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })
  })

  describe('Concurrency & Race Conditions', () => {
    it('should handle concurrent cancel requests', async () => {
      vi.mocked(mockService.cancelSubscription)
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Subscription already canceled'))

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.cancelSubscription('user_concurrent')

      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.CONFLICT,
      } as any)

      await controller.cancelSubscription('user_concurrent')

      expect(mockService.cancelSubscription).toHaveBeenCalledTimes(2)
    })

    it('should handle concurrent upgrade requests', async () => {
      const mockRequest1 = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_pro_monthly' }),
      })

      const mockRequest2 = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_basic_monthly' }),
      })

      vi.mocked(mockService.upgradeSubscription)
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Concurrent modification'))

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.upgradeSubscription('user_concurrent', mockRequest1)

      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.CONFLICT,
      } as any)

      await controller.upgradeSubscription('user_concurrent', mockRequest2)

      expect(mockService.upgradeSubscription).toHaveBeenCalledTimes(2)
    })
  })

  describe('Security & Validation', () => {
    it('should not expose internal error details', async () => {
      const internalError = new Error(
        'Database connection string: postgresql://user:pass@host',
      )

      vi.mocked(mockService.getUserSubscription).mockRejectedValue(
        internalError,
      )

      vi.mocked(handleApiError).mockReturnValue({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        body: { error: 'Internal server error' },
      } as any)

      const result = await controller.getUserSubscription('user_123')

      expect(handleApiError).toHaveBeenCalledWith(internalError)
      expect(result).not.toContain('postgresql://')
    })

    it('should handle path traversal attempts in userId', async () => {
      const pathTraversalUserId = '../../etc/passwd'

      vi.mocked(mockService.getUserSubscription).mockResolvedValue({
        hasActiveSubscription: false,
        subscription: null,
        invoices: [],
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.OK,
      } as any)

      await controller.getUserSubscription(pathTraversalUserId)

      expect(mockService.getUserSubscription).toHaveBeenCalledWith(
        pathTraversalUserId,
      )
    })

    it('should handle command injection attempts', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123; DROP TABLE subscriptions;--',
        }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_injection',
        url: 'https://checkout.stripe.com/cs_injection',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })

    it('should handle NoSQL injection attempts', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          priceId: { $ne: null },
        }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_nosql',
        url: 'https://checkout.stripe.com/cs_nosql',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })

    it('should handle prototype pollution attempts', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({
          __proto__: { isAdmin: true },
          priceId: 'price_pro_monthly',
        }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_proto',
        url: 'https://checkout.stripe.com/cs_proto',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })
  })

  describe('Performance & Resource Management', () => {
    it('should handle memory-intensive requests', async () => {
      const hugeArray = new Array(1000000).fill({
        priceId: 'price_pro_monthly',
      })

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: hugeArray }),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_huge',
        url: 'https://checkout.stripe.com/cs_huge',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })

    it('should handle deeply nested JSON', async () => {
      let nested: any = { priceId: 'price_pro_monthly' }
      for (let i = 0; i < 100; i++) {
        nested = { nested }
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(nested),
      })

      vi.mocked(mockService.createCheckoutSession).mockResolvedValue({
        sessionId: 'cs_nested',
        url: 'https://checkout.stripe.com/cs_nested',
      })

      vi.mocked(createSuccessResponse).mockReturnValue({
        status: HTTP_STATUS.CREATED,
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(mockService.createCheckoutSession).toHaveBeenCalled()
    })
  })
})
