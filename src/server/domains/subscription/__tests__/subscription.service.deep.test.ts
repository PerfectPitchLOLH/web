// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { stripe } from '@/server/lib/stripe'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { CreditService } from '../../credit/credit.service'
import type { CreditPurchaseRepository } from '../../credit-purchase/credit-purchase.repository'
import { SUBSCRIPTION_STATUS } from '../subscription.constants'
import type { SubscriptionRepository } from '../subscription.repository'
import { SubscriptionService } from '../subscription.service'
import type {
  CreateCheckoutSessionRequest,
  CustomerEntity,
  InvoiceEntity,
  SubscriptionEntity,
  SubscriptionPlanEntity,
  SubscriptionWithPlan,
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

describe('SubscriptionService - Deep Tests', () => {
  let service: SubscriptionService
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

    vi.clearAllMocks()
  })

  describe('getUserSubscription', () => {
    it('should return user subscription info with invoices', async () => {
      const mockSubscription: SubscriptionWithPlan = {
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
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
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
      }

      const mockInvoices: InvoiceEntity[] = [
        {
          id: 'inv_1',
          userId: 'user_123',
          stripeInvoiceId: 'in_stripe_1',
          amount: 29.99,
          currency: 'eur',
          status: 'paid',
          hostedInvoiceUrl: 'https://invoice.stripe.com',
          invoicePdf: 'https://invoice.stripe.com/pdf',
          description: 'Subscription',
          createdAt: new Date('2025-01-01'),
          paidAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ]

      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(
        mockSubscription,
      )
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue(
        mockInvoices,
      )
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const result = await service.getUserSubscription('user_123')

      expect(result.hasActiveSubscription).toBe(true)
      expect(result.subscription).toEqual(mockSubscription)
      expect(result.invoices).toHaveLength(1)
      expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
        'user_123',
      )
      expect(mockRepository.findInvoicesByUserId).toHaveBeenCalledWith(
        'user_123',
      )
    })

    it('should return no subscription when user has none', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const result = await service.getUserSubscription('user_no_sub')

      expect(result.hasActiveSubscription).toBe(false)
      expect(result.subscription).toBeNull()
      expect(result.invoices).toEqual([])
    })

    it('should merge credit purchase invoices with subscription invoices', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([
        {
          id: 'purchase_1',
          userId: 'user_123',
          stripePaymentIntentId: 'pi_123',
          amount: 1999,
          currency: 'eur',
          bundleName: 'Bundle Small',
          minutes: 10,
          creditsGrantedAt: new Date('2025-01-15'),
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-15'),
        } as any,
      ])

      const result = await service.getUserSubscription('user_123')

      expect(result.invoices).toHaveLength(1)
      expect(result.invoices[0].description).toContain('Bundle Small')
      expect(result.invoices[0].amount).toBe(19.99)
    })

    it('should sort invoices by creation date descending', async () => {
      const invoice1: InvoiceEntity = {
        id: 'inv_1',
        userId: 'user_123',
        stripeInvoiceId: 'in_1',
        amount: 29.99,
        currency: 'eur',
        status: 'paid',
        hostedInvoiceUrl: null,
        invoicePdf: null,
        description: null,
        createdAt: new Date('2025-01-01'),
        paidAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      }

      const invoice2: InvoiceEntity = {
        id: 'inv_2',
        userId: 'user_123',
        stripeInvoiceId: 'in_2',
        amount: 29.99,
        currency: 'eur',
        status: 'paid',
        hostedInvoiceUrl: null,
        invoicePdf: null,
        description: null,
        createdAt: new Date('2025-01-15'),
        paidAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15'),
      }

      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([
        invoice1,
        invoice2,
      ])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const result = await service.getUserSubscription('user_123')

      expect(result.invoices[0].id).toBe('inv_2')
      expect(result.invoices[1].id).toBe('inv_1')
    })

    it('should handle empty user ID', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const result = await service.getUserSubscription('')

      expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith('')
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockRejectedValue(
        new Error('Database connection lost'),
      )

      await expect(service.getUserSubscription('user_123')).rejects.toThrow(
        'Database connection lost',
      )
    })
  })

  describe('createCheckoutSession', () => {
    const validRequest: CreateCheckoutSessionRequest = {
      priceId: 'price_pro_monthly',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    }

    const mockPlan: SubscriptionPlanEntity = {
      id: 'plan_pro',
      stripeProductId: 'prod_pro',
      stripePriceId: 'price_pro_monthly',
      name: 'Pro',
      description: 'Pro plan',
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

    it('should create checkout session successfully', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
        email: 'test@example.com',
        name: null,
      } as any)

      const mockCustomer: CustomerEntity = {
        id: 'customer-5',
        userId: 'user_123',
        stripeCustomerId: 'cus_new',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.createOrUpdateCustomer).mockResolvedValue(
        mockCustomer,
      )

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      } as any)

      const result = await service.createCheckoutSession(
        'user_123',
        'test@example.com',
        validRequest,
      )

      expect(result.sessionId).toBe('cs_123')
      expect(result.url).toBe('https://checkout.stripe.com/cs_123')
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_new',
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: validRequest.priceId, quantity: 1 }],
        }),
      )
    })

    it('should throw error if plan not found', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(null)

      await expect(
        service.createCheckoutSession('user_123', 'test@example.com', {
          priceId: 'price_invalid',
        }),
      ).rejects.toThrow(ApiError)

      await expect(
        service.createCheckoutSession('user_123', 'test@example.com', {
          priceId: 'price_invalid',
        }),
      ).rejects.toThrow('Plan invalide')
    })

    it('should throw error if user already has active subscription', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )

      const existingSub: SubscriptionEntity = {
        id: 'sub_existing',
        userId: 'user_123',
        planId: 'plan_basic',
        stripeSubscriptionId: 'sub_stripe_existing',
        stripeCustomerId: 'cus_existing',
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
        existingSub,
      )

      await expect(
        service.createCheckoutSession(
          'user_123',
          'test@example.com',
          validRequest,
        ),
      ).rejects.toThrow('Vous avez déjà un abonnement actif')
    })

    it('should reuse existing customer if found', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)

      const existingCustomer: CustomerEntity = {
        userId: 'user_123',
        stripeCustomerId: 'cus_existing',
        email: 'test@example.com',
        name: 'Existing User',
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(
        existingCustomer,
      )

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      } as any)

      await service.createCheckoutSession(
        'user_123',
        'test@example.com',
        validRequest,
      )

      expect(stripe.customers.create).not.toHaveBeenCalled()
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
        }),
      )
    })

    it('should use default URLs if not provided', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        id: 'customer-mock',
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      } as any)

      await service.createCheckoutSession('user_123', 'test@example.com', {
        priceId: 'price_pro_monthly',
      })

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('/dashboard?success=true'),
          cancel_url: expect.stringContaining('/dashboard/subscription'),
        }),
      )
    })

    it('should throw error if checkout session has no URL', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        id: 'customer-mock',
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_123',
        url: null,
      } as any)

      await expect(
        service.createCheckoutSession(
          'user_123',
          'test@example.com',
          validRequest,
        ),
      ).rejects.toThrow('Impossible de créer la session de paiement')
    })

    it('should handle Stripe API errors', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      vi.mocked(stripe.customers.create).mockRejectedValue(
        new Error('Stripe API error'),
      )

      await expect(
        service.createCheckoutSession(
          'user_123',
          'test@example.com',
          validRequest,
        ),
      ).rejects.toThrow('Stripe API error')
    })

    it('should handle empty email', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
        email: '',
      } as any)

      vi.mocked(mockRepository.createOrUpdateCustomer).mockResolvedValue({
        id: 'customer-1',
        userId: 'user_123',
        stripeCustomerId: 'cus_new',
        email: '',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      } as any)

      await service.createCheckoutSession('user_123', '', validRequest)

      expect(stripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: '',
        }),
      )
    })

    it('should handle invalid email format', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
        email: 'not-an-email',
      } as any)

      vi.mocked(mockRepository.createOrUpdateCustomer).mockResolvedValue({
        id: 'customer-2',
        userId: 'user_123',
        stripeCustomerId: 'cus_new',
        email: 'not-an-email',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      } as any)

      await service.createCheckoutSession('user_123', 'not-an-email', {
        priceId: 'price_pro_monthly',
      })

      expect(stripe.customers.create).toHaveBeenCalled()
    })

    it('should handle XSS attempts in URLs', async () => {
      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        id: 'customer-mock',
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      } as any)

      const xssRequest: CreateCheckoutSessionRequest = {
        priceId: 'price_pro_monthly',
        successUrl: 'javascript:alert(1)',
        cancelUrl: '<script>alert(2)</script>',
      }

      await service.createCheckoutSession(
        'user_123',
        'test@example.com',
        xssRequest,
      )

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'javascript:alert(1)',
          cancel_url: '<script>alert(2)</script>',
        }),
      )
    })
  })

  describe('createPortalSession', () => {
    it('should create portal session successfully', async () => {
      const mockCustomer: CustomerEntity = {
        id: 'customer-6',
        userId: 'user_123',
        stripeCustomerId: 'cus_stripe_123',
        email: 'test@example.com',
        name: 'Test User',
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(
        mockCustomer,
      )

      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/session_123',
      } as any)

      const result = await service.createPortalSession(
        'user_123',
        'https://example.com/return',
      )

      expect(result.url).toBe('https://billing.stripe.com/session_123')
      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_stripe_123',
        return_url: 'https://example.com/return',
      })
    })

    it('should throw error if customer not found', async () => {
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      await expect(
        service.createPortalSession('user_no_customer', 'https://example.com'),
      ).rejects.toThrow('Client non trouvé')
    })

    it('should use default return URL if not provided', async () => {
      const mockCustomer: CustomerEntity = {
        id: 'customer-7',
        userId: 'user_123',
        stripeCustomerId: 'cus_stripe_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(
        mockCustomer,
      )

      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/session_123',
      } as any)

      await service.createPortalSession('user_123')

      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_stripe_123',
        return_url: expect.stringContaining('/dashboard/subscription'),
      })
    })

    it('should handle Stripe API errors', async () => {
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        id: 'customer-mock',
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(stripe.billingPortal.sessions.create).mockRejectedValue(
        new Error('Stripe API error'),
      )

      await expect(service.createPortalSession('user_123')).rejects.toThrow(
        'Stripe API error',
      )
    })
  })

  describe('handleSubscriptionCreated', () => {
    it('should create subscription and refill credits', async () => {
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

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_123',
        customer: 'cus_stripe_123',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_123',
              price: { id: 'price_pro_monthly' },
              current_period_start: Math.floor(
                new Date('2025-01-01').getTime() / 1000,
              ),
              current_period_end: Math.floor(
                new Date('2025-02-01').getTime() / 1000,
              ),
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

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(
        mockPlan,
      )

      const mockCreatedSubscription: SubscriptionEntity = {
        id: 'sub_new',
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
      }

      vi.mocked(mockRepository.createSubscription).mockResolvedValue(
        mockCreatedSubscription,
      )
      vi.mocked(mockCreditService.refillMonthlyCredits).mockResolvedValue()

      const result = await service.handleSubscriptionCreated('sub_stripe_123')

      expect(result).toEqual(mockCreatedSubscription)
      expect(mockCreditService.refillMonthlyCredits).toHaveBeenCalledWith(
        'user_123',
        50,
        'in_123',
      )
    })

    it('should throw error if plan not found', async () => {
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_123',
        items: {
          data: [{ price: { id: 'price_unknown' } } as any],
        },
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(null)

      await expect(
        service.handleSubscriptionCreated('sub_stripe_123'),
      ).rejects.toThrow('Plan non trouvé')
    })

    it('should find userId from customer if not in metadata', async () => {
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
        metadata: {},
        latest_invoice: 'in_123',
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
        stripePriceId: 'price_pro_monthly',
        transcriptionMinutes: 50,
      } as any)

      vi.mocked(mockRepository.findCustomerByStripeId).mockResolvedValue({
        userId: 'user_from_customer',
        stripeCustomerId: 'cus_stripe_123',
        email: 'test@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(mockRepository.createSubscription).mockResolvedValue({
        id: 'sub_new',
        userId: 'user_from_customer',
      } as any)

      await service.handleSubscriptionCreated('sub_stripe_123')

      expect(mockRepository.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_from_customer',
        }),
      )
    })

    it('should throw error if customer not found and no userId in metadata', async () => {
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_123',
        customer: 'cus_unknown',
        items: {
          data: [{ price: { id: 'price_pro_monthly' } } as any],
        },
        metadata: {},
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
      } as any)

      vi.mocked(mockRepository.findCustomerByStripeId).mockResolvedValue(null)

      await expect(
        service.handleSubscriptionCreated('sub_stripe_123'),
      ).rejects.toThrow('Client non trouvé')
    })

    it('should handle trial subscriptions', async () => {
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_trial',
        customer: 'cus_stripe_123',
        status: 'trialing',
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
        trial_start: Math.floor(Date.now() / 1000),
        trial_end: Math.floor(Date.now() / 1000) + 86400 * 7,
        metadata: { userId: 'user_123' },
        latest_invoice: 'in_123',
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
        transcriptionMinutes: 50,
      } as any)

      vi.mocked(mockRepository.createSubscription).mockResolvedValue({
        id: 'sub_trial',
        status: 'trialing',
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 86400 * 7 * 1000),
      } as any)

      await service.handleSubscriptionCreated('sub_stripe_trial')

      expect(mockRepository.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'trialing',
          trialStart: expect.any(Date),
          trialEnd: expect.any(Date),
        }),
      )
    })

    it('should handle Stripe API errors', async () => {
      vi.mocked(stripe.subscriptions.retrieve).mockRejectedValue(
        new Error('Stripe API error'),
      )

      await expect(
        service.handleSubscriptionCreated('sub_stripe_error'),
      ).rejects.toThrow('Stripe API error')
    })
  })

  describe('handleSubscriptionUpdated', () => {
    it('should update subscription successfully', async () => {
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_123',
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
      } as any)

      vi.mocked(mockRepository.findSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_123',
        planId: 'plan_basic',
      } as any)

      vi.mocked(mockRepository.findPlanById).mockResolvedValue({
        stripePriceId: 'price_basic_monthly',
      } as any)

      vi.mocked(mockRepository.updateSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
      } as any)

      const result = await service.handleSubscriptionUpdated('sub_stripe_123')

      expect(result).toBeDefined()
      expect(mockRepository.updateSubscription).toHaveBeenCalled()
    })

    it('should handle plan change and update credits', async () => {
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
      } as any)

      vi.mocked(mockRepository.findSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_basic',
      } as any)

      vi.mocked(mockRepository.findPlanById).mockResolvedValue({
        id: 'plan_basic',
        stripePriceId: 'price_basic_monthly',
        transcriptionMinutes: 20,
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId)
        .mockResolvedValueOnce({
          id: 'plan_basic',
          stripePriceId: 'price_basic_monthly',
          transcriptionMinutes: 20,
        } as any)
        .mockResolvedValueOnce({
          id: 'plan_pro',
          stripePriceId: 'price_pro_monthly',
          transcriptionMinutes: 50,
        } as any)

      vi.mocked(mockCreditService.handlePlanChange).mockResolvedValue()
      vi.mocked(mockRepository.updateSubscription).mockResolvedValue({
        id: 'sub_123',
        planId: 'plan_pro',
      } as any)

      await service.handleSubscriptionUpdated('sub_stripe_123')

      expect(mockCreditService.handlePlanChange).toHaveBeenCalledWith(
        'user_123',
        20,
        50,
        'cus_stripe_123',
      )
      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        'sub_stripe_123',
        expect.objectContaining({
          planId: 'plan_pro',
        }),
      )
    })

    it('should handle subscription status change to canceled', async () => {
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_123',
        status: 'canceled',
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
        canceled_at: Math.floor(Date.now() / 1000),
      } as any)

      vi.mocked(mockRepository.findSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_123',
        planId: 'plan_pro',
      } as any)

      vi.mocked(mockRepository.findPlanById).mockResolvedValue({
        stripePriceId: 'price_pro_monthly',
      } as any)

      vi.mocked(mockRepository.updateSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
      } as any)

      const result = await service.handleSubscriptionUpdated('sub_stripe_123')

      expect(result?.status).toBe('canceled')
      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        'sub_stripe_123',
        expect.objectContaining({
          status: 'canceled',
          canceledAt: expect.any(Date),
        }),
      )
    })

    it('should not update plan if price ID unchanged', async () => {
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_123',
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
      } as any)

      vi.mocked(mockRepository.findSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_123',
        planId: 'plan_pro',
      } as any)

      vi.mocked(mockRepository.findPlanById).mockResolvedValue({
        stripePriceId: 'price_pro_monthly',
      } as any)

      vi.mocked(mockRepository.updateSubscription).mockResolvedValue({
        id: 'sub_123',
      } as any)

      await service.handleSubscriptionUpdated('sub_stripe_123')

      expect(mockCreditService.handlePlanChange).not.toHaveBeenCalled()
    })
  })

  describe('handleSubscriptionDeleted', () => {
    it('should mark subscription as canceled and reset credits', async () => {
      vi.mocked(mockRepository.updateSubscriptionStatus).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        status: 'canceled',
      } as any)

      vi.mocked(
        mockRepository.findActiveSubscriptionsByUserId,
      ).mockResolvedValue([])

      vi.mocked(mockCreditService.grantSubscriptionCredits).mockResolvedValue()

      const result = await service.handleSubscriptionDeleted('sub_stripe_123')

      expect(result).toBeDefined()
      expect(mockRepository.updateSubscriptionStatus).toHaveBeenCalledWith(
        'sub_stripe_123',
        SUBSCRIPTION_STATUS.CANCELED,
        { canceledAt: expect.any(Date) },
      )
      expect(mockCreditService.grantSubscriptionCredits).toHaveBeenCalledWith(
        'user_123',
        0,
      )
    })

    it('should not reset credits if user has other active subscriptions', async () => {
      vi.mocked(mockRepository.updateSubscriptionStatus).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        status: 'canceled',
      } as any)

      vi.mocked(
        mockRepository.findActiveSubscriptionsByUserId,
      ).mockResolvedValue([
        {
          id: 'sub_other',
          userId: 'user_123',
          status: 'active',
        } as any,
      ])

      await service.handleSubscriptionDeleted('sub_stripe_123')

      expect(mockCreditService.grantSubscriptionCredits).not.toHaveBeenCalled()
    })

    it('should handle when subscription not found', async () => {
      vi.mocked(mockRepository.updateSubscriptionStatus).mockResolvedValue(null)

      const result = await service.handleSubscriptionDeleted('sub_nonexistent')

      expect(result).toBeNull()
      expect(mockCreditService.grantSubscriptionCredits).not.toHaveBeenCalled()
    })
  })

  describe('handleInvoicePaymentSucceeded', () => {
    it('should create or update invoice and refill credits for renewal', async () => {
      vi.mocked(stripe.invoices.retrieve).mockResolvedValue({
        id: 'in_stripe_123',
        customer: 'cus_stripe_123',
        amount_paid: 2999,
        currency: 'eur',
        status: 'paid',
        hosted_invoice_url: 'https://invoice.stripe.com',
        invoice_pdf: 'https://invoice.stripe.com/pdf',
        description: 'Subscription renewal',
        billing_reason: 'subscription_cycle',
        subscription: 'sub_stripe_123',
        lines: { data: [] },
      } as any)

      vi.mocked(mockRepository.findCustomerByStripeId).mockResolvedValue({
        userId: 'user_123',
      } as any)

      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])

      vi.mocked(mockRepository.createInvoice).mockResolvedValue({
        id: 'inv_new',
      } as any)

      vi.mocked(mockRepository.findSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_pro',
      } as any)

      vi.mocked(mockRepository.findPlanById).mockResolvedValue({
        transcriptionMinutes: 50,
      } as any)

      vi.mocked(mockCreditService.refillMonthlyCredits).mockResolvedValue()

      await service.handleInvoicePaymentSucceeded('in_stripe_123')

      expect(mockRepository.createInvoice).toHaveBeenCalled()
      expect(mockCreditService.refillMonthlyCredits).toHaveBeenCalledWith(
        'user_123',
        50,
        'in_stripe_123',
      )
    })

    it('should not refill credits for first invoice (subscription_create)', async () => {
      vi.mocked(stripe.invoices.retrieve).mockResolvedValue({
        id: 'in_stripe_first',
        customer: 'cus_stripe_123',
        amount_paid: 2999,
        currency: 'eur',
        status: 'paid',
        hosted_invoice_url: null,
        invoice_pdf: null,
        description: null,
        billing_reason: 'subscription_create',
        subscription: 'sub_stripe_123',
        lines: { data: [] },
      } as any)

      vi.mocked(mockRepository.findCustomerByStripeId).mockResolvedValue({
        userId: 'user_123',
      } as any)

      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(mockRepository.createInvoice).mockResolvedValue({
        id: 'inv_first',
      } as any)

      vi.mocked(mockRepository.findSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_pro',
      } as any)

      await service.handleInvoicePaymentSucceeded('in_stripe_first')

      expect(mockCreditService.refillMonthlyCredits).not.toHaveBeenCalled()
    })

    it('should update existing invoice instead of creating duplicate', async () => {
      vi.mocked(stripe.invoices.retrieve).mockResolvedValue({
        id: 'in_stripe_existing',
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

      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([
        {
          id: 'inv_existing',
          stripeInvoiceId: 'in_stripe_existing',
          status: 'open',
        } as any,
      ])

      vi.mocked(mockRepository.updateInvoice).mockResolvedValue({
        id: 'inv_existing',
        status: 'paid',
      } as any)

      vi.mocked(mockRepository.findSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_pro',
      } as any)

      vi.mocked(mockRepository.findPlanById).mockResolvedValue({
        transcriptionMinutes: 50,
      } as any)

      await service.handleInvoicePaymentSucceeded('in_stripe_existing')

      expect(mockRepository.updateInvoice).toHaveBeenCalledWith(
        'in_stripe_existing',
        expect.objectContaining({
          status: 'paid',
          paidAt: expect.any(Date),
        }),
      )
      expect(mockRepository.createInvoice).not.toHaveBeenCalled()
    })

    it('should handle credit bundle purchase', async () => {
      vi.mocked(stripe.invoices.retrieve).mockResolvedValue({
        id: 'in_stripe_bundle',
        customer: 'cus_stripe_123',
        amount_paid: 1999,
        currency: 'eur',
        status: 'paid',
        hosted_invoice_url: null,
        invoice_pdf: null,
        description: null,
        billing_reason: 'manual',
        subscription: null,
        lines: {
          data: [
            {
              description: 'Achat de crédits',
              price: {
                metadata: {
                  bundleId: 'small',
                },
              },
            } as any,
          ],
        },
      } as any)

      vi.mocked(mockRepository.findCustomerByStripeId).mockResolvedValue({
        userId: 'user_123',
      } as any)

      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(mockRepository.createInvoice).mockResolvedValue({
        id: 'inv_bundle',
      } as any)

      vi.mocked(mockCreditService.purchaseBundle).mockResolvedValue()

      await service.handleInvoicePaymentSucceeded('in_stripe_bundle')

      expect(mockCreditService.purchaseBundle).toHaveBeenCalledWith(
        'user_123',
        'small',
        'in_stripe_bundle',
      )
    })

    it('should throw error if customer not found', async () => {
      vi.mocked(stripe.invoices.retrieve).mockResolvedValue({
        id: 'in_stripe_123',
        customer: 'cus_unknown',
      } as any)

      vi.mocked(mockRepository.findCustomerByStripeId).mockResolvedValue(null)

      await expect(
        service.handleInvoicePaymentSucceeded('in_stripe_123'),
      ).rejects.toThrow('Client non trouvé')
    })

    it('should handle duplicate invoice creation gracefully (P2002 error)', async () => {
      vi.mocked(stripe.invoices.retrieve).mockResolvedValue({
        id: 'in_stripe_race',
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

      vi.mocked(mockRepository.createInvoice).mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint violation',
      })

      vi.mocked(mockRepository.findSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_pro',
      } as any)

      vi.mocked(mockRepository.findPlanById).mockResolvedValue({
        transcriptionMinutes: 50,
      } as any)

      await service.handleInvoicePaymentSucceeded('in_stripe_race')

      expect(mockCreditService.refillMonthlyCredits).toHaveBeenCalled()
    })
  })

  describe('handleInvoicePaymentFailed', () => {
    it('should create failed invoice record', async () => {
      vi.mocked(stripe.invoices.retrieve).mockResolvedValue({
        id: 'in_stripe_failed',
        customer: 'cus_stripe_123',
        amount_due: 2999,
        currency: 'eur',
        status: 'open',
        hosted_invoice_url: 'https://invoice.stripe.com',
        invoice_pdf: null,
        description: 'Failed payment',
      } as any)

      vi.mocked(mockRepository.findCustomerByStripeId).mockResolvedValue({
        userId: 'user_123',
      } as any)

      vi.mocked(mockRepository.createInvoice).mockResolvedValue({
        id: 'inv_failed',
        status: 'failed',
      } as any)

      await service.handleInvoicePaymentFailed('in_stripe_failed')

      expect(mockRepository.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          stripeInvoiceId: 'in_stripe_failed',
          amount: 29.99,
          status: 'failed',
          paidAt: null,
        }),
      )
    })

    it('should not throw if customer not found', async () => {
      vi.mocked(stripe.invoices.retrieve).mockResolvedValue({
        id: 'in_stripe_failed',
        customer: 'cus_unknown',
        amount_due: 2999,
        currency: 'eur',
      } as any)

      vi.mocked(mockRepository.findCustomerByStripeId).mockResolvedValue(null)

      await expect(
        service.handleInvoicePaymentFailed('in_stripe_failed'),
      ).resolves.not.toThrow()

      expect(mockRepository.createInvoice).not.toHaveBeenCalled()
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'active',
      } as any)

      vi.mocked(stripe.subscriptions.update).mockResolvedValue({
        id: 'sub_stripe_123',
        cancel_at_period_end: true,
      } as any)

      vi.mocked(mockRepository.updateSubscription).mockResolvedValue({
        id: 'sub_123',
        cancelAtPeriodEnd: true,
      } as any)

      await service.cancelSubscription('user_123')

      expect(stripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_123',
        { cancel_at_period_end: true },
      )
      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        'sub_stripe_123',
        { cancelAtPeriodEnd: true },
      )
    })

    it('should throw error if no active subscription', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)

      await expect(service.cancelSubscription('user_no_sub')).rejects.toThrow(
        'Aucun abonnement actif',
      )
    })

    it('should throw error if subscription is not active', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
      } as any)

      await expect(service.cancelSubscription('user_123')).rejects.toThrow(
        'Aucun abonnement actif',
      )
    })
  })

  describe('reactivateSubscription', () => {
    it('should reactivate subscription marked for cancellation', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue({
        id: 'sub_123',
        stripeSubscriptionId: 'sub_stripe_123',
        cancelAtPeriodEnd: true,
      } as any)

      vi.mocked(stripe.subscriptions.update).mockResolvedValue({
        id: 'sub_stripe_123',
        cancel_at_period_end: false,
      } as any)

      vi.mocked(mockRepository.updateSubscription).mockResolvedValue({
        id: 'sub_123',
        cancelAtPeriodEnd: false,
      } as any)

      await service.reactivateSubscription('user_123')

      expect(stripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_123',
        { cancel_at_period_end: false },
      )
      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        'sub_stripe_123',
        { cancelAtPeriodEnd: false },
      )
    })

    it('should throw error if subscription not found', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)

      await expect(
        service.reactivateSubscription('user_no_sub'),
      ).rejects.toThrow('Aucun abonnement trouvé')
    })

    it('should throw error if subscription not marked for cancellation', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue({
        id: 'sub_123',
        cancelAtPeriodEnd: false,
      } as any)

      await expect(service.reactivateSubscription('user_123')).rejects.toThrow(
        "L'abonnement n'est pas en cours de résiliation",
      )
    })
  })

  describe('upgradeSubscription', () => {
    it('should upgrade subscription to new plan', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue({
        id: 'sub_123',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'active',
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
        stripePriceId: 'price_pro_monthly',
        name: 'Pro',
      } as any)

      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue({
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
      } as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/cs_test',
      } as any)

      const result = await service.upgradeSubscription(
        'user_123',
        'price_pro_monthly',
      )

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          mode: 'subscription',
        }),
      )
      expect(result).toEqual({
        sessionId: 'cs_test',
        url: 'https://checkout.stripe.com/cs_test',
      })
    })

    it('should throw error if no active subscription', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)

      await expect(
        service.upgradeSubscription('user_no_sub', 'price_pro_monthly'),
      ).rejects.toThrow('Aucun abonnement actif')
    })

    it('should throw error if new plan not found', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue(null)

      await expect(
        service.upgradeSubscription('user_123', 'price_invalid'),
      ).rejects.toThrow('Plan invalide')
    })

    it('should throw CUSTOMER_NOT_FOUND if customer does not exist', async () => {
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue({
        id: 'sub_123',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'active',
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
        name: 'Pro',
      } as any)

      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      await expect(
        service.upgradeSubscription('user_123', 'price_pro_monthly'),
      ).rejects.toThrow('Client introuvable')
    })
  })

  describe('grantWelcomeCredits', () => {
    it('should grant welcome credits to new user', async () => {
      vi.mocked(mockCreditService.getUserCreditsBalance).mockResolvedValue({
        totalMinutes: 0,
        usedMinutes: 0,
        remainingMinutes: 0,
      } as any)

      vi.mocked(mockRepository.createOrUpdateCustomer).mockResolvedValue({
        id: 'customer-3',
        userId: 'user_new',
        stripeCustomerId: 'temp_user_new',
        email: 'new@example.com',
        name: null,
        defaultPaymentMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await service.grantWelcomeCredits('user_new', 'new@example.com')

      expect(mockCreditService.getUserCreditsBalance).toHaveBeenCalledWith(
        'user_new',
      )
      expect(mockRepository.createOrUpdateCustomer).toHaveBeenCalledWith({
        userId: 'user_new',
        stripeCustomerId: 'temp_user_new',
        email: 'new@example.com',
        name: null,
        defaultPaymentMethod: null,
      })
    })
  })

  describe('Edge Cases & Security', () => {
    it('should handle SQL injection attempts in userId', async () => {
      const sqlInjectionUserId = "user_123' OR '1'='1"

      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      await service.getUserSubscription(sqlInjectionUserId)

      expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
        sqlInjectionUserId,
      )
    })

    it('should handle XSS attempts in email', async () => {
      const xssEmail = '<script>alert("xss")</script>@example.com'

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
      } as any)
      vi.mocked(mockRepository.findSubscriptionByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.findCustomerByUserId).mockResolvedValue(null)

      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_xss',
        email: xssEmail,
      } as any)

      vi.mocked(mockRepository.createOrUpdateCustomer).mockResolvedValue({
        id: 'customer-4',
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
    })

    it('should handle very long userId (boundary test)', async () => {
      const longUserId = 'a'.repeat(10000)

      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      await service.getUserSubscription(longUserId)

      expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
        longUserId,
      )
    })

    it('should handle Unicode characters in userId', async () => {
      const unicodeUserId = 'user_こんにちは_🎉'

      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      await service.getUserSubscription(unicodeUserId)

      expect(mockRepository.findSubscriptionWithPlan).toHaveBeenCalledWith(
        unicodeUserId,
      )
    })

    it('should handle null values gracefully', async () => {
      vi.mocked(mockRepository.findSubscriptionWithPlan).mockResolvedValue(null)
      vi.mocked(mockRepository.findInvoicesByUserId).mockResolvedValue([])
      vi.mocked(
        mockCreditPurchaseRepository.findSucceededByUserId,
      ).mockResolvedValue([])

      const result = await service.getUserSubscription('user_null_test')

      expect(result.subscription).toBeNull()
      expect(result.hasActiveSubscription).toBe(false)
    })
  })

  describe('Stripe Webhook Race Conditions', () => {
    it('should handle duplicate subscription created events', async () => {
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_race',
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
        metadata: { userId: 'user_race' },
        latest_invoice: 'in_123',
      } as any)

      vi.mocked(mockRepository.findPlanByStripePriceId).mockResolvedValue({
        id: 'plan_pro',
        transcriptionMinutes: 50,
      } as any)

      vi.mocked(mockRepository.createSubscription).mockRejectedValueOnce({
        code: 'P2002',
        message: 'Unique constraint violation',
      })

      await expect(
        service.handleSubscriptionCreated('sub_stripe_race'),
      ).rejects.toEqual({
        code: 'P2002',
        message: 'Unique constraint violation',
      })
    })
  })
})
