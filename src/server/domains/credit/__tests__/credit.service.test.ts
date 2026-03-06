import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { CreditRepository } from '../credit.repository'
import { CreditService } from '../credit.service'

vi.mock('../credit.repository')

describe('CreditService', () => {
  let service: CreditService
  let mockRepository: vi.Mocked<CreditRepository>

  beforeEach(() => {
    mockRepository = new CreditRepository() as vi.Mocked<CreditRepository>
    service = new CreditService(mockRepository)
    vi.clearAllMocks()
  })

  describe('getUserCreditsBalance', () => {
    it('devrait retourner le solde avec alertes si crédits existent', async () => {
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 10,
        usedThisMonth: 5,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)

      const result = await service.getUserCreditsBalance('user-1')

      expect(result).toEqual({
        subscriptionMinutes: 20,
        purchasedMinutes: 10,
        totalMinutes: 30,
        usedThisMonth: 5,
        remainingMinutes: 25,
        resetDate: '2026-04-01T00:00:00.000Z',
        alerts: {
          lowBalance: false,
          outOfCredits: false,
        },
      })
    })

    it("devrait détecter low balance à 80% d'utilisation", async () => {
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 5,
        usedThisMonth: 21,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)

      const result = await service.getUserCreditsBalance('user-1')

      expect(result.alerts.lowBalance).toBe(true)
      expect(result.alerts.outOfCredits).toBe(false)
    })

    it("devrait détecter outOfCredits à 100% d'utilisation", async () => {
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 5,
        usedThisMonth: 25,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)

      const result = await service.getUserCreditsBalance('user-1')

      expect(result.alerts.lowBalance).toBe(true)
      expect(result.alerts.outOfCredits).toBe(true)
    })

    it('devrait lancer erreur si crédits non trouvés', async () => {
      mockRepository.getUserCredits = vi.fn().mockResolvedValue(null)

      await expect(service.getUserCreditsBalance('user-1')).rejects.toThrow(
        ApiError,
      )
    })
  })

  describe('purchaseBundle', () => {
    it('devrait acheter un bundle valide', async () => {
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 10,
        usedThisMonth: 5,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      const mockUpdatedCredits = {
        ...mockCredits,
        purchasedMinutes: 25,
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)
      mockRepository.incrementPurchasedMinutes = vi
        .fn()
        .mockResolvedValue(mockUpdatedCredits)
      mockRepository.createTransaction = vi.fn().mockResolvedValue({
        id: 1,
        userId: 'user-1',
        type: 'purchase',
        amount: 15,
        balanceAfter: 45,
        description: 'Achat de 15 minutes - Bundle Moyen',
        metadata: { bundleId: 'medium' },
        createdAt: new Date(),
      })

      const result = await service.purchaseBundle('user-1', {
        bundleId: 'medium',
      })

      expect(result.purchasedMinutes).toBe(25)
      expect(mockRepository.incrementPurchasedMinutes).toHaveBeenCalledWith(
        'user-1',
        15,
      )
      expect(mockRepository.createTransaction).toHaveBeenCalled()
    })

    it('devrait lancer erreur pour bundle invalide', async () => {
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 10,
        usedThisMonth: 5,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)

      await expect(
        service.purchaseBundle('user-1', { bundleId: 'invalid' }),
      ).rejects.toThrow(ApiError)
    })

    it('devrait créer les crédits si non existants', async () => {
      const mockNewCredits = {
        userId: 'user-1',
        subscriptionMinutes: 0,
        purchasedMinutes: 0,
        usedThisMonth: 0,
        resetDate: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(null)
      mockRepository.createOrUpdateUserCredits = vi
        .fn()
        .mockResolvedValue(mockNewCredits)
      mockRepository.incrementPurchasedMinutes = vi.fn().mockResolvedValue({
        ...mockNewCredits,
        purchasedMinutes: 5,
      })
      mockRepository.createTransaction = vi.fn().mockResolvedValue({
        id: 1,
        userId: 'user-1',
        type: 'purchase',
        amount: 5,
        balanceAfter: 5,
        description: 'Achat de 5 minutes - Bundle Petit',
        metadata: { bundleId: 'small' },
        createdAt: new Date(),
      })

      await service.purchaseBundle('user-1', { bundleId: 'small' })

      expect(mockRepository.createOrUpdateUserCredits).toHaveBeenCalled()
    })
  })

  describe('deductCredits', () => {
    it("devrait déduire les crédits en priorité sur l'abonnement", async () => {
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 10,
        usedThisMonth: 5,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)
      mockRepository.incrementUsedMinutes = vi.fn().mockResolvedValue({
        ...mockCredits,
        usedThisMonth: 10,
      })
      mockRepository.createTransaction = vi.fn().mockResolvedValue({
        id: 1,
        userId: 'user-1',
        type: 'deduction',
        amount: -5,
        balanceAfter: 25,
        description: 'Transcription audio',
        metadata: null,
        createdAt: new Date(),
      })

      const result = await service.deductCredits(
        'user-1',
        5,
        'Transcription audio',
      )

      expect(result.usedThisMonth).toBe(10)
      expect(mockRepository.incrementUsedMinutes).toHaveBeenCalledWith(
        'user-1',
        5,
      )
    })

    it('devrait lancer erreur si crédits insuffisants', async () => {
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 0,
        usedThisMonth: 20,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)

      await expect(service.deductCredits('user-1', 5, 'Test')).rejects.toThrow(
        ApiError,
      )

      const error = await service
        .deductCredits('user-1', 5, 'Test')
        .catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(HTTP_STATUS.PAYMENT_REQUIRED)
    })

    it('devrait lancer erreur pour montant invalide', async () => {
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 10,
        usedThisMonth: 5,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)

      await expect(service.deductCredits('user-1', 0, 'Test')).rejects.toThrow(
        ApiError,
      )
      await expect(service.deductCredits('user-1', -5, 'Test')).rejects.toThrow(
        ApiError,
      )
    })
  })

  describe('grantSubscriptionCredits', () => {
    it("devrait accorder les crédits d'abonnement et réinitialiser", async () => {
      const oldResetDate = new Date('2026-03-01')
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 10,
        usedThisMonth: 15,
        resetDate: oldResetDate,
        updatedAt: new Date(),
      }

      const updatedCredits = {
        ...mockCredits,
        usedThisMonth: 0,
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)
      mockRepository.updateUserCredits = vi
        .fn()
        .mockResolvedValue(updatedCredits)
      mockRepository.createTransaction = vi.fn().mockResolvedValue({
        id: 1,
        userId: 'user-1',
        type: 'subscription_grant',
        amount: 20,
        balanceAfter: 30,
        description: 'Renouvellement mensuel - 20 minutes',
        metadata: null,
        createdAt: new Date(),
      })

      const result = await service.grantSubscriptionCredits('user-1', 20)

      expect(result.usedThisMonth).toBe(0)
      expect(mockRepository.updateUserCredits).toHaveBeenCalledWith('user-1', {
        usedThisMonth: 0,
        resetDate: expect.any(Date),
      })
    })

    it('devrait créer les crédits si non existants', async () => {
      mockRepository.getUserCredits = vi.fn().mockResolvedValue(null)
      mockRepository.createOrUpdateUserCredits = vi.fn().mockResolvedValue({
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 0,
        usedThisMonth: 0,
        resetDate: expect.any(Date),
        updatedAt: new Date(),
      })
      mockRepository.createTransaction = vi.fn().mockResolvedValue({
        id: 1,
        userId: 'user-1',
        type: 'subscription_grant',
        amount: 20,
        balanceAfter: 20,
        description: 'Renouvellement mensuel - 20 minutes',
        metadata: null,
        createdAt: new Date(),
      })

      await service.grantSubscriptionCredits('user-1', 20)

      expect(mockRepository.createOrUpdateUserCredits).toHaveBeenCalled()
    })
  })

  describe('getTransactionHistory', () => {
    it("devrait retourner l'historique paginé formaté", async () => {
      const mockTransactions = [
        {
          id: 1,
          userId: 'user-1',
          type: 'purchase' as const,
          amount: 15,
          balanceAfter: 45,
          description: 'Achat',
          metadata: null,
          createdAt: new Date('2026-03-05T10:00:00Z'),
        },
      ]

      mockRepository.getTransactionHistory = vi.fn().mockResolvedValue({
        transactions: mockTransactions,
        total: 1,
      })

      const result = await service.getTransactionHistory('user-1', {
        page: 1,
        limit: 10,
      })

      expect(result.transactions).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.totalPages).toBe(1)
    })
  })
})
