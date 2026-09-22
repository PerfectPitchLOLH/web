import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import {
  CreditRepository,
  InsufficientCreditsError,
} from '../credit.repository'
import type { CreateCreditTransactionDTO } from '../credit.types'

vi.mock('@/server/lib/database', () => ({
  db: {
    userCredits: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
        monthlyCredits: 20,
        bonusCredits: 10,
        usedThisMonth: 5,
        lastMonthlyRefill: new Date('2026-04-01'),
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
      const lastMonthlyRefill = new Date('2026-04-01')
      const mockCredits = {
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 0,
        usedThisMonth: 0,
        lastMonthlyRefill,
        updatedAt: new Date(),
      }

      vi.mocked(db.userCredits.upsert).mockResolvedValue(mockCredits)

      const result = await repository.createOrUpdateUserCredits('user-1', {
        monthlyCredits: 20,
        lastMonthlyRefill,
      })

      expect(result).toEqual(mockCredits)
      expect(db.userCredits.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: {
          monthlyCredits: 20,
          lastMonthlyRefill,
        },
        create: {
          userId: 'user-1',
          monthlyCredits: 20,
          bonusCredits: 0,
          usedThisMonth: 0,
          lastMonthlyRefill,
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

  describe('incrementBonusCredits', () => {
    it('devrait incrémenter les minutes achetées', async () => {
      const mockUpdated = {
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 25,
        usedThisMonth: 5,
        lastMonthlyRefill: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.userCredits.update).mockResolvedValue(mockUpdated)

      const result = await repository.incrementBonusCredits('user-1', 15)

      expect(result).toEqual(mockUpdated)
      expect(db.userCredits.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { bonusCredits: { increment: 15 } },
      })
    })
  })

  describe('incrementUsedMinutes', () => {
    it('devrait incrémenter les minutes utilisées', async () => {
      const mockUpdated = {
        userId: 'user-1',
        monthlyCredits: 20,
        bonusCredits: 10,
        usedThisMonth: 10,
        lastMonthlyRefill: new Date(),
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
  describe('debitCredits', () => {
    const credits = (monthly: number, bonus: number, used = 0) => ({
      userId: 'user-1',
      monthlyCredits: monthly,
      bonusCredits: bonus,
      usedThisMonth: used,
      lastMonthlyRefill: null,
      updatedAt: new Date(),
    })

    it('devrait consommer le mensuel en premier avec une mise à jour conditionnelle', async () => {
      vi.mocked(db.userCredits.findUnique).mockResolvedValue(credits(100, 50))
      vi.mocked(db.userCredits.updateMany).mockResolvedValue({ count: 1 })

      const result = await repository.debitCredits('user-1', 60)

      expect(result).toMatchObject({
        fromMonthly: 60,
        fromBonus: 0,
        monthlyCredits: 40,
        bonusCredits: 50,
        usedThisMonth: 60,
      })
      expect(db.userCredits.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', monthlyCredits: 100, bonusCredits: 50 },
        data: {
          monthlyCredits: { decrement: 60 },
          bonusCredits: { decrement: 0 },
          usedThisMonth: { increment: 60 },
        },
      })
    })

    it('devrait déborder sur le bonus quand le mensuel est épuisé', async () => {
      vi.mocked(db.userCredits.findUnique).mockResolvedValue(credits(100, 50))
      vi.mocked(db.userCredits.updateMany).mockResolvedValue({ count: 1 })

      const result = await repository.debitCredits('user-1', 120)

      expect(result).toMatchObject({
        fromMonthly: 100,
        fromBonus: 20,
        monthlyCredits: 0,
        bonusCredits: 30,
      })
    })

    it('devrait consommer tout le solde disponible quand la durée est égale au solde', async () => {
      vi.mocked(db.userCredits.findUnique).mockResolvedValue(credits(100, 50))
      vi.mocked(db.userCredits.updateMany).mockResolvedValue({ count: 1 })

      const result = await repository.debitCredits('user-1', 150)

      expect(result).toMatchObject({ monthlyCredits: 0, bonusCredits: 0 })
    })

    it('devrait refuser sans rien écrire quand le solde est insuffisant', async () => {
      vi.mocked(db.userCredits.findUnique).mockResolvedValue(credits(100, 50))

      await expect(
        repository.debitCredits('user-1', 151),
      ).rejects.toBeInstanceOf(InsufficientCreditsError)
      expect(db.userCredits.updateMany).not.toHaveBeenCalled()
    })

    it('devrait relire le solde et réessayer quand un autre débit passe en premier', async () => {
      vi.mocked(db.userCredits.findUnique)
        .mockResolvedValueOnce(credits(100, 0))
        .mockResolvedValueOnce(credits(30, 0))
      vi.mocked(db.userCredits.updateMany).mockResolvedValueOnce({ count: 0 })

      await expect(
        repository.debitCredits('user-1', 60),
      ).rejects.toBeInstanceOf(InsufficientCreditsError)
      expect(db.userCredits.updateMany).toHaveBeenCalledTimes(1)
    })

    it('devrait réussir au second essai quand le solde couvre encore le débit', async () => {
      vi.mocked(db.userCredits.findUnique)
        .mockResolvedValueOnce(credits(100, 0))
        .mockResolvedValueOnce(credits(80, 0))
      vi.mocked(db.userCredits.updateMany)
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 1 })

      const result = await repository.debitCredits('user-1', 60)

      expect(result.monthlyCredits).toBe(20)
      expect(db.userCredits.updateMany).toHaveBeenCalledTimes(2)
    })

    it('devrait abandonner après trop de conflits successifs', async () => {
      vi.mocked(db.userCredits.findUnique).mockResolvedValue(credits(100, 0))
      vi.mocked(db.userCredits.updateMany).mockResolvedValue({ count: 0 })

      await expect(repository.debitCredits('user-1', 10)).rejects.toThrow(
        'contention',
      )
      expect(db.userCredits.updateMany).toHaveBeenCalledTimes(5)
    })

    it("devrait échouer quand l'utilisateur n'a pas de crédits", async () => {
      vi.mocked(db.userCredits.findUnique).mockResolvedValue(null)

      await expect(repository.debitCredits('user-1', 10)).rejects.toThrow(
        'User credits not found',
      )
    })

    it('devrait utiliser le client transactionnel fourni', async () => {
      const client = {
        userCredits: {
          findUnique: vi.fn().mockResolvedValue(credits(100, 0)),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }

      await repository.debitCredits('user-1', 10, client as any)

      expect(client.userCredits.updateMany).toHaveBeenCalled()
      expect(db.userCredits.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('consumeCredits', () => {
    it('devrait garder son message historique quand le solde est insuffisant', async () => {
      vi.mocked(db.userCredits.findUnique).mockResolvedValue({
        userId: 'user-1',
        monthlyCredits: 10,
        bonusCredits: 0,
        usedThisMonth: 0,
        lastMonthlyRefill: null,
        updatedAt: new Date(),
      })

      await expect(repository.consumeCredits('user-1', 20)).rejects.toThrow(
        'Insufficient credits',
      )
    })

    it('devrait retourner les soldes après consommation', async () => {
      vi.mocked(db.userCredits.findUnique).mockResolvedValue({
        userId: 'user-1',
        monthlyCredits: 100,
        bonusCredits: 50,
        usedThisMonth: 5,
        lastMonthlyRefill: null,
        updatedAt: new Date(),
      })
      vi.mocked(db.userCredits.updateMany).mockResolvedValue({ count: 1 })

      const result = await repository.consumeCredits('user-1', 120)

      expect(result).toMatchObject({
        userId: 'user-1',
        monthlyCredits: 0,
        bonusCredits: 30,
        usedThisMonth: 125,
      })
    })
  })

  describe('restoreCredits', () => {
    it('devrait recréditer mensuel et bonus séparément et réduire la consommation du mois', async () => {
      vi.mocked(db.userCredits.update).mockResolvedValue({
        userId: 'user-1',
        monthlyCredits: 50,
        bonusCredits: 40,
        usedThisMonth: 10,
        lastMonthlyRefill: null,
        updatedAt: new Date(),
      })
      vi.mocked(db.userCredits.updateMany).mockResolvedValue({ count: 1 })

      const result = await repository.restoreCredits('user-1', {
        monthly: 30,
        bonus: 10,
      })

      expect(result.monthlyCredits).toBe(50)
      expect(db.userCredits.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          monthlyCredits: { increment: 30 },
          bonusCredits: { increment: 10 },
        },
      })
      expect(db.userCredits.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', usedThisMonth: { gte: 40 } },
        data: { usedThisMonth: { decrement: 40 } },
      })
    })
  })

  describe('createTransaction avec client transactionnel', () => {
    it('devrait écrire via le client fourni', async () => {
      const client = {
        creditTransaction: { create: vi.fn().mockResolvedValue({ id: 't' }) },
      }

      await repository.createTransaction(
        {
          userId: 'user-1',
          type: 'refund',
          amount: 2,
          balanceAfter: 3,
          description: 'Remboursement',
        },
        client as any,
      )

      expect(client.creditTransaction.create).toHaveBeenCalled()
      expect(db.creditTransaction.create).not.toHaveBeenCalled()
    })
  })
})
