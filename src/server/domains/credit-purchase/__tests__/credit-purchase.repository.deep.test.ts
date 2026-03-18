// @ts-nocheck
import { Prisma } from '@prisma/client'
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { CreditPurchaseRepository } from '../credit-purchase.repository'
import type { PaymentStatus } from '../credit-purchase.types'

vi.mock('@/server/lib/database', () => ({
  db: {
    creditPurchase: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

type MockDbType = {
  creditPurchase: {
    findUnique: Mock
    findMany: Mock
    create: Mock
    update: Mock
  }
}

describe('CreditPurchaseRepository - Deep Tests', () => {
  let repository: CreditPurchaseRepository
  let mockDb: MockDbType

  beforeEach(() => {
    repository = new CreditPurchaseRepository()
    mockDb = db as any as MockDbType
    vi.clearAllMocks()
  })

  describe('findByPaymentIntentId', () => {
    describe('Cas nominaux', () => {
      it('devrait retourner un purchase existant', async () => {
        const mockPurchase = {
          id: 'purchase-123',
          userId: 'user-1',
          stripePaymentIntentId: 'pi_test_123',
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'succeeded',
          creditsGranted: true,
          creditsGrantedAt: new Date('2026-03-15T10:00:00Z'),
          invoicePdf: null,
          metadata: {},
          createdAt: new Date('2026-03-15T09:30:00Z'),
          updatedAt: new Date('2026-03-15T10:00:00Z'),
        }

        vi.mocked(mockDb.creditPurchase.findUnique).mockResolvedValue(
          mockPurchase as any,
        )

        const result = await repository.findByPaymentIntentId('pi_test_123')

        expect(result).toEqual(mockPurchase)
        expect(mockDb.creditPurchase.findUnique).toHaveBeenCalledWith({
          where: { stripePaymentIntentId: 'pi_test_123' },
        })
      })

      it('devrait retourner null si purchase non trouvé', async () => {
        vi.mocked(mockDb.creditPurchase.findUnique).mockResolvedValue(null)

        const result = await repository.findByPaymentIntentId('pi_nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('Boundary values - paymentIntentId', () => {
      it('devrait gérer une chaîne vide', async () => {
        mockDb.creditPurchase.findUnique.mockResolvedValue(null)

        const result = await repository.findByPaymentIntentId('')

        expect(result).toBeNull()
        expect(mockDb.creditPurchase.findUnique).toHaveBeenCalledWith({
          where: { stripePaymentIntentId: '' },
        })
      })

      it('devrait gérer un ID très long (>1000 caractères)', async () => {
        const longId = 'pi_' + 'a'.repeat(1000)
        mockDb.creditPurchase.findUnique.mockResolvedValue(null)

        const result = await repository.findByPaymentIntentId(longId)

        expect(result).toBeNull()
      })

      it('devrait gérer des caractères Unicode', async () => {
        const unicodeId = 'pi_test_émoji_🎉_日本語'
        mockDb.creditPurchase.findUnique.mockResolvedValue(null)

        await repository.findByPaymentIntentId(unicodeId)

        expect(mockDb.creditPurchase.findUnique).toHaveBeenCalledWith({
          where: { stripePaymentIntentId: unicodeId },
        })
      })

      it('devrait gérer des caractères spéciaux et échappement SQL', async () => {
        const specialId = "pi_test'; DROP TABLE credit_purchases; --"
        mockDb.creditPurchase.findUnique.mockResolvedValue(null)

        await repository.findByPaymentIntentId(specialId)

        expect(mockDb.creditPurchase.findUnique).toHaveBeenCalledWith({
          where: { stripePaymentIntentId: specialId },
        })
      })

      it('devrait gérer des espaces au début et à la fin', async () => {
        const spacedId = '  pi_test_123  '
        mockDb.creditPurchase.findUnique.mockResolvedValue(null)

        await repository.findByPaymentIntentId(spacedId)

        expect(mockDb.creditPurchase.findUnique).toHaveBeenCalledWith({
          where: { stripePaymentIntentId: spacedId },
        })
      })

      it('devrait gérer des sauts de ligne et caractères invisibles', async () => {
        const invisibleId = 'pi_test\n\r\t_123'
        mockDb.creditPurchase.findUnique.mockResolvedValue(null)

        await repository.findByPaymentIntentId(invisibleId)

        expect(mockDb.creditPurchase.findUnique).toHaveBeenCalled()
      })
    })

    describe('Erreurs base de données', () => {
      it('devrait propager les erreurs de connexion DB', async () => {
        mockDb.creditPurchase.findUnique.mockRejectedValue(
          new Error('Connection timeout'),
        )

        await expect(
          repository.findByPaymentIntentId('pi_test_123'),
        ).rejects.toThrow('Connection timeout')
      })

      it('devrait propager les erreurs Prisma', async () => {
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Record not found',
          {
            code: 'P2025',
            clientVersion: '5.0.0',
          },
        )
        mockDb.creditPurchase.findUnique.mockRejectedValue(prismaError)

        await expect(
          repository.findByPaymentIntentId('pi_test_123'),
        ).rejects.toThrow(prismaError)
      })

      it('devrait gérer les deadlocks (P2034)', async () => {
        const deadlockError = new Prisma.PrismaClientKnownRequestError(
          'Transaction deadlock',
          {
            code: 'P2034',
            clientVersion: '5.0.0',
          },
        )
        mockDb.creditPurchase.findUnique.mockRejectedValue(deadlockError)

        await expect(
          repository.findByPaymentIntentId('pi_test_123'),
        ).rejects.toThrow(deadlockError)
      })
    })

    describe('Edge cases - valeurs nulles/undefined', () => {
      it('devrait gérer metadata null', async () => {
        const mockPurchase = {
          id: 'purchase-123',
          userId: 'user-1',
          stripePaymentIntentId: 'pi_test_123',
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'succeeded',
          creditsGranted: true,
          creditsGrantedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockDb.creditPurchase.findUnique.mockResolvedValue(mockPurchase)

        const result = await repository.findByPaymentIntentId('pi_test_123')

        expect(result).toEqual(mockPurchase)
      })
    })
  })

  describe('create', () => {
    describe('Cas nominaux', () => {
      it('devrait créer un purchase avec toutes les données', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_new_123',
          bundleId: 'medium',
          bundleName: 'Bundle Moyen',
          minutes: 15,
          amount: 1500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
          metadata: { source: 'web', campaign: 'promo2026' },
        }

        const mockCreated = {
          id: 'purchase-new',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockDb.creditPurchase.create.mockResolvedValue(mockCreated)

        const result = await repository.create(createData)

        expect(result).toEqual(mockCreated)
        expect(mockDb.creditPurchase.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            stripePaymentIntentId: 'pi_new_123',
            bundleId: 'medium',
            bundleName: 'Bundle Moyen',
            minutes: 15,
            amount: 1500,
            currency: 'eur',
            status: 'pending',
            creditsGranted: false,
            creditsGrantedAt: null,
            invoicePdf: null,
            metadata: { source: 'web', campaign: 'promo2026' },
          },
        })
      })

      it('devrait créer avec invoicePdf', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_new_123',
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'succeeded' as PaymentStatus,
          invoicePdf: 'https://stripe.com/invoices/inv_123.pdf',
        }

        const mockCreated = {
          id: 'purchase-pdf',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockDb.creditPurchase.create.mockResolvedValue(mockCreated)

        const result = await repository.create(createData)

        expect(result.invoicePdf).toBe(
          'https://stripe.com/invoices/inv_123.pdf',
        )
      })

      it('devrait créer sans metadata', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_no_meta',
          bundleId: 'big',
          bundleName: 'Bundle Grand',
          minutes: 30,
          amount: 3000,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        const mockCreated = {
          id: 'purchase-no-meta',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockDb.creditPurchase.create.mockResolvedValue(mockCreated)

        const result = await repository.create(createData)

        expect(result).toEqual(mockCreated)
      })
    })

    describe('Boundary values - minutes', () => {
      it('devrait accepter minutes = 0', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_zero',
          bundleId: 'test',
          bundleName: 'Test Zero',
          minutes: 0,
          amount: 0,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'test-zero',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })

      it('devrait accepter minutes négatif (edge case DB)', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_negative',
          bundleId: 'test',
          bundleName: 'Test Negative',
          minutes: -10,
          amount: 1000,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'test-neg',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })

      it('devrait accepter très grande valeur de minutes', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_huge',
          bundleId: 'huge',
          bundleName: 'Énorme',
          minutes: 999999999,
          amount: 100000000,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'huge',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })
    })

    describe('Boundary values - amount', () => {
      it('devrait accepter amount = 0', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_free',
          bundleId: 'free',
          bundleName: 'Gratuit',
          minutes: 5,
          amount: 0,
          currency: 'eur',
          status: 'succeeded' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'free',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })

      it('devrait accepter très grand montant', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_expensive',
          bundleId: 'premium',
          bundleName: 'Premium',
          minutes: 1000,
          amount: 2147483647,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'expensive',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })
    })

    describe('Boundary values - strings', () => {
      it('devrait gérer bundleName très long', async () => {
        const longName = 'Bundle ' + 'X'.repeat(500)
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_long_name',
          bundleId: 'long',
          bundleName: longName,
          minutes: 10,
          amount: 1000,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'long',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })

      it('devrait gérer bundleName vide', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_empty_name',
          bundleId: 'empty',
          bundleName: '',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'empty',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })

      it('devrait gérer caractères Unicode dans bundleName', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_unicode',
          bundleId: 'unicode',
          bundleName: 'Bundle 日本語 🎉 émoji',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'unicode',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })
    })

    describe('Boundary values - currency', () => {
      it('devrait accepter différentes devises', async () => {
        const currencies = ['usd', 'gbp', 'jpy', 'chf']

        for (const currency of currencies) {
          const createData = {
            userId: 'user-1',
            stripePaymentIntentId: `pi_${currency}`,
            bundleId: 'test',
            bundleName: 'Test',
            minutes: 5,
            amount: 500,
            currency,
            status: 'pending' as PaymentStatus,
          }

          mockDb.creditPurchase.create.mockResolvedValue({
            id: currency,
            ...createData,
            creditsGranted: false,
            creditsGrantedAt: null,
            invoicePdf: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          await repository.create(createData)
        }

        expect(mockDb.creditPurchase.create).toHaveBeenCalledTimes(
          currencies.length,
        )
      })

      it('devrait gérer devise invalide', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_invalid_currency',
          bundleId: 'test',
          bundleName: 'Test',
          minutes: 5,
          amount: 500,
          currency: 'INVALID',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'invalid',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })
    })

    describe('Boundary values - metadata', () => {
      it('devrait gérer metadata très large', async () => {
        const largeMetadata = {
          key1: 'x'.repeat(1000),
          key2: 'y'.repeat(1000),
          nested: {
            deep: {
              value: 'z'.repeat(500),
            },
          },
          array: new Array(100).fill('item'),
        }

        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_large_meta',
          bundleId: 'test',
          bundleName: 'Test',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
          metadata: largeMetadata,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'large-meta',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })

      it('devrait gérer metadata avec caractères spéciaux', async () => {
        const specialMetadata = {
          'special<>chars': "value'; DROP TABLE--",
          emoji: '🎉🎊🎈',
          unicode: '日本語',
          quotes: '"double" and \'single\'',
        }

        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_special_meta',
          bundleId: 'test',
          bundleName: 'Test',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
          metadata: specialMetadata,
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'special-meta',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })

      it('devrait gérer metadata vide', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_empty_meta',
          bundleId: 'test',
          bundleName: 'Test',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
          metadata: {},
        }

        mockDb.creditPurchase.create.mockResolvedValue({
          id: 'empty-meta',
          ...createData,
          creditsGranted: false,
          creditsGrantedAt: null,
          invoicePdf: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await repository.create(createData)

        expect(mockDb.creditPurchase.create).toHaveBeenCalled()
      })
    })

    describe('Contraintes base de données', () => {
      it('devrait échouer si stripePaymentIntentId existe déjà (unique)', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_duplicate',
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        const uniqueError = new Prisma.PrismaClientKnownRequestError(
          'Unique constraint violation',
          {
            code: 'P2002',
            clientVersion: '5.0.0',
            meta: {
              target: ['stripePaymentIntentId'],
            },
          },
        )

        mockDb.creditPurchase.create.mockRejectedValue(uniqueError)

        await expect(repository.create(createData)).rejects.toThrow(uniqueError)
      })

      it('devrait échouer si userId référence un user inexistant (foreign key)', async () => {
        const createData = {
          userId: 'nonexistent-user',
          stripePaymentIntentId: 'pi_new',
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        const fkError = new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          {
            code: 'P2003',
            clientVersion: '5.0.0',
            meta: {
              field_name: 'userId',
            },
          },
        )

        mockDb.creditPurchase.create.mockRejectedValue(fkError)

        await expect(repository.create(createData)).rejects.toThrow(fkError)
      })
    })

    describe('Erreurs base de données', () => {
      it('devrait gérer les timeouts', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_timeout',
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockRejectedValue(
          new Error('Query timeout'),
        )

        await expect(repository.create(createData)).rejects.toThrow(
          'Query timeout',
        )
      })

      it('devrait gérer la perte de connexion', async () => {
        const createData = {
          userId: 'user-1',
          stripePaymentIntentId: 'pi_conn_lost',
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
        }

        mockDb.creditPurchase.create.mockRejectedValue(
          new Error('Connection lost'),
        )

        await expect(repository.create(createData)).rejects.toThrow(
          'Connection lost',
        )
      })
    })
  })

  describe('updateStatus', () => {
    describe('Cas nominaux', () => {
      it('devrait mettre à jour le statut', async () => {
        const mockUpdated = {
          id: 'purchase-123',
          userId: 'user-1',
          stripePaymentIntentId: 'pi_test_123',
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'succeeded',
          creditsGranted: false,
          creditsGrantedAt: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockDb.creditPurchase.update.mockResolvedValue(mockUpdated)

        const result = await repository.updateStatus('pi_test_123', 'succeeded')

        expect(result).toEqual(mockUpdated)
        expect(mockDb.creditPurchase.update).toHaveBeenCalledWith({
          where: { stripePaymentIntentId: 'pi_test_123' },
          data: { status: 'succeeded' },
        })
      })

      it('devrait mettre à jour vers tous les statuts possibles', async () => {
        const statuses: PaymentStatus[] = [
          'pending',
          'processing',
          'succeeded',
          'failed',
          'canceled',
        ]

        for (const status of statuses) {
          mockDb.creditPurchase.update.mockResolvedValue({
            id: 'test',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_test',
            bundleId: 'small',
            bundleName: 'Test',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status,
            creditsGranted: false,
            creditsGrantedAt: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          await repository.updateStatus('pi_test', status)
        }

        expect(mockDb.creditPurchase.update).toHaveBeenCalledTimes(
          statuses.length,
        )
      })
    })

    describe('Edge cases', () => {
      it('devrait retourner null si purchase non trouvé', async () => {
        const notFoundError = new Prisma.PrismaClientKnownRequestError(
          'Record not found',
          {
            code: 'P2025',
            clientVersion: '5.0.0',
          },
        )

        mockDb.creditPurchase.update.mockRejectedValue(notFoundError)

        await expect(
          repository.updateStatus('pi_nonexistent', 'succeeded'),
        ).rejects.toThrow(notFoundError)
      })

      it('devrait gérer les updates concurrents (optimistic locking)', async () => {
        mockDb.creditPurchase.update
          .mockResolvedValueOnce({
            id: 'purchase-123',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_test',
            bundleId: 'small',
            bundleName: 'Test',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: false,
            creditsGrantedAt: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .mockResolvedValueOnce({
            id: 'purchase-123',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_test',
            bundleId: 'small',
            bundleName: 'Test',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'failed',
            creditsGranted: false,
            creditsGrantedAt: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

        const result1 = await repository.updateStatus('pi_test', 'succeeded')
        const result2 = await repository.updateStatus('pi_test', 'failed')

        expect(result1?.status).toBe('succeeded')
        expect(result2?.status).toBe('failed')
      })
    })
  })

  describe('markCreditsGranted', () => {
    describe('Cas nominaux', () => {
      it('devrait marquer les crédits comme accordés', async () => {
        const now = new Date()
        const mockUpdated = {
          id: 'purchase-123',
          userId: 'user-1',
          stripePaymentIntentId: 'pi_test_123',
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'succeeded',
          creditsGranted: true,
          creditsGrantedAt: now,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockDb.creditPurchase.update.mockResolvedValue(mockUpdated)

        const result = await repository.markCreditsGranted('pi_test_123')

        expect(result.creditsGranted).toBe(true)
        expect(result.creditsGrantedAt).toEqual(now)
        expect(mockDb.creditPurchase.update).toHaveBeenCalledWith({
          where: { stripePaymentIntentId: 'pi_test_123' },
          data: {
            creditsGranted: true,
            creditsGrantedAt: expect.any(Date),
          },
        })
      })
    })

    describe('Idempotence', () => {
      it('devrait permettre de marquer plusieurs fois (idempotent)', async () => {
        const firstDate = new Date('2026-03-15T10:00:00Z')
        const secondDate = new Date('2026-03-15T10:05:00Z')

        mockDb.creditPurchase.update
          .mockResolvedValueOnce({
            id: 'purchase-123',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_test',
            bundleId: 'small',
            bundleName: 'Test',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: true,
            creditsGrantedAt: firstDate,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .mockResolvedValueOnce({
            id: 'purchase-123',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_test',
            bundleId: 'small',
            bundleName: 'Test',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: true,
            creditsGrantedAt: secondDate,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

        const result1 = await repository.markCreditsGranted('pi_test')
        const result2 = await repository.markCreditsGranted('pi_test')

        expect(result1.creditsGranted).toBe(true)
        expect(result2.creditsGranted).toBe(true)
        expect(mockDb.creditPurchase.update).toHaveBeenCalledTimes(2)
      })
    })

    describe('Edge cases', () => {
      it('devrait échouer si purchase non trouvé', async () => {
        const notFoundError = new Prisma.PrismaClientKnownRequestError(
          'Record not found',
          {
            code: 'P2025',
            clientVersion: '5.0.0',
          },
        )

        mockDb.creditPurchase.update.mockRejectedValue(notFoundError)

        await expect(
          repository.markCreditsGranted('pi_nonexistent'),
        ).rejects.toThrow(notFoundError)
      })
    })
  })

  describe('isCreditsAlreadyGranted', () => {
    describe('Cas nominaux', () => {
      it('devrait retourner true si crédits accordés', async () => {
        mockDb.creditPurchase.findUnique.mockResolvedValue({
          creditsGranted: true,
        })

        const result = await repository.isCreditsAlreadyGranted('pi_test_123')

        expect(result).toBe(true)
        expect(mockDb.creditPurchase.findUnique).toHaveBeenCalledWith({
          where: { stripePaymentIntentId: 'pi_test_123' },
          select: { creditsGranted: true },
        })
      })

      it('devrait retourner false si crédits non accordés', async () => {
        mockDb.creditPurchase.findUnique.mockResolvedValue({
          creditsGranted: false,
        })

        const result = await repository.isCreditsAlreadyGranted('pi_test_123')

        expect(result).toBe(false)
      })

      it('devrait retourner false si purchase non trouvé', async () => {
        mockDb.creditPurchase.findUnique.mockResolvedValue(null)

        const result =
          await repository.isCreditsAlreadyGranted('pi_nonexistent')

        expect(result).toBe(false)
      })
    })

    describe('Edge cases - valeurs falsy', () => {
      it('devrait retourner false pour undefined', async () => {
        mockDb.creditPurchase.findUnique.mockResolvedValue({
          creditsGranted: undefined as any,
        })

        const result = await repository.isCreditsAlreadyGranted('pi_test')

        expect(result).toBe(false)
      })

      it('devrait retourner false pour null', async () => {
        mockDb.creditPurchase.findUnique.mockResolvedValue({
          creditsGranted: null as any,
        })

        const result = await repository.isCreditsAlreadyGranted('pi_test')

        expect(result).toBe(false)
      })
    })
  })

  describe('findRecentPurchasesByUserId', () => {
    describe('Cas nominaux', () => {
      it('devrait retourner les purchases récents (60 min par défaut)', async () => {
        const now = new Date()
        const mockPurchases = [
          {
            id: 'purchase-1',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_1',
            bundleId: 'small',
            bundleName: 'Bundle Petit',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: true,
            creditsGrantedAt: now,
            metadata: null,
            createdAt: new Date(now.getTime() - 30 * 60 * 1000),
            updatedAt: now,
          },
          {
            id: 'purchase-2',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_2',
            bundleId: 'medium',
            bundleName: 'Bundle Moyen',
            minutes: 15,
            amount: 1500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: true,
            creditsGrantedAt: now,
            metadata: null,
            createdAt: new Date(now.getTime() - 10 * 60 * 1000),
            updatedAt: now,
          },
        ]

        mockDb.creditPurchase.findMany.mockResolvedValue(mockPurchases)

        const result = await repository.findRecentPurchasesByUserId('user-1')

        expect(result).toHaveLength(2)
        expect(mockDb.creditPurchase.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            createdAt: {
              gte: expect.any(Date),
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
      })

      it('devrait accepter une fenêtre personnalisée', async () => {
        mockDb.creditPurchase.findMany.mockResolvedValue([])

        await repository.findRecentPurchasesByUserId('user-1', 120)

        const call = mockDb.creditPurchase.findMany.mock.calls[0][0]
        const since = call?.where?.createdAt?.gte as Date
        const expectedSince = new Date(Date.now() - 120 * 60 * 1000)

        expect(since.getTime()).toBeGreaterThanOrEqual(
          expectedSince.getTime() - 1000,
        )
        expect(since.getTime()).toBeLessThanOrEqual(
          expectedSince.getTime() + 1000,
        )
      })

      it('devrait retourner un tableau vide si aucun purchase récent', async () => {
        mockDb.creditPurchase.findMany.mockResolvedValue([])

        const result = await repository.findRecentPurchasesByUserId('user-1')

        expect(result).toEqual([])
      })
    })

    describe('Boundary values - withinMinutes', () => {
      it('devrait gérer withinMinutes = 0', async () => {
        mockDb.creditPurchase.findMany.mockResolvedValue([])

        await repository.findRecentPurchasesByUserId('user-1', 0)

        expect(mockDb.creditPurchase.findMany).toHaveBeenCalled()
      })

      it('devrait gérer withinMinutes négatif', async () => {
        mockDb.creditPurchase.findMany.mockResolvedValue([])

        await repository.findRecentPurchasesByUserId('user-1', -30)

        expect(mockDb.creditPurchase.findMany).toHaveBeenCalled()
      })

      it('devrait gérer très grande fenêtre (30 jours)', async () => {
        mockDb.creditPurchase.findMany.mockResolvedValue([])

        await repository.findRecentPurchasesByUserId('user-1', 43200)

        expect(mockDb.creditPurchase.findMany).toHaveBeenCalled()
      })
    })

    describe('Performance - grand nombre de résultats', () => {
      it('devrait gérer 100 purchases récents', async () => {
        const mockPurchases = Array.from({ length: 100 }, (_, i) => ({
          id: `purchase-${i}`,
          userId: 'user-1',
          stripePaymentIntentId: `pi_${i}`,
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'succeeded',
          creditsGranted: true,
          creditsGrantedAt: new Date(),
          metadata: null,
          createdAt: new Date(Date.now() - i * 60 * 1000),
          updatedAt: new Date(),
        }))

        mockDb.creditPurchase.findMany.mockResolvedValue(mockPurchases)

        const result = await repository.findRecentPurchasesByUserId('user-1')

        expect(result).toHaveLength(100)
      })
    })

    describe('Ordre des résultats', () => {
      it('devrait retourner les résultats triés par date décroissante', async () => {
        const old = new Date('2026-03-15T09:00:00Z')
        const recent = new Date('2026-03-15T10:00:00Z')

        const mockPurchases = [
          {
            id: 'purchase-recent',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_recent',
            bundleId: 'small',
            bundleName: 'Récent',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: false,
            creditsGrantedAt: null,
            metadata: null,
            createdAt: recent,
            updatedAt: recent,
          },
          {
            id: 'purchase-old',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_old',
            bundleId: 'small',
            bundleName: 'Ancien',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: false,
            creditsGrantedAt: null,
            metadata: null,
            createdAt: old,
            updatedAt: old,
          },
        ]

        mockDb.creditPurchase.findMany.mockResolvedValue(mockPurchases)

        const result = await repository.findRecentPurchasesByUserId('user-1')

        expect(result[0].id).toBe('purchase-recent')
        expect(result[1].id).toBe('purchase-old')
      })
    })
  })

  describe('findSucceededByUserId', () => {
    describe('Cas nominaux', () => {
      it('devrait retourner uniquement les purchases succeeded', async () => {
        const mockPurchases = [
          {
            id: 'purchase-1',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_1',
            bundleId: 'small',
            bundleName: 'Bundle Petit',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: true,
            creditsGrantedAt: new Date(),
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        mockDb.creditPurchase.findMany.mockResolvedValue(mockPurchases)

        const result = await repository.findSucceededByUserId('user-1')

        expect(result).toHaveLength(1)
        expect(result[0].status).toBe('succeeded')
        expect(mockDb.creditPurchase.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            status: 'succeeded',
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
      })

      it('devrait retourner un tableau vide si aucun succeeded', async () => {
        mockDb.creditPurchase.findMany.mockResolvedValue([])

        const result = await repository.findSucceededByUserId('user-1')

        expect(result).toEqual([])
      })
    })

    describe('Ordre des résultats', () => {
      it('devrait retourner les résultats triés par date décroissante', async () => {
        const old = new Date('2026-03-01T09:00:00Z')
        const recent = new Date('2026-03-15T10:00:00Z')

        const mockPurchases = [
          {
            id: 'purchase-recent',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_recent',
            bundleId: 'small',
            bundleName: 'Récent',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: true,
            creditsGrantedAt: recent,
            metadata: null,
            createdAt: recent,
            updatedAt: recent,
          },
          {
            id: 'purchase-old',
            userId: 'user-1',
            stripePaymentIntentId: 'pi_old',
            bundleId: 'small',
            bundleName: 'Ancien',
            minutes: 5,
            amount: 500,
            currency: 'eur',
            status: 'succeeded',
            creditsGranted: true,
            creditsGrantedAt: old,
            metadata: null,
            createdAt: old,
            updatedAt: old,
          },
        ]

        mockDb.creditPurchase.findMany.mockResolvedValue(mockPurchases)

        const result = await repository.findSucceededByUserId('user-1')

        expect(result[0].id).toBe('purchase-recent')
        expect(result[1].id).toBe('purchase-old')
      })
    })

    describe('Performance', () => {
      it('devrait gérer un utilisateur avec beaucoup de purchases', async () => {
        const mockPurchases = Array.from({ length: 500 }, (_, i) => ({
          id: `purchase-${i}`,
          userId: 'user-1',
          stripePaymentIntentId: `pi_${i}`,
          bundleId: 'small',
          bundleName: 'Bundle Petit',
          minutes: 5,
          amount: 500,
          currency: 'eur',
          status: 'succeeded',
          creditsGranted: true,
          creditsGrantedAt: new Date(),
          metadata: null,
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        }))

        mockDb.creditPurchase.findMany.mockResolvedValue(mockPurchases)

        const result = await repository.findSucceededByUserId('user-1')

        expect(result).toHaveLength(500)
      })
    })
  })
})
