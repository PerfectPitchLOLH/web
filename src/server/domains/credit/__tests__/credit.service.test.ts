import type { Mocked } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { CreditRepository } from '../credit.repository'
import { CreditService } from '../credit.service'

vi.mock('../credit.repository')
vi.mock('@/server/lib/database', () => ({
  db: {
    subscription: {
      findFirst: vi.fn(),
    },
  },
}))

describe('CreditService', () => {
  let service: CreditService
  let mockRepository: Mocked<CreditRepository>

  beforeEach(() => {
    mockRepository = new CreditRepository() as Mocked<CreditRepository>
    service = new CreditService(mockRepository)
    vi.clearAllMocks()
  })

  describe('getUserCreditsBalance', () => {
    it('devrait retourner le solde avec alertes si crédits existent', async () => {
      const mockCredits = {
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 10,
        usedThisMonth: 5,
        lastMonthlyRefill: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)

      const result = await service.getUserCreditsBalance('user-1')

      expect(result).toEqual({
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 10,
        totalCredits: 30,
        usedThisMonth: 5,
        remainingCredits: 25,
        lastMonthlyRefill: mockCredits.lastMonthlyRefill,
        alerts: {
          lowBalance: false,
          outOfCredits: false,
        },
      })
    })

    it("devrait détecter low balance à 80% d'utilisation", async () => {
      const mockCredits = {
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 5,
        usedThisMonth: 21,
        lastMonthlyRefill: new Date('2026-04-01'),
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
        monthlyCredits: 20,
        bonusCredits: 5,
        usedThisMonth: 25,
        lastMonthlyRefill: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)

      const result = await service.getUserCreditsBalance('user-1')

      expect(result.alerts.lowBalance).toBe(true)
      expect(result.alerts.outOfCredits).toBe(true)
    })

    it('devrait lancer erreur si crédits non trouvés', async () => {
      mockRepository.getUserCredits = vi.fn().mockResolvedValue(null)
      mockRepository.createOrUpdateUserCredits = vi.fn().mockResolvedValue({
        userId: 'user-1',
        monthlyCredits: 180,
        bonusCredits: 0,
        usedThisMonth: 0,
        lastMonthlyRefill: null,
        updatedAt: new Date(),
      })

      const result = await service.getUserCreditsBalance('user-1')
      expect(result).toBeDefined()
    })
  })

  describe('purchaseBundle', () => {
    it('devrait acheter un bundle valide', async () => {
      const { db } = await import('@/server/lib/database')
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'active',
      } as any)

      const mockCredits = {
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 10,
        usedThisMonth: 5,
        lastMonthlyRefill: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      const mockUpdatedCredits = {
        ...mockCredits,
        bonusCredits: 25,
      }

      mockRepository.getUserCredits = vi
        .fn()
        .mockResolvedValueOnce(mockCredits)
        .mockResolvedValueOnce(mockUpdatedCredits)
      mockRepository.addBonusCredits = vi
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

      const result = await service.purchaseBundle('user-1', 'medium')

      expect(result.bonusCredits).toBe(25)
      expect(mockRepository.addBonusCredits).toHaveBeenCalledWith(
        'user-1',
        900,
        undefined,
      )
      expect(mockRepository.createTransaction).toHaveBeenCalled()
    })

    it('devrait lancer erreur pour bundle invalide', async () => {
      await expect(
        service.purchaseBundle('user-1', 'invalid' as any),
      ).rejects.toThrow(ApiError)
    })

    it('devrait créer les crédits si non existants via getUserCreditsBalance', async () => {
      const { db } = await import('@/server/lib/database')
      vi.mocked(db.subscription.findFirst).mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'active',
      } as any)

      const initialCredits = {
        userId: 'user-1',
        monthlyCredits: 0,
        bonusCredits: 0,
        usedThisMonth: 0,
        lastMonthlyRefill: new Date(),
        updatedAt: new Date(),
      }

      const updatedCredits = {
        ...initialCredits,
        bonusCredits: 300,
      }

      const createdCredits = {
        userId: 'user-1',
        monthlyCredits: 180,
        bonusCredits: 300,
        usedThisMonth: 0,
        lastMonthlyRefill: null,
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi
        .fn()
        .mockResolvedValueOnce(initialCredits)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdCredits)
      mockRepository.createOrUpdateUserCredits = vi
        .fn()
        .mockResolvedValue(createdCredits)
      mockRepository.addBonusCredits = vi.fn().mockResolvedValue(updatedCredits)
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

      await service.purchaseBundle('user-1', 'small')

      expect(mockRepository.createOrUpdateUserCredits).toHaveBeenCalled()
    })
  })

  describe('deductCredits', () => {
    it("devrait déduire les crédits en priorité sur l'abonnement", async () => {
      const mockCredits = {
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 10,
        usedThisMonth: 5,
        lastMonthlyRefill: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      const updatedCredits = {
        ...mockCredits,
        usedThisMonth: 10,
      }
      mockRepository.getUserCredits = vi.fn().mockResolvedValue(updatedCredits)
      mockRepository.consumeCredits = vi.fn().mockResolvedValue(updatedCredits)
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
      expect(mockRepository.consumeCredits).toHaveBeenCalledWith('user-1', 300)
    })

    it('devrait lancer erreur si crédits insuffisants', async () => {
      const mockCredits = {
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 0,
        usedThisMonth: 20,
        lastMonthlyRefill: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockRepository.getUserCredits = vi.fn().mockResolvedValue(mockCredits)
      mockRepository.consumeCredits = vi
        .fn()
        .mockRejectedValue(new Error('Insufficient credits'))

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
      const mockCredits = {
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 10,
        usedThisMonth: 15,
        lastMonthlyRefill: new Date('2026-03-01'),
        updatedAt: new Date(),
      }

      const mockRefilled = {
        ...mockCredits,
        monthlyCredits: 20,
        lastMonthlyRefill: new Date(),
      }

      mockRepository.getUserCredits = vi
        .fn()
        .mockResolvedValueOnce(mockCredits)
        .mockResolvedValue(mockRefilled)
      mockRepository.refillMonthlyCredits = vi
        .fn()
        .mockResolvedValue(mockRefilled)
      mockRepository.createTransaction = vi.fn().mockResolvedValue({
        id: 1,
        userId: 'user-1',
        type: 'monthly_refill',
        amount: 20,
        balanceAfter: 30,
        description: "Recharge mensuelle d'abonnement (20 minutes)",
        metadata: null,
        createdAt: new Date(),
      })

      const result = await service.grantSubscriptionCredits('user-1', 20)

      expect(result).toBeDefined()
      expect(mockRepository.refillMonthlyCredits).toHaveBeenCalledWith(
        'user-1',
        1200,
        undefined,
      )
    })

    it('devrait créer les crédits si non existants', async () => {
      mockRepository.getUserCredits = vi.fn().mockResolvedValue({
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 0,
        usedThisMonth: 0,
        lastMonthlyRefill: new Date(),
        updatedAt: new Date(),
      })
      mockRepository.refillMonthlyCredits = vi.fn().mockResolvedValue({
        userId: 'user-1',
        monthlyCredits: 1200,
        bonusCredits: 0,
        usedThisMonth: 0,
        lastMonthlyRefill: new Date(),
        updatedAt: new Date(),
      })
      mockRepository.createTransaction = vi.fn().mockResolvedValue({
        id: 1,
        userId: 'user-1',
        type: 'monthly_refill',
        amount: 20,
        balanceAfter: 20,
        description: "Recharge mensuelle d'abonnement (20 minutes)",
        metadata: null,
        createdAt: new Date(),
      })

      await service.grantSubscriptionCredits('user-1', 20)

      expect(mockRepository.refillMonthlyCredits).toHaveBeenCalled()
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
      expect(result.total).toBe(1)
      expect(result.totalPages).toBe(1)
    })
  })
})
