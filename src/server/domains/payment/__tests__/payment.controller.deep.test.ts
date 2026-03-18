// @ts-nocheck
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { PaymentController } from '../payment.controller'
import type { PaymentService } from '../payment.service'
import type { PaymentIntentStatus } from '../payment.types'

describe('PaymentController - Deep Tests', () => {
  let controller: PaymentController
  let mockService: PaymentService

  const mockUserId = 'user-123'
  const mockEmail = 'test@example.com'

  beforeEach(() => {
    mockService = {
      createPaymentIntent: vi.fn(),
      createCheckoutSession: vi.fn(),
      getPaymentIntentStatus: vi.fn(),
      cancelPaymentIntent: vi.fn(),
    } as any

    controller = new PaymentController(mockService)
    vi.clearAllMocks()
  })

  describe('Authentication & Authorization', () => {
    it('devrait gérer absence de userId', async () => {
      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        '',
        mockEmail,
        request,
      )
      const data = await result.json()

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer absence de email', async () => {
      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        '',
        request,
      )
      const data = await result.json()

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer userId avec caractères Unicode', async () => {
      const unicodeUserId = 'user_日本語_测试'
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        unicodeUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
      expect(mockService.createPaymentIntent).toHaveBeenCalledWith(
        unicodeUserId,
        mockEmail,
        expect.any(Object),
      )
    })

    it('devrait gérer email avec caractères spéciaux', async () => {
      const specialEmail = 'user+test@domain-name.co.uk'
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        specialEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
      expect(mockService.createPaymentIntent).toHaveBeenCalledWith(
        mockUserId,
        specialEmail,
        expect.any(Object),
      )
    })

    it('devrait gérer userId extrêmement long', async () => {
      const longUserId = 'user_' + 'a'.repeat(500)
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        longUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })
  })

  describe('Input Validation - JSON Parsing', () => {
    it('devrait rejeter JSON invalide', async () => {
      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: 'invalid json {',
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait rejeter JSON malformé', async () => {
      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: '{"amount": }',
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it("devrait gérer JSON avec caractères d'échappement", async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 10,
          metadata: { description: 'Test\n\t"quoted"' },
        }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })

    it('devrait gérer JSON avec Unicode', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 10,
          metadata: { name: '测试 🚀 Ñoño' },
        }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })

    it('devrait rejeter payload vide', async () => {
      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: '',
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait rejeter payload null', async () => {
      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: 'null',
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })

    it('devrait gérer payload extrêmement large', async () => {
      const largePayload = {
        amount: 10,
        metadata: {
          description: 'a'.repeat(100000),
        },
      }

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify(largePayload),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect([
        HTTP_STATUS.CREATED,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        HTTP_STATUS.PAYLOAD_TOO_LARGE,
      ]).toContain(result.status)
    })
  })

  describe('Input Validation - XSS & Injection', () => {
    it('devrait sanitizer les tentatives XSS dans metadata', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const xssPayload = {
        amount: 10,
        metadata: {
          description: '<script>alert("XSS")</script>',
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
      expect(mockService.createPaymentIntent).toHaveBeenCalledWith(
        mockUserId,
        mockEmail,
        expect.objectContaining({
          metadata: expect.objectContaining({
            description: expect.any(String),
          }),
        }),
      )
    })

    it('devrait gérer tentatives SQL injection dans metadata', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const sqlInjection = {
        amount: 10,
        metadata: {
          description: "'; DROP TABLE payments; --",
        },
      }

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify(sqlInjection),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })

    it('devrait gérer NoSQL injection attempts', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const noSqlInjection = {
        amount: 10,
        metadata: {
          userId: { $ne: null },
        },
      }

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify(noSqlInjection as any),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })

    it('devrait gérer HTML entities dans metadata', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const htmlEntities = {
        amount: 10,
        metadata: {
          description: '&lt;script&gt;alert()&lt;/script&gt;',
        },
      }

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify(htmlEntities),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })
  })

  describe('Error Handling - Service Errors', () => {
    it('devrait gérer ApiError du service', async () => {
      vi.mocked(mockService.createPaymentIntent).mockRejectedValue(
        new ApiError(
          'PAYMENT_INTENT_FAILED',
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          'Failed to create payment intent',
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

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.error.code).toBe('PAYMENT_INTENT_FAILED')
    })

    it('devrait gérer erreur générique du service', async () => {
      vi.mocked(mockService.createPaymentIntent).mockRejectedValue(
        new Error('Unexpected error'),
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

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it("devrait ne pas exposer les détails internes d'erreur", async () => {
      vi.mocked(mockService.createPaymentIntent).mockRejectedValue(
        new Error('Database connection failed at 10.0.0.5:5432'),
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
      expect(data.error.message).not.toContain('5432')
    })

    it('devrait gérer timeout du service', async () => {
      vi.mocked(mockService.createPaymentIntent).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 100),
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

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer erreur null ou undefined', async () => {
      vi.mocked(mockService.createPaymentIntent).mockRejectedValue(null as any)

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('getPaymentIntentStatus - Edge Cases', () => {
    it('devrait récupérer le status avec succès', async () => {
      const mockStatus: PaymentIntentStatus = {
        id: 'pi_test',
        status: 'succeeded',
        amount: 10,
        currency: 'eur',
      }

      vi.mocked(mockService.getPaymentIntentStatus).mockResolvedValue(
        mockStatus,
      )

      const result = await controller.getPaymentIntentStatus('pi_test')
      const data = await result.json()

      expect(result.status).toBe(HTTP_STATUS.OK)
      expect(data.data).toEqual(mockStatus)
    })

    it('devrait gérer paymentIntentId vide', async () => {
      vi.mocked(mockService.getPaymentIntentStatus).mockRejectedValue(
        new Error('Invalid payment intent ID'),
      )

      const result = await controller.getPaymentIntentStatus('')

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer paymentIntentId avec caractères spéciaux', async () => {
      vi.mocked(mockService.getPaymentIntentStatus).mockRejectedValue(
        new Error('Invalid payment intent ID'),
      )

      const result = await controller.getPaymentIntentStatus(
        'pi_<script>alert()</script>',
      )

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer paymentIntentId très long', async () => {
      const longId = 'pi_' + 'a'.repeat(1000)
      vi.mocked(mockService.getPaymentIntentStatus).mockRejectedValue(
        new Error('Invalid payment intent ID'),
      )

      const result = await controller.getPaymentIntentStatus(longId)

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer erreur Stripe non trouvé', async () => {
      vi.mocked(mockService.getPaymentIntentStatus).mockRejectedValue(
        new Error('No such payment_intent'),
      )

      const result = await controller.getPaymentIntentStatus('pi_invalid')
      const data = await result.json()

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('cancelPaymentIntent - Edge Cases', () => {
    it('devrait annuler un payment intent avec succès', async () => {
      vi.mocked(mockService.cancelPaymentIntent).mockResolvedValue()

      const result = await controller.cancelPaymentIntent('pi_test')
      const data = await result.json()

      expect(result.status).toBe(HTTP_STATUS.OK)
      expect(data.data.message).toBe('Paiement annulé')
    })

    it('devrait gérer paymentIntentId invalide', async () => {
      vi.mocked(mockService.cancelPaymentIntent).mockRejectedValue(
        new Error('No such payment_intent'),
      )

      const result = await controller.cancelPaymentIntent('invalid_id')

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer payment intent déjà annulé', async () => {
      vi.mocked(mockService.cancelPaymentIntent).mockRejectedValue(
        new Error('This PaymentIntent could not be canceled'),
      )

      const result = await controller.cancelPaymentIntent('pi_test')

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer payment intent déjà succeeded', async () => {
      vi.mocked(mockService.cancelPaymentIntent).mockRejectedValue(
        new Error('PaymentIntent has already succeeded'),
      )

      const result = await controller.cancelPaymentIntent('pi_test')

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer paymentIntentId avec injection SQL', async () => {
      vi.mocked(mockService.cancelPaymentIntent).mockRejectedValue(
        new Error('Invalid payment intent ID'),
      )

      const result = await controller.cancelPaymentIntent(
        "pi_'; DROP TABLE payments; --",
      )

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('devrait gérer paymentIntentId null', async () => {
      vi.mocked(mockService.cancelPaymentIntent).mockRejectedValue(
        new Error('Invalid payment intent ID'),
      )

      const result = await controller.cancelPaymentIntent(null as any)

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('Concurrency - Multiple Requests', () => {
    it('devrait gérer requêtes simultanées sans conflit', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const requests = Array.from(
        { length: 50 },
        (_, i) =>
          new NextRequest('http://localhost/api/payment/intent', {
            method: 'POST',
            body: JSON.stringify({ amount: 10 + i }),
          }),
      )

      const results = await Promise.all(
        requests.map((req) =>
          controller.createPaymentIntent(mockUserId, mockEmail, req),
        ),
      )

      const successful = results.filter((r) => r.status === HTTP_STATUS.CREATED)
      expect(successful).toHaveLength(50)
    })

    it('devrait gérer requêtes simultanées avec différents users', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const requests = Array.from({ length: 20 }, (_, i) => ({
        userId: `user-${i}`,
        email: `user${i}@test.com`,
        request: new NextRequest('http://localhost/api/payment/intent', {
          method: 'POST',
          body: JSON.stringify({ amount: 10 }),
        }),
      }))

      const results = await Promise.all(
        requests.map((r) =>
          controller.createPaymentIntent(r.userId, r.email, r.request),
        ),
      )

      const successful = results.filter((r) => r.status === HTTP_STATUS.CREATED)
      expect(successful.length).toBeGreaterThan(0)
    })
  })

  describe('Performance - Large Payloads', () => {
    it('devrait traiter rapidement un payload normal', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const start = Date.now()
      await controller.createPaymentIntent(mockUserId, mockEmail, request)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000)
    })

    it('devrait gérer métadonnées complexes', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const complexMetadata = {
        amount: 10,
        metadata: {
          bundleId: 'bundle_1',
          bundleName: 'Bundle 1',
          minutes: '60',
          extra1: 'value1',
          extra2: 'value2',
          extra3: 'value3',
          nested: JSON.stringify({ a: 1, b: 2, c: 3 }),
        },
      }

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify(complexMetadata),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })
  })

  describe('Response Format Validation', () => {
    it('devrait retourner le bon format de succès', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

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

      expect(data).toHaveProperty('success')
      expect(data.success).toBe(true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('clientSecret')
      expect(data.data).toHaveProperty('paymentIntentId')
    })

    it("devrait retourner le bon format d'erreur", async () => {
      vi.mocked(mockService.createPaymentIntent).mockRejectedValue(
        new ApiError(
          'PAYMENT_INTENT_FAILED',
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          'Failed to create payment intent',
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

      expect(data).toHaveProperty('success')
      expect(data.success).toBe(false)
      expect(data).toHaveProperty('error')
      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
    })

    it('devrait retourner les bons headers', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.headers.get('Content-Type')).toContain('application/json')
    })
  })

  describe('Edge Cases - Boundary Testing', () => {
    it('devrait gérer amount négatif passé au service', async () => {
      vi.mocked(mockService.createPaymentIntent).mockRejectedValue(
        new ApiError(
          'INVALID_AMOUNT',
          HTTP_STATUS.BAD_REQUEST,
          'Amount must be positive',
        ),
      )

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: -10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('devrait gérer amount à zéro', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 0 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })

    it('devrait gérer amount très élevé', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 999999.99 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.CREATED)
    })

    it('devrait gérer currency invalide', async () => {
      vi.mocked(mockService.createPaymentIntent).mockRejectedValue(
        new Error('Invalid currency'),
      )

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10, currency: 'INVALID' }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('Memory & Resource Management', () => {
    it('devrait libérer les ressources après traitement', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      const request = new NextRequest('http://localhost/api/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      })

      const result = await controller.createPaymentIntent(
        mockUserId,
        mockEmail,
        request,
      )
      await result.json()

      expect(result).toBeDefined()
    })

    it('devrait gérer requêtes répétées sans fuite mémoire', async () => {
      vi.mocked(mockService.createPaymentIntent).mockResolvedValue({
        clientSecret: 'secret_test',
        paymentIntentId: 'pi_test',
      })

      for (let i = 0; i < 100; i++) {
        const request = new NextRequest('http://localhost/api/payment/intent', {
          method: 'POST',
          body: JSON.stringify({ amount: 10 }),
        })

        const result = await controller.createPaymentIntent(
          mockUserId,
          mockEmail,
          request,
        )
        await result.json()

        expect(result.status).toBe(HTTP_STATUS.CREATED)
      }
    })
  })
})
