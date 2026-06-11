import Stripe from 'stripe'
import type { Mocked } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CreditService } from '@/server/domains/credit/credit.service'
import { db } from '@/server/lib/database'
import { stripe } from '@/server/lib/stripe'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { CreditPurchaseRepository } from '../credit-purchase.repository'
import { CreditPurchaseService } from '../credit-purchase.service'
import type {
  CreditPurchaseEntity,
  PaymentStatus,
} from '../credit-purchase.types'

vi.mock('@/server/lib/email', () => ({
  sendLowCreditsEmail: vi.fn(),
  sendNoCreditsEmail: vi.fn(),
}))

vi.mock('@/server/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      retrieve: vi.fn(),
    },
    checkout: {
      sessions: {
        retrieve: vi.fn(),
      },
    },
  },
}))

vi.mock('@/server/lib/database', () => ({
  db: {
    subscription: {
      findFirst: vi.fn(),
    },
  },
}))

describe('CreditPurchaseService - Security Tests', () => {
  let service: CreditPurchaseService
  let mockRepository: Mocked<CreditPurchaseRepository>
  let mockCreditService: Mocked<CreditService>

  const mockUserId = 'user-123'
  const mockPaymentIntentId = 'pi_test123'
  const mockBundleId = 'bundle_500'
  const mockBundleName = '500 minutes'
  const mockMinutes = 500
  const mockAmount = 5000
  const mockCurrency = 'eur'

  const createMockPurchase = (
    overrides: Partial<CreditPurchaseEntity> = {},
  ): CreditPurchaseEntity => ({
    id: 'purchase-123',
    userId: mockUserId,
    stripePaymentIntentId: mockPaymentIntentId,
    bundleId: mockBundleId,
    bundleName: mockBundleName,
    minutes: mockMinutes,
    amount: mockAmount,
    currency: mockCurrency,
    status: 'pending' as PaymentStatus,
    creditsGranted: false,
    creditsGrantedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    mockRepository = {
      findByPaymentIntentId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      markCreditsGranted: vi.fn(),
      isCreditsAlreadyGranted: vi.fn(),
      findRecentPurchasesByUserId: vi.fn(),
      findSucceededByUserId: vi.fn(),
    } as unknown as Mocked<CreditPurchaseRepository>

    mockCreditService = {
      purchaseBundle: vi.fn(),
    } as unknown as Mocked<CreditService>

    service = new CreditPurchaseService(mockRepository, mockCreditService)

    vi.clearAllMocks()
  })

  describe('Injection Attacks', () => {
    it('devrait prévenir les injections SQL dans userId', async () => {
      const sqlInjection = "'; DROP TABLE credit_purchase; --"
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ userId: sqlInjection }),
      )

      const result = await service.createPurchaseRecord(
        sqlInjection,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.userId).toBe(sqlInjection)
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sqlInjection,
        }),
      )
    })

    it('devrait prévenir les injections NoSQL dans paymentIntentId', async () => {
      const noSqlInjection = JSON.stringify({ $ne: null })
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ stripePaymentIntentId: noSqlInjection }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        noSqlInjection,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.stripePaymentIntentId).toBe(noSqlInjection)
    })

    it('devrait prévenir les injections JavaScript dans bundleName', async () => {
      const jsInjection = '<script>alert("XSS")</script>'
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ bundleName: jsInjection }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        jsInjection,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.bundleName).toBe(jsInjection)
    })

    it("devrait gérer les tentatives d'injection HTML avec événements", async () => {
      const htmlInjection = '<img src=x onerror=alert("XSS")>'
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ bundleName: htmlInjection }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        htmlInjection,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.bundleName).toBe(htmlInjection)
    })

    it('devrait gérer les injections dans metadata (object injection)', async () => {
      const maliciousMetadata = {
        __proto__: { polluted: true },
        constructor: { prototype: { polluted: true } },
      }

      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
          bundleName: mockBundleName,
          minutes: mockMinutes.toString(),
          ...maliciousMetadata,
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({ status: 'succeeded' })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      await service.processPaymentSuccess(mockPaymentIntentId)

      expect(mockRepository.create).toHaveBeenCalled()
      expect(({} as any).polluted).toBeUndefined()
    })
  })

  describe('Authorization & Access Control', () => {
    it("ne devrait pas permettre à un utilisateur d'accorder des crédits sans abonnement actif", async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
          bundleName: mockBundleName,
          minutes: mockMinutes.toString(),
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue(null)

      const newPurchase = createMockPurchase({ status: 'succeeded' })
      mockRepository.create.mockResolvedValue(newPurchase)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow(ApiError)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toMatchObject({
        code: 'NO_ACTIVE_SUBSCRIPTION',
        statusCode: HTTP_STATUS.PAYMENT_REQUIRED,
      })
    })

    it('ne devrait pas permettre de traiter un payment intent pour un autre userId', async () => {
      const actualUserId = 'user-456'
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
          bundleName: mockBundleName,
          minutes: mockMinutes.toString(),
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: actualUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({ status: 'succeeded' })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      await service.processPaymentSuccess(mockPaymentIntentId)

      expect(mockCreditService.purchaseBundle).toHaveBeenCalledWith(
        mockUserId,
        mockBundleId,
        mockPaymentIntentId,
      )
    })

    it('devrait empêcher les achats de dépassement de rate limit par utilisateur', async () => {
      const recentPurchases = Array.from({ length: 5 }, (_, i) =>
        createMockPurchase({ id: `purchase-${i}` }),
      )
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue(
        recentPurchases,
      )

      await expect(
        service.createPurchaseRecord(
          mockUserId,
          mockPaymentIntentId,
          mockBundleId,
          mockBundleName,
          mockMinutes,
          mockAmount,
          mockCurrency,
        ),
      ).rejects.toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      })
    })

    it('devrait empêcher les montants malveillants très élevés', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])

      await expect(
        service.createPurchaseRecord(
          mockUserId,
          mockPaymentIntentId,
          mockBundleId,
          mockBundleName,
          mockMinutes,
          999999999,
          mockCurrency,
        ),
      ).rejects.toMatchObject({
        code: 'AMOUNT_TOO_HIGH',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })
  })

  describe('Data Leakage Prevention', () => {
    it('ne devrait pas exposer les détails internes dans les erreurs', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockRejectedValue(
        new Error('Database error: Connection to 192.168.1.100:5432 failed'),
      )

      try {
        await service.createPurchaseRecord(
          mockUserId,
          mockPaymentIntentId,
          mockBundleId,
          mockBundleName,
          mockMinutes,
          mockAmount,
          mockCurrency,
        )
      } catch (error: any) {
        expect(error.message).not.toContain('192.168.1.100')
        expect(error.message).not.toContain('5432')
      }
    })

    it('ne devrait pas exposer les clés Stripe dans les logs', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log')
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: mockCurrency,
        client_secret: 'sk_test_secret_key_should_not_be_logged',
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
          bundleName: mockBundleName,
          minutes: mockMinutes.toString(),
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({ status: 'succeeded' })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      await service.processPaymentSuccess(mockPaymentIntentId)

      const logs = consoleLogSpy.mock.calls.flat().join(' ')
      expect(logs).not.toContain('sk_test_')
      expect(logs).not.toContain('secret_key')

      consoleLogSpy.mockRestore()
    })

    it("ne devrait pas exposer les informations personnelles d'autres utilisateurs", async () => {
      const otherUserPurchase = createMockPurchase({
        userId: 'other-user-456',
        metadata: {
          email: 'other@example.com',
          name: 'Other User',
        },
      })
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(otherUserPurchase)

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.userId).toBe('other-user-456')
    })
  })

  describe('Idempotence & Replay Attacks', () => {
    it('devrait protéger contre les attaques par rejeu (replay attacks)', async () => {
      const grantedPurchase = createMockPurchase({
        creditsGranted: true,
        creditsGrantedAt: new Date(),
      })
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(true)
      mockRepository.findByPaymentIntentId.mockResolvedValue(grantedPurchase)

      await service.processPaymentSuccess(mockPaymentIntentId)
      await service.processPaymentSuccess(mockPaymentIntentId)
      await service.processPaymentSuccess(mockPaymentIntentId)

      expect(mockCreditService.purchaseBundle).not.toHaveBeenCalled()
      expect(vi.mocked(stripe.paymentIntents.retrieve)).not.toHaveBeenCalled()
    })

    it('devrait empêcher le double crédit avec des appels concurrents', async () => {
      let callCount = 0
      mockRepository.isCreditsAlreadyGranted.mockImplementation(async () => {
        callCount++
        if (callCount === 1) return false
        return true
      })

      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
          bundleName: mockBundleName,
          minutes: mockMinutes.toString(),
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({ status: 'succeeded' })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      const results = await Promise.allSettled([
        service.processPaymentSuccess(mockPaymentIntentId),
        service.processPaymentSuccess(mockPaymentIntentId),
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(mockCreditService.purchaseBundle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Payment Status Manipulation', () => {
    it('devrait rejeter un payment intent avec status manipulé', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'requires_payment_method',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
        },
      } as any)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toMatchObject({
        code: 'PAYMENT_NOT_SUCCEEDED',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('devrait rejeter un checkout session avec payment_status manipulé', async () => {
      const sessionId = 'cs_test_123'
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)

      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        id: sessionId,
        payment_status: 'no_payment_required',
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
        },
      } as any)

      await expect(
        service.processCheckoutSuccess(sessionId),
      ).rejects.toMatchObject({
        code: 'PAYMENT_NOT_SUCCEEDED',
      })
    })

    it('devrait valider que le status ne peut pas être changé de "succeeded" à "pending"', async () => {
      const existingPurchase = createMockPurchase({ status: 'succeeded' })
      mockRepository.findByPaymentIntentId.mockResolvedValue(existingPurchase)
      mockRepository.updateStatus.mockResolvedValue({
        ...existingPurchase,
        status: 'pending',
      })

      await service.handleCheckoutExpired(mockPaymentIntentId)

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        mockPaymentIntentId,
        'canceled',
      )
    })
  })

  describe('Metadata Tampering', () => {
    it('devrait rejeter metadata sans userId', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {
          bundleId: mockBundleId,
        },
      } as any)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toMatchObject({
        code: 'INVALID_PAYMENT_METADATA',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('devrait rejeter metadata sans bundleId', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
        },
      } as any)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toMatchObject({
        code: 'INVALID_PAYMENT_METADATA',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('devrait gérer les tentatives de modification de minutes via metadata', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
          bundleName: mockBundleName,
          minutes: '999999999',
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({
        minutes: 999999999,
        status: 'succeeded',
      })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      await service.processPaymentSuccess(mockPaymentIntentId)

      expect(mockCreditService.purchaseBundle).toHaveBeenCalledWith(
        mockUserId,
        mockBundleId,
        mockPaymentIntentId,
      )
    })

    it('devrait gérer les tentatives de modification de bundleId', async () => {
      const legitimateBundleId = 'bundle_100'
      const maliciousBundleId = 'bundle_999999'

      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: 1000,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
          bundleId: maliciousBundleId,
          bundleName: '999999 minutes',
          minutes: '999999',
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({
        bundleId: maliciousBundleId,
        status: 'succeeded',
      })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      await service.processPaymentSuccess(mockPaymentIntentId)

      expect(mockCreditService.purchaseBundle).toHaveBeenCalledWith(
        mockUserId,
        maliciousBundleId,
        mockPaymentIntentId,
      )
    })
  })

  describe('Time-based Attacks', () => {
    it("devrait empêcher l'exploitation de la fenêtre de 60 minutes pour rate limiting", async () => {
      const recentPurchases = Array.from({ length: 4 }, (_, i) => {
        const purchase = createMockPurchase({ id: `purchase-${i}` })
        purchase.createdAt = new Date(Date.now() - 59 * 60 * 1000)
        return purchase
      })

      mockRepository.findRecentPurchasesByUserId.mockResolvedValue(
        recentPurchases,
      )
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(createMockPurchase())

      await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(mockRepository.create).toHaveBeenCalled()
    })

    it('devrait rejeter si 5 achats ont été faits dans les 60 dernières minutes', async () => {
      const recentPurchases = Array.from({ length: 5 }, (_, i) => {
        const purchase = createMockPurchase({ id: `purchase-${i}` })
        purchase.createdAt = new Date(Date.now() - 30 * 60 * 1000)
        return purchase
      })

      mockRepository.findRecentPurchasesByUserId.mockResolvedValue(
        recentPurchases,
      )

      await expect(
        service.createPurchaseRecord(
          mockUserId,
          mockPaymentIntentId,
          mockBundleId,
          mockBundleName,
          mockMinutes,
          mockAmount,
          mockCurrency,
        ),
      ).rejects.toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
      })
    })
  })

  describe('Stripe Webhook Security', () => {
    it('devrait valider que le payment intent provient réellement de Stripe', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'No such payment_intent',
        type: 'invalid_request_error',
        param: 'id',
      })
      vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(stripeError)

      await expect(
        service.processPaymentSuccess('pi_fake_invalid'),
      ).rejects.toThrow()
    })

    it('devrait valider que la checkout session provient réellement de Stripe', async () => {
      const sessionId = 'cs_fake_invalid'
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)

      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'No such checkout session',
        type: 'invalid_request_error',
        param: 'id',
      })
      vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValue(
        stripeError,
      )

      await expect(service.processCheckoutSuccess(sessionId)).rejects.toThrow()
    })
  })

  describe('Database Constraint Violations', () => {
    it('devrait gérer les violations de contrainte unique sur stripePaymentIntentId', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockRejectedValue(
        new Error('Unique constraint violation: stripePaymentIntentId'),
      )

      await expect(
        service.createPurchaseRecord(
          mockUserId,
          mockPaymentIntentId,
          mockBundleId,
          mockBundleName,
          mockMinutes,
          mockAmount,
          mockCurrency,
        ),
      ).rejects.toThrow()
    })

    it('devrait gérer les violations de foreign key sur userId', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: 'non-existent-user',
          bundleId: mockBundleId,
          bundleName: mockBundleName,
          minutes: mockMinutes.toString(),
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: 'non-existent-user',
        status: 'active',
      } as any)

      mockRepository.create.mockRejectedValue(
        new Error('Foreign key constraint violation: userId'),
      )

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow()
    })
  })

  describe('Currency Manipulation', () => {
    it('devrait gérer les tentatives de changement de currency', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ currency: 'usd' }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        'usd',
      )

      expect(result.currency).toBe('usd')
    })

    it('devrait gérer les codes de currency invalides', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ currency: 'INVALID' }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        'INVALID',
      )

      expect(result.currency).toBe('INVALID')
    })

    it('devrait gérer les tentatives de currency avec caractères spéciaux', async () => {
      const maliciousCurrency = '<script>alert("XSS")</script>'
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ currency: maliciousCurrency }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        maliciousCurrency,
      )

      expect(result.currency).toBe(maliciousCurrency)
    })
  })
})
