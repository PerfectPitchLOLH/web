import Stripe from 'stripe'
import type { Mocked } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CreditService } from '@/server/domains/credit/credit.service'
import { db } from '@/server/lib/database'
import { stripe } from '@/server/lib/stripe'
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

describe('CreditPurchaseService - Deep Tests', () => {
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
      findUserById: vi.fn().mockResolvedValue(null),
    } as unknown as Mocked<CreditPurchaseRepository>

    mockCreditService = {
      purchaseBundle: vi.fn(),
    } as unknown as Mocked<CreditService>

    service = new CreditPurchaseService(mockRepository, mockCreditService)

    vi.clearAllMocks()
  })

  describe('createPurchaseRecord - Boundary Values & Edge Cases', () => {
    it('devrait créer un nouvel enregistrement avec des données valides', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(createMockPurchase())

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result).toBeDefined()
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        stripePaymentIntentId: mockPaymentIntentId,
        bundleId: mockBundleId,
        bundleName: mockBundleName,
        minutes: mockMinutes,
        amount: mockAmount,
        currency: mockCurrency,
        status: 'pending',
        metadata: {
          createdVia: 'payment_intent',
        },
      })
    })

    it("devrait retourner l'enregistrement existant si le payment intent existe déjà", async () => {
      const existingPurchase = createMockPurchase()
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(existingPurchase)

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result).toEqual(existingPurchase)
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('devrait rejeter un montant supérieur à MAX_AMOUNT_EUR (100€)', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])

      await expect(
        service.createPurchaseRecord(
          mockUserId,
          mockPaymentIntentId,
          mockBundleId,
          mockBundleName,
          mockMinutes,
          10001,
          mockCurrency,
        ),
      ).rejects.toThrow(ApiError)

      await expect(
        service.createPurchaseRecord(
          mockUserId,
          mockPaymentIntentId,
          mockBundleId,
          mockBundleName,
          mockMinutes,
          10001,
          mockCurrency,
        ),
      ).rejects.toThrow('Le montant ne peut pas dépasser 100€')
    })

    it('devrait rejeter un montant exactement égal à MAX_AMOUNT_EUR + 1 centime', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])

      await expect(
        service.createPurchaseRecord(
          mockUserId,
          mockPaymentIntentId,
          mockBundleId,
          mockBundleName,
          mockMinutes,
          10001,
          mockCurrency,
        ),
      ).rejects.toThrow(ApiError)
    })

    it('devrait accepter un montant de 0 centime', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(createMockPurchase({ amount: 0 }))

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        0,
        mockCurrency,
      )

      expect(result.amount).toBe(0)
    })

    it('devrait accepter un montant négatif (edge case)', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ amount: -100 }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        -100,
        mockCurrency,
      )

      expect(result.amount).toBe(-100)
    })

    it('devrait gérer des bundleId très longs', async () => {
      const longBundleId = 'b'.repeat(1000)
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ bundleId: longBundleId }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        longBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.bundleId).toBe(longBundleId)
    })

    it('devrait gérer des caractères spéciaux dans bundleName', async () => {
      const specialName = '<script>alert("XSS")</script> Ñoño 测试 🚀'
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ bundleName: specialName }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        specialName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.bundleName).toBe(specialName)
    })

    it('devrait gérer des minutes à 0', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ minutes: 0 }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        0,
        mockAmount,
        mockCurrency,
      )

      expect(result.minutes).toBe(0)
    })

    it('devrait gérer des minutes négatives', async () => {
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ minutes: -500 }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        -500,
        mockAmount,
        mockCurrency,
      )

      expect(result.minutes).toBe(-500)
    })

    it('devrait gérer des très grandes valeurs de minutes (MAX_INT)', async () => {
      const maxMinutes = 2147483647
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ minutes: maxMinutes }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        maxMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.minutes).toBe(maxMinutes)
    })
  })

  describe('createPurchaseRecord - Rate Limiting', () => {
    it('devrait rejeter si MAX_PURCHASES_PER_HOUR (5) est atteint', async () => {
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
      ).rejects.toThrow(ApiError)

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
      ).rejects.toThrow("Limite d'achats atteinte (5/heure)")
    })

    it('devrait accepter exactement 4 achats récents (limite - 1)', async () => {
      const recentPurchases = Array.from({ length: 4 }, (_, i) =>
        createMockPurchase({ id: `purchase-${i}` }),
      )
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue(
        recentPurchases,
      )
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(createMockPurchase())

      const result = await service.createPurchaseRecord(
        mockUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result).toBeDefined()
      expect(mockRepository.create).toHaveBeenCalled()
    })

    it('devrait rejeter avec 6 achats récents', async () => {
      const recentPurchases = Array.from({ length: 6 }, (_, i) =>
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
      ).rejects.toThrow('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('processPaymentSuccess - Idempotence & Edge Cases', () => {
    it("devrait retourner l'achat existant si les crédits sont déjà accordés", async () => {
      const grantedPurchase = createMockPurchase({
        creditsGranted: true,
        creditsGrantedAt: new Date(),
      })
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(true)
      mockRepository.findByPaymentIntentId.mockResolvedValue(grantedPurchase)

      const result = await service.processPaymentSuccess(mockPaymentIntentId)

      expect(result).toEqual(grantedPurchase)
      expect(vi.mocked(stripe.paymentIntents.retrieve)).not.toHaveBeenCalled()
      expect(mockCreditService.purchaseBundle).not.toHaveBeenCalled()
    })

    it("devrait créer un nouvel enregistrement si le payment intent n'existe pas dans la DB", async () => {
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
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({ status: 'succeeded' })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
        creditsGrantedAt: new Date(),
      })

      const result = await service.processPaymentSuccess(mockPaymentIntentId)

      expect(mockRepository.create).toHaveBeenCalled()
      expect(mockCreditService.purchaseBundle).toHaveBeenCalledWith(
        mockUserId,
        mockBundleId,
        mockPaymentIntentId,
      )
      expect(result.creditsGranted).toBe(true)
    })

    it('devrait rejeter si le payment intent status n\'est pas "succeeded"', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'pending',
        amount: mockAmount,
        currency: mockCurrency,
        metadata: {},
      } as any)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow(ApiError)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow('Payment status is pending, expected succeeded')
    })

    it('devrait gérer les statuts invalides: failed', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'failed',
        metadata: {},
      } as any)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow('Payment status is failed, expected succeeded')
    })

    it('devrait gérer les statuts invalides: canceled', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
        id: mockPaymentIntentId,
        status: 'canceled',
        metadata: {},
      } as any)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow('Payment status is canceled, expected succeeded')
    })

    it('devrait rejeter si metadata.userId est manquant', async () => {
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
      ).rejects.toThrow(ApiError)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow('Payment Intent metadata is incomplete')
    })

    it('devrait rejeter si metadata.bundleId est manquant', async () => {
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
      ).rejects.toThrow('Payment Intent metadata is incomplete')
    })

    it('devrait gérer metadata.minutes vide (default à 0)', async () => {
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
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({
        minutes: 0,
        status: 'succeeded',
      })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      await service.processPaymentSuccess(mockPaymentIntentId)

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          minutes: 0,
        }),
      )
    })

    it('devrait gérer metadata.bundleName manquant (fallback à bundleId)', async () => {
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
          minutes: mockMinutes.toString(),
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({
        bundleName: mockBundleId,
        status: 'succeeded',
      })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      await service.processPaymentSuccess(mockPaymentIntentId)

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bundleName: mockBundleId,
        }),
      )
    })

    it("devrait rejeter si aucun abonnement actif n'existe", async () => {
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
      ).rejects.toThrow(
        'Un abonnement actif est requis pour recevoir des crédits',
      )
    })

    it('devrait accepter un abonnement en status "trialing"', async () => {
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
        userId: mockUserId,
        status: 'trialing',
      } as any)

      const newPurchase = createMockPurchase({ status: 'succeeded' })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      const result = await service.processPaymentSuccess(mockPaymentIntentId)

      expect(result.creditsGranted).toBe(true)
      expect(mockCreditService.purchaseBundle).toHaveBeenCalled()
    })

    it('devrait rejeter si subscription status est "canceled"', async () => {
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
      ).rejects.toThrow('NO_ACTIVE_SUBSCRIPTION')
    })
  })

  describe('processCheckoutSuccess - Edge Cases', () => {
    it('devrait traiter avec succès une session checkout valide', async () => {
      const sessionId = 'cs_test_123'
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        id: sessionId,
        payment_status: 'paid',
        amount_total: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
          bundleName: mockBundleName,
          minutes: mockMinutes.toString(),
        },
        invoice: null,
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({
        stripePaymentIntentId: sessionId,
        status: 'succeeded',
      })
      mockRepository.create.mockResolvedValue(newPurchase)
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...newPurchase,
        creditsGranted: true,
      })

      const result = await service.processCheckoutSuccess(sessionId)

      expect(result.creditsGranted).toBe(true)
      expect(mockRepository.create).toHaveBeenCalled()
    })

    it('devrait gérer session avec invoice PDF', async () => {
      const sessionId = 'cs_test_123'
      const invoicePdf = 'https://invoice.pdf'
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        id: sessionId,
        payment_status: 'paid',
        amount_total: mockAmount,
        currency: mockCurrency,
        metadata: {
          userId: mockUserId,
          bundleId: mockBundleId,
          bundleName: mockBundleName,
          minutes: mockMinutes.toString(),
        },
        invoice: {
          invoice_pdf: invoicePdf,
        },
      } as any)

      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        status: 'active',
      } as any)

      mockRepository.create.mockResolvedValue(
        createMockPurchase({ stripePaymentIntentId: sessionId }),
      )
      mockRepository.markCreditsGranted.mockResolvedValue(
        createMockPurchase({
          stripePaymentIntentId: sessionId,
          creditsGranted: true,
        }),
      )

      await service.processCheckoutSuccess(sessionId)

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          invoicePdf,
        }),
      )
    })

    it('devrait rejeter si payment_status n\'est pas "paid"', async () => {
      const sessionId = 'cs_test_123'
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)

      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        id: sessionId,
        payment_status: 'unpaid',
        metadata: {},
      } as any)

      await expect(service.processCheckoutSuccess(sessionId)).rejects.toThrow(
        'Payment status is unpaid, expected paid',
      )
    })

    it('devrait rejeter si metadata.userId est manquant', async () => {
      const sessionId = 'cs_test_123'
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)

      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        id: sessionId,
        payment_status: 'paid',
        metadata: {
          bundleId: mockBundleId,
        },
      } as any)

      await expect(service.processCheckoutSuccess(sessionId)).rejects.toThrow(
        'Checkout Session metadata is incomplete',
      )
    })

    it("devrait mettre à jour le status si l'achat existe déjà", async () => {
      const sessionId = 'cs_test_123'
      const existingPurchase = createMockPurchase({
        stripePaymentIntentId: sessionId,
        status: 'pending',
      })
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(existingPurchase)

      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        id: sessionId,
        payment_status: 'paid',
        amount_total: mockAmount,
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

      mockRepository.updateStatus.mockResolvedValue({
        ...existingPurchase,
        status: 'succeeded',
      })
      mockRepository.markCreditsGranted.mockResolvedValue({
        ...existingPurchase,
        status: 'succeeded',
        creditsGranted: true,
      })

      await service.processCheckoutSuccess(sessionId)

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        sessionId,
        'succeeded',
      )
      expect(mockRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('handleCheckoutExpired', () => {
    it('devrait mettre à jour le status à "canceled" si l\'achat existe', async () => {
      const sessionId = 'cs_test_123'
      const existingPurchase = createMockPurchase({
        stripePaymentIntentId: sessionId,
      })
      mockRepository.findByPaymentIntentId.mockResolvedValue(existingPurchase)
      mockRepository.updateStatus.mockResolvedValue({
        ...existingPurchase,
        status: 'canceled',
      })

      await service.handleCheckoutExpired(sessionId)

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        sessionId,
        'canceled',
      )
    })

    it("ne devrait rien faire si l'achat n'existe pas", async () => {
      const sessionId = 'cs_test_123'
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      await service.handleCheckoutExpired(sessionId)

      expect(mockRepository.updateStatus).not.toHaveBeenCalled()
    })

    it('devrait gérer les erreurs de la base de données', async () => {
      const sessionId = 'cs_test_123'
      mockRepository.findByPaymentIntentId.mockRejectedValue(
        new Error('Database error'),
      )

      await expect(service.handleCheckoutExpired(sessionId)).rejects.toThrow(
        'Database error',
      )
    })
  })

  describe('handlePaymentFailed', () => {
    it('devrait mettre à jour le status à "failed"', async () => {
      mockRepository.updateStatus.mockResolvedValue(
        createMockPurchase({ status: 'failed' }),
      )

      await service.handlePaymentFailed(mockPaymentIntentId)

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        mockPaymentIntentId,
        'failed',
      )
    })

    it('devrait gérer les erreurs de la base de données', async () => {
      mockRepository.updateStatus.mockRejectedValue(new Error('Database error'))

      await expect(
        service.handlePaymentFailed(mockPaymentIntentId),
      ).rejects.toThrow('Database error')
    })
  })

  describe('handlePaymentCanceled', () => {
    it('devrait mettre à jour le status à "canceled"', async () => {
      mockRepository.updateStatus.mockResolvedValue(
        createMockPurchase({ status: 'canceled' }),
      )

      await service.handlePaymentCanceled(mockPaymentIntentId)

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        mockPaymentIntentId,
        'canceled',
      )
    })

    it('devrait gérer les erreurs de la base de données', async () => {
      mockRepository.updateStatus.mockRejectedValue(new Error('Database error'))

      await expect(
        service.handlePaymentCanceled(mockPaymentIntentId),
      ).rejects.toThrow('Database error')
    })
  })

  describe('Race Conditions & Concurrency', () => {
    it('devrait gérer les appels concurrents à processPaymentSuccess avec le même paymentIntentId', async () => {
      mockRepository.isCreditsAlreadyGranted
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

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

      const promise1 = service.processPaymentSuccess(mockPaymentIntentId)
      const promise2 = service.processPaymentSuccess(mockPaymentIntentId)

      const results = await Promise.allSettled([promise1, promise2])

      expect(
        results.filter((r) => r.status === 'fulfilled').length,
      ).toBeGreaterThanOrEqual(1)
      expect(mockCreditService.purchaseBundle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Stripe API Errors', () => {
    it('devrait propager les erreurs Stripe lors de la récupération du payment intent', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      const stripeError = new Stripe.errors.StripeAPIError({
        message: 'No such payment_intent',
        type: 'invalid_request_error',
      })
      vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(stripeError)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow(stripeError)
    })

    it('devrait propager les erreurs Stripe lors de la récupération de la session', async () => {
      const sessionId = 'cs_test_123'
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)

      const stripeError = new Stripe.errors.StripeAPIError({
        message: 'No such checkout session',
        type: 'invalid_request_error',
      })
      vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValue(
        stripeError,
      )

      await expect(service.processCheckoutSuccess(sessionId)).rejects.toThrow(
        stripeError,
      )
    })

    it('devrait gérer les erreurs réseau Stripe (timeout)', async () => {
      mockRepository.isCreditsAlreadyGranted.mockResolvedValue(false)
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)

      const timeoutError = new Error('Request timeout')
      vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(timeoutError)

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow('Request timeout')
    })
  })

  describe('Database Transaction Errors', () => {
    it('devrait rollback si grantCredits échoue', async () => {
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
        userId: mockUserId,
        status: 'active',
      } as any)

      const newPurchase = createMockPurchase({ status: 'succeeded' })
      mockRepository.create.mockResolvedValue(newPurchase)

      mockCreditService.purchaseBundle.mockRejectedValue(
        new Error('Failed to grant credits'),
      )

      await expect(
        service.processPaymentSuccess(mockPaymentIntentId),
      ).rejects.toThrow('Failed to grant credits')

      expect(mockRepository.markCreditsGranted).not.toHaveBeenCalled()
    })
  })

  describe('Unicode & Special Characters', () => {
    it('devrait gérer des userId avec caractères spéciaux', async () => {
      const specialUserId = "user-测试-🚀-Ñoño-<script>alert('xss')</script>"
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ userId: specialUserId }),
      )

      const result = await service.createPurchaseRecord(
        specialUserId,
        mockPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.userId).toBe(specialUserId)
    })

    it('devrait gérer des paymentIntentId avec caractères spéciaux', async () => {
      const specialPaymentIntentId = "pi_测试🚀<script>alert('xss')</script>"
      mockRepository.findRecentPurchasesByUserId.mockResolvedValue([])
      mockRepository.findByPaymentIntentId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(
        createMockPurchase({ stripePaymentIntentId: specialPaymentIntentId }),
      )

      const result = await service.createPurchaseRecord(
        mockUserId,
        specialPaymentIntentId,
        mockBundleId,
        mockBundleName,
        mockMinutes,
        mockAmount,
        mockCurrency,
      )

      expect(result.stripePaymentIntentId).toBe(specialPaymentIntentId)
    })
  })
})
