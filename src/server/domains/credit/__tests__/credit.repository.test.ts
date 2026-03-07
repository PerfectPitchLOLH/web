import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { CreditRepository } from '../credit.repository'
import type { CreateCreditTransactionDTO } from '../credit.types'

vi.mock('@/server/lib/database', () => ({
  db: {
    userCredits: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('CreditRepository', () => {
  let repository: CreditRepository

  beforeEach(() => {
    repository = new CreditRepository()
    vi.clearAllMocks()
  })

  describe('getUserCredits', () => {
    it('devrait retourner les crédits utilisateur existants', async () => {
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 10,
        usedThisMonth: 5,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      vi.mocked(db.userCredits.findUnique).mockResolvedValue(mockCredits)

      const result = await repository.getUserCredits('user-1')

      expect(result).toEqual(mockCredits)
      expect(db.userCredits.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
    })

    it("devrait retourner null si les crédits n'existent pas", async () => {
      vi.mocked(db.userCredits.findUnique).mockResolvedValue(null)

      const result = await repository.getUserCredits('user-1')

      expect(result).toBeNull()
    })
  })

  describe('createOrUpdateUserCredits', () => {
    it('devrait créer de nouveaux crédits utilisateur', async () => {
      const resetDate = new Date('2026-04-01')
      const mockCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 0,
        usedThisMonth: 0,
        resetDate,
        updatedAt: new Date(),
      }

      vi.mocked(db.userCredits.upsert).mockResolvedValue(mockCredits)

      const result = await repository.createOrUpdateUserCredits('user-1', {
        subscriptionMinutes: 20,
        resetDate,
      })

      expect(result).toEqual(mockCredits)
      expect(db.userCredits.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: {
          subscriptionMinutes: 20,
          resetDate,
        },
        create: {
          userId: 'user-1',
          subscriptionMinutes: 20,
          purchasedMinutes: 0,
          usedThisMonth: 0,
          resetDate,
        },
      })
    })
  })

  describe('createTransaction', () => {
    it('devrait créer une transaction', async () => {
      const transactionData: CreateCreditTransactionDTO = {
        userId: 'user-1',
        type: 'purchase',
        amount: 15,
        balanceAfter: 45,
        description: 'Achat de 15 minutes',
      }

      const mockTransaction = {
        id: '1',
        ...transactionData,
        metadata: null,
        createdAt: new Date(),
      }

      vi.mocked(db.creditTransaction.create).mockResolvedValue(mockTransaction)

      const result = await repository.createTransaction(transactionData)

      expect(result).toEqual(mockTransaction)
      expect(db.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'purchase',
          amount: 15,
          balanceAfter: 45,
          description: 'Achat de 15 minutes',
          metadata: undefined,
        },
      })
    })

    it('devrait créer une transaction avec métadonnées', async () => {
      const transactionData: CreateCreditTransactionDTO = {
        userId: 'user-1',
        type: 'purchase',
        amount: 15,
        balanceAfter: 45,
        description: 'Achat de 15 minutes',
        metadata: { bundleId: 'medium' },
      }

      const mockTransaction = {
        id: '1',
        userId: transactionData.userId,
        type: transactionData.type,
        amount: transactionData.amount,
        balanceAfter: transactionData.balanceAfter,
        description: transactionData.description,
        metadata: (transactionData.metadata ?? null) as any,
        createdAt: new Date(),
      }

      vi.mocked(db.creditTransaction.create).mockResolvedValue(mockTransaction)

      await repository.createTransaction(transactionData)

      expect(db.creditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { bundleId: 'medium' },
        }),
      })
    })
  })

  describe('getTransactionHistory', () => {
    it("devrait retourner l'historique paginé", async () => {
      const mockTransactions = [
        {
          id: '1',
          userId: 'user-1',
          type: 'purchase',
          amount: 15,
          balanceAfter: 45,
          description: 'Achat',
          metadata: null,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.creditTransaction.findMany).mockResolvedValue(
        mockTransactions,
      )
      vi.mocked(db.creditTransaction.count).mockResolvedValue(1)

      const result = await repository.getTransactionHistory('user-1', {
        page: 1,
        limit: 10,
      })

      expect(result.transactions).toEqual(mockTransactions)
      expect(result.total).toBe(1)
      expect(db.creditTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    })

    it('devrait filtrer par type de transaction', async () => {
      vi.mocked(db.creditTransaction.findMany).mockResolvedValue([])
      vi.mocked(db.creditTransaction.count).mockResolvedValue(0)

      await repository.getTransactionHistory('user-1', {
        type: 'purchase',
        page: 1,
        limit: 10,
      })

      expect(db.creditTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'purchase',
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    })
  })

  describe('incrementPurchasedMinutes', () => {
    it('devrait incrémenter les minutes achetées', async () => {
      const mockUpdated = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 25,
        usedThisMonth: 5,
        resetDate: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.userCredits.update).mockResolvedValue(mockUpdated)

      const result = await repository.incrementPurchasedMinutes('user-1', 15)

      expect(result).toEqual(mockUpdated)
      expect(db.userCredits.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { purchasedMinutes: { increment: 15 } },
      })
    })
  })

  describe('incrementUsedMinutes', () => {
    it('devrait incrémenter les minutes utilisées', async () => {
      const mockUpdated = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 10,
        usedThisMonth: 10,
        resetDate: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.userCredits.update).mockResolvedValue(mockUpdated)

      const result = await repository.incrementUsedMinutes('user-1', 5)

      expect(result).toEqual(mockUpdated)
      expect(db.userCredits.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { usedThisMonth: { increment: 5 } },
      })
    })
  })
})
