import { NextRequest } from 'next/server'
import type { Mocked } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { CreditController } from '../credit.controller'
import { CreditService } from '../credit.service'

vi.mock('../credit.service')
vi.mock('@/server/lib/database', () => ({ db: {} }))

describe('CreditController', () => {
  let controller: CreditController
  let mockService: Mocked<CreditService>

  beforeEach(() => {
    mockService = new CreditService({} as any) as Mocked<CreditService>
    controller = new CreditController(mockService)
    vi.clearAllMocks()
  })

  describe('getUserCredits', () => {
    it("devrait retourner le solde de l'utilisateur", async () => {
      const mockBalance = {
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
      }

      mockService.getUserCreditsBalance = vi.fn().mockResolvedValue(mockBalance)

      const response = await controller.getUserCredits('user-1')
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockBalance)
    })

    it('devrait gérer les erreurs', async () => {
      const error = new ApiError(
        'USER_CREDITS_NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Crédits non trouvés',
      )

      mockService.getUserCreditsBalance = vi.fn().mockRejectedValue(error)

      const response = await controller.getUserCredits('user-1')
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(data.success).toBe(false)
      expect(data.error?.message).toBe('Crédits non trouvés')
    })
  })

  describe('purchaseBundle', () => {
    it('devrait acheter un bundle', async () => {
      const mockUpdatedCredits = {
        userId: 'user-1',
        subscriptionMinutes: 20,
        purchasedMinutes: 25,
        usedThisMonth: 5,
        resetDate: new Date('2026-04-01'),
        updatedAt: new Date(),
      }

      mockService.purchaseBundle = vi.fn().mockResolvedValue(mockUpdatedCredits)

      const request = new NextRequest('http://localhost/api/credits', {
        method: 'POST',
        body: JSON.stringify({ bundleId: 'medium' }),
      })

      const response = await controller.purchaseBundle('user-1', request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.success).toBe(true)
      expect(data.data.purchasedMinutes).toBe(25)
    })

    it('devrait gérer bundle invalide', async () => {
      const error = new ApiError(
        'INVALID_BUNDLE',
        HTTP_STATUS.BAD_REQUEST,
        'Bundle invalide',
      )

      mockService.purchaseBundle = vi.fn().mockRejectedValue(error)

      const request = new NextRequest('http://localhost/api/credits', {
        method: 'POST',
        body: JSON.stringify({ bundleId: 'invalid' }),
      })

      const response = await controller.purchaseBundle('user-1', request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })
  })

  describe('getTransactionHistory', () => {
    it("devrait retourner l'historique avec pagination", async () => {
      const mockHistory = {
        transactions: [
          {
            id: 1,
            type: 'purchase' as const,
            amount: 15,
            balanceAfter: 45,
            description: 'Achat',
            createdAt: '2026-03-05T10:00:00Z',
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        },
      }

      mockService.getTransactionHistory = vi.fn().mockResolvedValue(mockHistory)

      const request = new NextRequest(
        'http://localhost/api/credits/history?page=1&limit=10',
      )

      const response = await controller.getTransactionHistory('user-1', request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.transactions).toHaveLength(1)
      expect(data.data.pagination.total).toBe(1)
    })

    it('devrait gérer les paramètres par défaut', async () => {
      const mockHistory = {
        transactions: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0,
        },
      }

      mockService.getTransactionHistory = vi.fn().mockResolvedValue(mockHistory)

      const request = new NextRequest('http://localhost/api/credits/history')

      await controller.getTransactionHistory('user-1', request)

      expect(mockService.getTransactionHistory).toHaveBeenCalledWith('user-1', {
        page: undefined,
        limit: undefined,
        type: undefined,
      })
    })

    it('devrait filtrer par type', async () => {
      const mockHistory = {
        transactions: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0,
        },
      }

      mockService.getTransactionHistory = vi.fn().mockResolvedValue(mockHistory)

      const request = new NextRequest(
        'http://localhost/api/credits/history?type=purchase',
      )

      await controller.getTransactionHistory('user-1', request)

      expect(mockService.getTransactionHistory).toHaveBeenCalledWith('user-1', {
        type: 'purchase',
        page: undefined,
        limit: undefined,
      })
    })
  })

  describe('getBundles', () => {
    const mockBundles = [
      {
        id: 'small',
        name: 'Petit',
        minutes: 5,
        price: 4.99,
        pricePerMinute: 0.998,
      },
      {
        id: 'medium',
        name: 'Moyen',
        minutes: 15,
        price: 12.99,
        pricePerMinute: 0.866,
        discountPercent: 13,
      },
      {
        id: 'large',
        name: 'Grand',
        minutes: 30,
        price: 22.99,
        pricePerMinute: 0.766,
        discountPercent: 23,
        bestValue: true,
      },
    ]

    it('devrait retourner la liste des bundles', async () => {
      mockService.getBundles = vi.fn().mockReturnValue(mockBundles)

      const response = await controller.getBundles()
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(3)
      expect(data.data[0]).toHaveProperty('id')
      expect(data.data[0]).toHaveProperty('name')
      expect(data.data[0]).toHaveProperty('minutes')
      expect(data.data[0]).toHaveProperty('price')
    })

    it('devrait inclure le meilleur bundle', async () => {
      mockService.getBundles = vi.fn().mockReturnValue(mockBundles)

      const response = await controller.getBundles()
      const data = await response.json()

      const bestValueBundle = data.data.find((b: any) => b.bestValue === true)
      expect(bestValueBundle).toBeDefined()
      expect(bestValueBundle.id).toBe('large')
    })
  })
})
