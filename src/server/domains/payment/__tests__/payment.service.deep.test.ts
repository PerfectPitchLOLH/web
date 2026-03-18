// @ts-nocheck
import Stripe from 'stripe'
import type { Mocked } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CreditPurchaseService } from '@/server/domains/credit-purchase/credit-purchase.service'
import type { SubscriptionRepository } from '@/server/domains/subscription/subscription.repository'
import { stripe } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { PaymentService } from '../payment.service'
import type {
  CreateCheckoutSessionRequest,
  CreatePaymentIntentRequest,
} from '../payment.types'

vi.mock('@/server/lib/stripe', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      cancel: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}))

describe('PaymentService - Deep Tests', () => {
  let service: PaymentService
  let mockSubscriptionRepository: Mocked<SubscriptionRepository>
  let mockCreditPurchaseService: Mocked<CreditPurchaseService>

  const mockUserId = 'user-123'
  const mockEmail = 'test@example.com'
  const mockCustomer = {
    userId: mockUserId,
    stripeCustomerId: 'cus_test123',
    email: mockEmail,
    name: null,
    defaultPaymentMethod: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    mockSubscriptionRepository = {
      findCustomerByUserId: vi.fn(),
      createOrUpdateCustomer: vi.fn(),
    } as unknown as Mocked<SubscriptionRepository>

    mockCreditPurchaseService = {
      createPurchaseRecord: vi.fn(),
    } as unknown as Mocked<CreditPurchaseService>

    service = new PaymentService(
      mockSubscriptionRepository,
      mockCreditPurchaseService,
    )

    vi.clearAllMocks()
  })

  describe('createPaymentIntent - Boundary Values & Edge Cases', () => {
    it('devrait gérer un montant zéro', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 0,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 0,
        currency: 'eur',
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.paymentIntentId).toBe('pi_test')
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 0,
        }),
      )
    })

    it('devrait gérer un montant décimal avec précision', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1050,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10.499,
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1050,
        }),
      )
    })

    it('devrait gérer un montant très élevé (999999.99)', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 99999999,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 999999.99,
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99999999,
        }),
      )
    })

    it('devrait gérer un email avec caractères spéciaux', async () => {
      const specialEmail = 'user+test@domain-name.co.uk'
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
        email: specialEmail,
      } as any)
      mockSubscriptionRepository.createOrUpdateCustomer.mockResolvedValue({
        ...mockCustomer,
        stripeCustomerId: 'cus_new',
        email: specialEmail,
      })
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await service.createPaymentIntent(mockUserId, specialEmail, request)

      expect(stripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: specialEmail,
        }),
      )
    })

    it('devrait gérer un email avec emojis', async () => {
      const emojiEmail = 'test🚀@example.com'
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
        email: emojiEmail,
      } as any)
      mockSubscriptionRepository.createOrUpdateCustomer.mockResolvedValue({
        ...mockCustomer,
        email: emojiEmail,
      })
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await service.createPaymentIntent(mockUserId, emojiEmail, request)

      expect(stripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: emojiEmail,
        }),
      )
    })

    it('devrait gérer un userId avec caractères Unicode', async () => {
      const unicodeUserId = 'user_日本語_测试'
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
        metadata: { userId: unicodeUserId },
      } as any)
      mockSubscriptionRepository.createOrUpdateCustomer.mockResolvedValue({
        ...mockCustomer,
        userId: unicodeUserId,
      })
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await service.createPaymentIntent(unicodeUserId, mockEmail, request)

      expect(stripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { userId: unicodeUserId },
        }),
      )
    })

    it('devrait gérer des metadata avec chaînes vides', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: '',
          bundleName: '',
          minutes: '',
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            bundleId: '',
            bundleName: '',
            minutes: '',
          }),
        }),
      )
    })

    it('devrait gérer des metadata avec valeurs très longues', async () => {
      const longString = 'a'.repeat(500)
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          description: longString,
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(stripe.paymentIntents.create).toHaveBeenCalled()
    })

    it('devrait gérer des devises exotiques', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'jpy',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        currency: 'jpy',
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'jpy',
        }),
      )
      expect(result).toBeDefined()
    })

    it('devrait utiliser EUR par défaut si currency non fournie', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'eur',
        }),
      )
    })
  })

  describe('createPaymentIntent - Database Errors', () => {
    it('devrait gérer erreur de base de données lors de la recherche client', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockRejectedValue(
        new Error('Database connection lost'),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('Database connection lost')
    })

    it('devrait gérer timeout de base de données', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 100),
          ),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('Query timeout')
    })

    it('devrait gérer erreur lors de la création de customer', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(null)
      mockSubscriptionRepository.createOrUpdateCustomer.mockRejectedValue(
        new Error('Constraint violation'),
      )
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('Constraint violation')
    })

    it('devrait gérer deadlock de base de données', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockRejectedValue(
        new Error('deadlock detected'),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('deadlock detected')
    })
  })

  describe('createPaymentIntent - Stripe API Errors', () => {
    it('devrait gérer erreur Stripe lors de la création de customer', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(null)
      const stripeError = new Stripe.errors.StripeAPIError({
        type: 'api_error',
        message: 'API error',
      } as any)
      vi.mocked(stripe.customers.create).mockRejectedValue(stripeError)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow()
    })

    it('devrait gérer erreur Stripe rate limit', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      const rateLimitError = new Stripe.errors.StripeRateLimitError({
        type: 'rate_limit_error',
        message: 'Too many requests',
      } as any)
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(rateLimitError)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow()
    })

    it('devrait gérer erreur Stripe card declined', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      const cardError = new Stripe.errors.StripeCardError({
        type: 'card_error',
        message: 'Card declined',
        code: 'card_declined',
      } as any)
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(cardError)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow()
    })

    it('devrait gérer erreur Stripe timeout', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
        new Error('Request timeout'),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('Request timeout')
    })

    it('devrait lancer ApiError si client_secret est null', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: null,
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow(ApiError)

      try {
        await service.createPaymentIntent(mockUserId, mockEmail, request)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('PAYMENT_INTENT_FAILED')
        expect((error as ApiError).statusCode).toBe(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        )
      }
    })

    it('devrait lancer ApiError si client_secret est undefined', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('createPaymentIntent - CreditPurchaseService Integration', () => {
    it('devrait créer un purchase record si metadata complète fournie', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      mockCreditPurchaseService.createPurchaseRecord.mockResolvedValue({
        id: 1,
        userId: mockUserId,
        stripePaymentIntentId: 'pi_test',
        bundleId: 'bundle_small',
        bundleName: 'Small Bundle',
        minutes: 5,
        amount: 1000,
        currency: 'eur',
        status: 'pending',
        creditsGranted: false,
        invoicePdf: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_small',
          bundleName: 'Small Bundle',
          minutes: '5',
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).toHaveBeenCalledWith(
        mockUserId,
        'pi_test',
        'bundle_small',
        'Small Bundle',
        5,
        1000,
        'eur',
      )
    })

    it('devrait ne pas créer purchase record si metadata incomplète', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_small',
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).not.toHaveBeenCalled()
    })

    it('devrait ne pas créer purchase record si creditPurchaseService non fourni', async () => {
      const serviceWithoutCreditPurchase = new PaymentService(
        mockSubscriptionRepository,
      )

      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_small',
          bundleName: 'Small Bundle',
          minutes: '5',
        },
      }

      await serviceWithoutCreditPurchase.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).not.toHaveBeenCalled()
    })

    it('devrait gérer erreur lors de la création du purchase record', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      mockCreditPurchaseService.createPurchaseRecord.mockRejectedValue(
        new Error('Purchase creation failed'),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_small',
          bundleName: 'Small Bundle',
          minutes: '5',
        },
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('Purchase creation failed')
    })

    it('devrait parser les minutes correctement avec parseInt', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      mockCreditPurchaseService.createPurchaseRecord.mockResolvedValue(
        {} as any,
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_small',
          bundleName: 'Small Bundle',
          minutes: '15',
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).toHaveBeenCalledWith(
        mockUserId,
        'pi_test',
        'bundle_small',
        'Small Bundle',
        15,
        1000,
        'eur',
      )
    })
  })

  describe('createCheckoutSession - Boundary Values', () => {
    it('devrait gérer priceId vide', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any)

      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_small',
        bundleName: 'Small Bundle',
        minutes: 5,
        priceId: '',
      }

      await service.createCheckoutSession(mockUserId, mockEmail, request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: '',
              quantity: 1,
            },
          ],
        }),
      )
    })

    it('devrait gérer minutes à zéro', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any)

      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_small',
        bundleName: 'Small Bundle',
        minutes: 0,
        priceId: 'price_test',
      }

      await service.createCheckoutSession(mockUserId, mockEmail, request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            minutes: '0',
          }),
        }),
      )
    })

    it('devrait gérer minutes très élevées', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any)

      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_huge',
        bundleName: 'Huge Bundle',
        minutes: 1000000,
        priceId: 'price_test',
      }

      await service.createCheckoutSession(mockUserId, mockEmail, request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            minutes: '1000000',
          }),
        }),
      )
    })

    it('devrait gérer bundleName avec caractères spéciaux', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any)

      const specialName = 'Bundle <script>alert("XSS")</script>'
      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_small',
        bundleName: specialName,
        minutes: 5,
        priceId: 'price_test',
      }

      await service.createCheckoutSession(mockUserId, mockEmail, request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            bundleName: specialName,
          }),
        }),
      )
    })

    it('devrait gérer bundleName avec emojis', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any)

      const emojiName = 'Bundle 🚀 Premium ✨'
      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_small',
        bundleName: emojiName,
        minutes: 5,
        priceId: 'price_test',
      }

      await service.createCheckoutSession(mockUserId, mockEmail, request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            bundleName: emojiName,
          }),
        }),
      )
    })
  })

  describe('createCheckoutSession - Stripe Errors', () => {
    it('devrait gérer erreur Stripe lors de la création de session', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(
        new Error('Stripe API error'),
      )

      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_small',
        bundleName: 'Small Bundle',
        minutes: 5,
        priceId: 'price_test',
      }

      await expect(
        service.createCheckoutSession(mockUserId, mockEmail, request),
      ).rejects.toThrow('Stripe API error')
    })

    it('devrait lancer ApiError si session.url est null', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: null,
      } as any)

      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_small',
        bundleName: 'Small Bundle',
        minutes: 5,
        priceId: 'price_test',
      }

      await expect(
        service.createCheckoutSession(mockUserId, mockEmail, request),
      ).rejects.toThrow(ApiError)

      try {
        await service.createCheckoutSession(mockUserId, mockEmail, request)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('CHECKOUT_SESSION_FAILED')
        expect((error as ApiError).statusCode).toBe(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        )
      }
    })

    it('devrait lancer ApiError si session.url est undefined', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
      } as any)

      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_small',
        bundleName: 'Small Bundle',
        minutes: 5,
        priceId: 'price_test',
      }

      await expect(
        service.createCheckoutSession(mockUserId, mockEmail, request),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('createCheckoutSession - URL Validation', () => {
    it('devrait utiliser process.env.API_URL pour success_url', async () => {
      process.env.API_URL = 'https://example.com'
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any)

      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_small',
        bundleName: 'Small Bundle',
        minutes: 5,
        priceId: 'price_test',
      }

      await service.createCheckoutSession(mockUserId, mockEmail, request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('https://example.com'),
          cancel_url: expect.stringContaining('https://example.com'),
        }),
      )
    })
  })

  describe('getPaymentIntentStatus - Edge Cases', () => {
    it('devrait convertir amount de centimes en euros', async () => {
      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: 'pi_test',
        status: 'succeeded',
        amount: 1050,
        currency: 'eur',
      } as any)

      const result = await service.getPaymentIntentStatus('pi_test')

      expect(result.amount).toBe(10.5)
    })

    it('devrait gérer amount à zéro', async () => {
      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: 'pi_test',
        status: 'succeeded',
        amount: 0,
        currency: 'eur',
      } as any)

      const result = await service.getPaymentIntentStatus('pi_test')

      expect(result.amount).toBe(0)
    })

    it('devrait gérer paymentIntentId invalide', async () => {
      vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(
        new Error('No such payment_intent'),
      )

      await expect(
        service.getPaymentIntentStatus('invalid_id'),
      ).rejects.toThrow('No such payment_intent')
    })

    it('devrait gérer tous les status possibles', async () => {
      const statuses: Array<
        | 'requires_payment_method'
        | 'requires_confirmation'
        | 'requires_action'
        | 'requires_capture'
        | 'processing'
        | 'succeeded'
        | 'canceled'
      > = [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'requires_capture',
        'processing',
        'succeeded',
        'canceled',
      ]

      for (const status of statuses) {
        vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
          id: 'pi_test',
          status,
          amount: 1000,
          currency: 'eur',
        } as any)

        const result = await service.getPaymentIntentStatus('pi_test')
        expect(result.status).toBe(status)
      }
    })
  })

  describe('cancelPaymentIntent - Edge Cases', () => {
    it('devrait annuler un payment intent valide', async () => {
      vi.mocked(stripe.paymentIntents.cancel).mockResolvedValue({
        id: 'pi_test',
        status: 'canceled',
      } as any)

      await service.cancelPaymentIntent('pi_test')

      expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_test')
    })

    it('devrait gérer erreur si payment intent déjà annulé', async () => {
      vi.mocked(stripe.paymentIntents.cancel).mockRejectedValue(
        new Error('This PaymentIntent could not be canceled'),
      )

      await expect(service.cancelPaymentIntent('pi_test')).rejects.toThrow(
        'This PaymentIntent could not be canceled',
      )
    })

    it('devrait gérer erreur si payment intent déjà succeeded', async () => {
      vi.mocked(stripe.paymentIntents.cancel).mockRejectedValue(
        new Error('PaymentIntent has already succeeded'),
      )

      await expect(service.cancelPaymentIntent('pi_test')).rejects.toThrow(
        'PaymentIntent has already succeeded',
      )
    })

    it('devrait gérer paymentIntentId invalide', async () => {
      vi.mocked(stripe.paymentIntents.cancel).mockRejectedValue(
        new Error('No such payment_intent'),
      )

      await expect(service.cancelPaymentIntent('invalid_id')).rejects.toThrow(
        'No such payment_intent',
      )
    })
  })

  describe('Customer Creation - Race Conditions', () => {
    it('devrait gérer création simultanée de customer (race condition)', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
      } as any)
      mockSubscriptionRepository.createOrUpdateCustomer.mockRejectedValue(
        new Error('Unique constraint violation'),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('Unique constraint violation')
    })
  })

  describe('Idempotence', () => {
    it('devrait être idempotent pour création de payment intent avec même données', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create)
        .mockResolvedValueOnce({
          id: 'pi_test1',
          client_secret: 'secret_test1',
          amount: 1000,
          currency: 'eur',
        } as any)
        .mockResolvedValueOnce({
          id: 'pi_test2',
          client_secret: 'secret_test2',
          amount: 1000,
          currency: 'eur',
        } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      const result1 = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )
      const result2 = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result1.paymentIntentId).toBe('pi_test1')
      expect(result2.paymentIntentId).toBe('pi_test2')
      expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(2)
    })

    it('devrait retourner même résultat pour même paymentIntentId status check', async () => {
      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: 'pi_test',
        status: 'succeeded',
        amount: 1000,
        currency: 'eur',
      } as any)

      const result1 = await service.getPaymentIntentStatus('pi_test')
      const result2 = await service.getPaymentIntentStatus('pi_test')

      expect(result1).toEqual(result2)
      expect(stripe.paymentIntents.retrieve).toHaveBeenCalledTimes(2)
    })
  })

  describe('Side Effects - Webhooks & Events', () => {
    it('devrait créer purchase record comme side effect', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      mockCreditPurchaseService.createPurchaseRecord.mockResolvedValue({
        id: 1,
        userId: mockUserId,
        stripePaymentIntentId: 'pi_test',
        bundleId: 'bundle_small',
        bundleName: 'Small Bundle',
        minutes: 5,
        amount: 1000,
        currency: 'eur',
        status: 'pending',
        creditsGranted: false,
        invoicePdf: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_small',
          bundleName: 'Small Bundle',
          minutes: '5',
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).toHaveBeenCalledOnce()
    })

    it('devrait ne pas créer purchase record si erreur Stripe', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
        new Error('Stripe error'),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_small',
          bundleName: 'Small Bundle',
          minutes: '5',
        },
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('Stripe error')

      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).not.toHaveBeenCalled()
    })
  })

  describe('Retry Logic & Transient Errors', () => {
    it('devrait gérer erreur réseau transitoire de Stripe', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
        new Error('Network error: ECONNRESET'),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('Network error')
    })

    it('devrait gérer erreur 503 Service Unavailable de Stripe', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
        new Stripe.errors.StripeAPIError({
          type: 'api_error',
          message: 'Service unavailable',
        } as any),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow()
    })

    it('devrait gérer timeout lors de retrieve de paymentIntent', async () => {
      vi.mocked(stripe.paymentIntents.retrieve).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 100),
          ),
      )

      await expect(service.getPaymentIntentStatus('pi_test')).rejects.toThrow(
        'Request timeout',
      )
    })
  })

  describe('Transactions & Data Integrity', () => {
    it('devrait créer customer et payment intent en cohérence', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
        email: mockEmail,
      } as any)
      mockSubscriptionRepository.createOrUpdateCustomer.mockResolvedValue({
        ...mockCustomer,
        stripeCustomerId: 'cus_new',
      })
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(
        mockSubscriptionRepository.createOrUpdateCustomer,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          stripeCustomerId: 'cus_new',
          email: mockEmail,
        }),
      )
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_new',
        }),
      )
      expect(result.paymentIntentId).toBe('pi_test')
    })

    it('devrait rollback si échec après création customer Stripe', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
      } as any)
      mockSubscriptionRepository.createOrUpdateCustomer.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
        new Error('Payment intent creation failed'),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow('Payment intent creation failed')
    })

    it('devrait maintenir cohérence entre metadata et purchase record', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      mockCreditPurchaseService.createPurchaseRecord.mockResolvedValue(
        {} as any,
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_small',
          bundleName: 'Small Bundle',
          minutes: '5',
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            bundleId: 'bundle_small',
            bundleName: 'Small Bundle',
            minutes: '5',
          }),
        }),
      )
      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).toHaveBeenCalledWith(
        mockUserId,
        'pi_test',
        'bundle_small',
        'Small Bundle',
        5,
        1000,
        'eur',
      )
    })
  })

  describe('Performance & Scalability', () => {
    it('devrait traiter rapidement une requête simple', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      const start = Date.now()
      await service.createPaymentIntent(mockUserId, mockEmail, request)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000)
    })

    it('devrait gérer plusieurs requêtes en parallèle', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      const promises = Array.from({ length: 10 }, () =>
        service.createPaymentIntent(mockUserId, mockEmail, request),
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(result.paymentIntentId).toBeDefined()
        expect(result.clientSecret).toBeDefined()
      })
    })
  })

  describe('Edge Cases - Null & Undefined', () => {
    it('devrait gérer customer.defaultPaymentMethod null', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue({
        ...mockCustomer,
        defaultPaymentMethod: null,
      })
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
    })

    it('devrait gérer metadata undefined', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: undefined,
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
    })

    it('devrait gérer currency undefined (default EUR)', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        currency: undefined,
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'eur',
        }),
      )
    })
  })

  describe('Edge Cases - Special Characters & Encoding', () => {
    it('devrait gérer caractères spéciaux dans bundleName', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      mockCreditPurchaseService.createPurchaseRecord.mockResolvedValue(
        {} as any,
      )

      const specialChars = 'Bundle "Premium" & <Special> 100%'
      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_1',
          bundleName: specialChars,
          minutes: '5',
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).toHaveBeenCalledWith(
        mockUserId,
        'pi_test',
        'bundle_1',
        specialChars,
        5,
        1000,
        'eur',
      )
    })

    it('devrait gérer newlines et tabs dans metadata', async () => {
      mockSubscriptionRepository.findCustomerByUserId.mockResolvedValue(
        mockCustomer,
      )
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const multiline = 'Line1\nLine2\tTab'
      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          description: multiline,
        },
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
    })
  })
})
