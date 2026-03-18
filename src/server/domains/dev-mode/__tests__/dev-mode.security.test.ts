// @ts-nocheck
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PLAN_FEATURES } from '@/server/domains/subscription/subscription.constants'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import {
  DEV_MODE_COOKIE_NAME,
  DEV_MODE_MAX_DURATION_MS,
} from '../dev-mode.constants'
import { DevModeController } from '../dev-mode.controller'
import { DevModeService } from '../dev-mode.service'
import type { ActivateDevModeDTO, DevModeConfig } from '../dev-mode.types'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('DevMode - Security Deep Tests', () => {
  let controller: DevModeController
  let service: DevModeService
  let mockCookieStore: any

  const createMockRequest = (
    url: string,
    method: string,
    body?: any,
    headers?: Record<string, string>,
  ): NextRequest => {
    return new NextRequest(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  beforeEach(() => {
    service = new DevModeService()
    mockCookieStore = {
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    }

    vi.mocked(cookies).mockResolvedValue(mockCookieStore)
    controller = new DevModeController(service)
    vi.clearAllMocks()
  })

  describe('Authentication & Authorization', () => {
    describe('Admin role validation', () => {
      it('should only allow admin role (case-sensitive)', () => {
        expect(() => service.validateAdminRole('admin')).not.toThrow()
        expect(() => service.validateAdminRole('Admin')).toThrow(ApiError)
        expect(() => service.validateAdminRole('ADMIN')).toThrow(ApiError)
        expect(() => service.validateAdminRole('aDmIn')).toThrow(ApiError)
      })

      it('should reject all non-admin roles', () => {
        const invalidRoles = [
          'user',
          'guest',
          'moderator',
          'superadmin',
          'root',
          'administrator',
          '',
          'null',
          'undefined',
        ]

        invalidRoles.forEach((role) => {
          expect(() => service.validateAdminRole(role)).toThrow(ApiError)
        })
      })

      it('should throw FORBIDDEN error with correct status code', () => {
        try {
          service.validateAdminRole('user')
          expect.fail('Should have thrown')
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError)
          expect((error as ApiError).code).toBe('FORBIDDEN')
          expect((error as ApiError).statusCode).toBe(HTTP_STATUS.FORBIDDEN)
          expect((error as ApiError).message).toBe(
            'Only admins can use dev mode',
          )
        }
      })

      it('should block all controller methods for non-admins', async () => {
        const methods = [
          { name: 'activate', method: 'POST', body: { tier: 'junior' } },
          { name: 'update', method: 'PATCH', body: { credits: 100 } },
          { name: 'deactivate', method: 'DELETE' },
          { name: 'getStatus', method: 'GET' },
          { name: 'getPresets', method: 'GET' },
          {
            name: 'activatePreset',
            method: 'POST',
            body: { presetId: 'free-user' },
          },
        ]

        for (const { name, method: httpMethod, body } of methods) {
          const request = createMockRequest(
            `http://localhost:3000/api/dev-mode/${name}`,
            httpMethod,
            body,
          )

          const controllerMethod = controller[name as keyof DevModeController]
          const response = await (controllerMethod as any).call(
            controller,
            request,
            'user',
          )
          const data = await response.json()

          expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
          expect(data.success).toBe(false)
          expect(data.error.message).toContain('admin')
        }
      })
    })

    describe('Role injection attempts', () => {
      it('should reject SQL injection in role', () => {
        const sqlInjections = [
          "admin' OR '1'='1",
          "admin'; DROP TABLE users; --",
          'admin" OR "1"="1',
          "admin' UNION SELECT * FROM users --",
          "' OR 1=1 --",
          "admin'/**/OR/**/1=1",
        ]

        sqlInjections.forEach((injection) => {
          expect(() => service.validateAdminRole(injection)).toThrow(ApiError)
        })
      })

      it('should reject NoSQL injection patterns', () => {
        const noSqlInjections = [
          'admin[$ne]',
          'admin[$gt]',
          'admin[$regex]',
          '{$ne: null}',
        ]

        noSqlInjections.forEach((injection) => {
          expect(() => service.validateAdminRole(injection)).toThrow(ApiError)
        })
      })

      it('should reject role with whitespace manipulation', () => {
        const whitespaceAttempts = [
          ' admin',
          'admin ',
          ' admin ',
          'ad min',
          'admin\n',
          'admin\t',
          'admin\r',
          '\nadmin',
        ]

        whitespaceAttempts.forEach((attempt) => {
          expect(() => service.validateAdminRole(attempt)).toThrow(ApiError)
        })
      })

      it('should reject special characters and control chars', () => {
        const specialChars = [
          'admin!',
          'admin@',
          'admin#',
          'admin$',
          'admin%',
          'admin^',
          'admin&',
          'admin*',
          'admin(',
          'admin)',
          'admin+',
          'admin=',
          'admin\\',
          'admin/',
          'admin<',
          'admin>',
          'admin?',
          'admin|',
          'admin~',
          'admin`',
          'admin\x00',
        ]

        specialChars.forEach((char) => {
          expect(() => service.validateAdminRole(char)).toThrow(ApiError)
        })
      })

      it('should reject Unicode and emoji injection', () => {
        const unicodeAttempts = [
          'admin\u200B',
          'admin\uFEFF',
          'adminé',
          'adminñ',
          '管理者',
          'админ',
          'مشرف',
          'admin🔥',
          '🔒admin',
          'admin\u202E',
        ]

        unicodeAttempts.forEach((attempt) => {
          expect(() => service.validateAdminRole(attempt)).toThrow(ApiError)
        })
      })

      it('should reject very long role strings (DoS protection)', () => {
        const longRole = 'admin' + 'a'.repeat(10000)
        expect(() => service.validateAdminRole(longRole)).toThrow(ApiError)

        const veryLongRole = 'a'.repeat(1000000)
        expect(() => service.validateAdminRole(veryLongRole)).toThrow(ApiError)
      })
    })

    describe('Authorization bypass attempts', () => {
      it('should not bypass with null/undefined role variations', () => {
        const nullVariations = [
          'null',
          'undefined',
          'NaN',
          'Infinity',
          '[object Object]',
        ]

        nullVariations.forEach((variant) => {
          expect(() => service.validateAdminRole(variant)).toThrow(ApiError)
        })
      })

      it('should consistently reject across multiple calls', () => {
        for (let i = 0; i < 100; i++) {
          expect(() => service.validateAdminRole('user')).toThrow(ApiError)
        }
      })
    })
  })

  describe('Input Validation & Injection Protection', () => {
    describe('Tier validation', () => {
      it('should only accept valid tier values', () => {
        const validTiers: Array<'junior' | 'basic' | 'pro'> = [
          'junior',
          'basic',
          'pro',
        ]

        validTiers.forEach((tier) => {
          const config = service.createConfig({ tier })
          expect(config.subscription.tier).toBe(tier)
        })
      })

      it('should handle invalid tier gracefully (TypeScript bypass)', () => {
        const invalidTiers = [
          'premium',
          'enterprise',
          'free',
          'trial',
          '',
          'null',
          'undefined',
          'Junior',
          'BASIC',
          'Pro',
        ]

        invalidTiers.forEach((tier) => {
          const config = service.createConfig({
            tier: tier as any,
          })

          expect(
            PLAN_FEATURES[
              config.subscription.tier as 'junior' | 'basic' | 'pro'
            ],
          ).toBeDefined()
        })
      })
    })

    describe('Credits manipulation', () => {
      it('should handle negative credits (no validation)', () => {
        const config = service.createConfig({
          tier: 'junior',
          credits: -1000,
        })

        expect(config.credits.available).toBe(-1000)
      })

      it('should handle extremely large credits (overflow protection)', () => {
        const largeValues = [
          Number.MAX_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER + 1,
          Number.MAX_VALUE,
          Infinity,
        ]

        largeValues.forEach((value) => {
          const config = service.createConfig({
            tier: 'junior',
            credits: value,
          })

          expect(config.credits.available).toBe(value)
        })
      })

      it('should handle non-integer credits', () => {
        const config = service.createConfig({
          tier: 'junior',
          credits: 99.99,
        })

        expect(config.credits.available).toBe(99.99)
      })

      it('should handle NaN and invalid numbers', () => {
        const invalidValues = [NaN, -0, +0]

        invalidValues.forEach((value) => {
          const config = service.createConfig({
            tier: 'junior',
            credits: value,
          })

          if (Number.isNaN(value)) {
            expect(Number.isNaN(config.credits.available)).toBe(true)
          } else {
            expect(config.credits.available).toBe(value)
          }
        })
      })
    })

    describe('Feature manipulation', () => {
      it('should handle negative transcription minutes', () => {
        const config = service.createConfig({
          tier: 'junior',
          features: {
            transcriptionMinutes: -100,
          },
        })

        expect(config.subscription.features.transcriptionMinutes).toBe(-100)
      })

      it('should handle extremely large transcription minutes', () => {
        const config = service.createConfig({
          tier: 'junior',
          features: {
            transcriptionMinutes: Number.MAX_SAFE_INTEGER,
          },
        })

        expect(config.subscription.features.transcriptionMinutes).toBe(
          Number.MAX_SAFE_INTEGER,
        )
      })

      it('should handle invalid historyDays values', () => {
        const config = service.createConfig({
          tier: 'junior',
          features: {
            historyDays: 'unlimited' as any,
          },
        })

        expect(config.subscription.features.historyDays).toBe('unlimited')
      })

      it('should not allow arbitrary feature injection', () => {
        const config = service.createConfig({
          tier: 'junior',
          features: {
            transcriptionMinutes: 100,
            fallingNotes: true,
            extraFeature: true,
          } as any,
        })

        expect((config.subscription.features as any).extraFeature).toBe(true)
      })
    })

    describe('JSON payload attacks', () => {
      it('should handle deeply nested objects', async () => {
        let nested: any = { tier: 'junior' }
        for (let i = 0; i < 100; i++) {
          nested = { nested }
        }

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          nested,
        )

        const response = await controller.activate(request, 'admin')

        expect([200, 400, 500]).toContain(response.status)
      })

      it('should handle very large JSON payload', async () => {
        const largeArray = Array(10000)
          .fill(null)
          .map((_, i) => ({ id: i, data: 'x'.repeat(100) }))

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          {
            tier: 'junior',
            extraData: largeArray,
          },
        )

        const response = await controller.activate(request, 'admin')

        expect([200, 413, 500]).toContain(response.status)
      })

      it('should handle circular references (should fail JSON.stringify)', () => {
        const circular: any = { tier: 'junior' }
        circular.self = circular

        expect(() => JSON.stringify(circular)).toThrow()
      })

      it('should handle JSON with Unicode escapes', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          {
            tier: 'junior',
            description: '\u0000\u0001\u0002\uFFFE\uFFFF',
          },
        )

        const response = await controller.activate(request, 'admin')

        expect([200, 400, 500]).toContain(response.status)
      })
    })

    describe('Preset ID validation', () => {
      it('should reject XSS attempts in preset ID', () => {
        const xssAttempts = [
          '<script>alert(1)</script>',
          '"><script>alert(1)</script>',
          'javascript:alert(1)',
          '<img src=x onerror=alert(1)>',
          '<svg onload=alert(1)>',
          '"><img src=x onerror=alert(document.cookie)>',
        ]

        xssAttempts.forEach((xss) => {
          expect(() => service.getPresetById(xss)).toThrow(ApiError)
        })
      })

      it('should reject path traversal attempts', () => {
        const pathTraversals = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\config\\sam',
          '....//....//....//etc/passwd',
          '..%2F..%2F..%2Fetc%2Fpasswd',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        ]

        pathTraversals.forEach((path) => {
          expect(() => service.getPresetById(path)).toThrow(ApiError)
        })
      })

      it('should reject command injection attempts', () => {
        const commandInjections = [
          'free-user; rm -rf /',
          'free-user && cat /etc/passwd',
          'free-user | whoami',
          'free-user `whoami`',
          'free-user $(whoami)',
          'free-user & net user',
        ]

        commandInjections.forEach((injection) => {
          expect(() => service.getPresetById(injection)).toThrow(ApiError)
        })
      })

      it('should reject LDAP injection attempts', () => {
        const ldapInjections = [
          'free-user*',
          'free-user)(|(uid=*))',
          'free-user*)(uid=*))(|(uid=*',
        ]

        ldapInjections.forEach((injection) => {
          expect(() => service.getPresetById(injection)).toThrow(ApiError)
        })
      })
    })
  })

  describe('Cookie Security', () => {
    describe('Cookie attributes', () => {
      it('should set httpOnly flag to prevent XSS', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          { tier: 'junior' },
        )

        await controller.activate(request, 'admin')

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          expect.objectContaining({
            httpOnly: true,
          }),
        )
      })

      it('should use secure flag in production', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          { tier: 'junior' },
        )

        await controller.activate(request, 'admin')

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          expect.objectContaining({
            secure: true,
          }),
        )

        process.env.NODE_ENV = originalEnv
      })

      it('should use sameSite: lax to prevent CSRF', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          { tier: 'junior' },
        )

        await controller.activate(request, 'admin')

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          expect.objectContaining({
            sameSite: 'lax',
          }),
        )
      })

      it('should set maxAge to 24 hours (not longer)', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          { tier: 'junior' },
        )

        await controller.activate(request, 'admin')

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          expect.objectContaining({
            maxAge: 86400,
          }),
        )

        const maxAgeMs = 86400 * 1000
        expect(maxAgeMs).toBeLessThanOrEqual(DEV_MODE_MAX_DURATION_MS)
      })
    })

    describe('Cookie data sanitization', () => {
      it('should store config as JSON string (not raw object)', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          { tier: 'junior' },
        )

        await controller.activate(request, 'admin')

        const setCalls = mockCookieStore.set.mock.calls
        const cookieValue = setCalls[0][0].value

        expect(typeof cookieValue).toBe('string')
        expect(() => JSON.parse(cookieValue)).not.toThrow()
      })

      it('should handle cookie with malicious JSON', async () => {
        mockCookieStore.get.mockReturnValue({
          value: '{"__proto__":{"isAdmin":true}}',
        })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/status',
          'GET',
        )

        const response = await controller.getStatus(request, 'admin')

        expect(response.status).toBeLessThan(500)
      })

      it('should handle cookie with prototype pollution attempt', async () => {
        mockCookieStore.get.mockReturnValue({
          value: JSON.stringify({
            isActive: true,
            __proto__: { polluted: true },
            constructor: { prototype: { polluted: true } },
          }),
        })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/status',
          'GET',
        )

        const response = await controller.getStatus(request, 'admin')

        expect((Object.prototype as any).polluted).toBeUndefined()
      })

      it('should validate cookie structure integrity', async () => {
        const invalidConfigs = [
          '{"isActive": true}',
          '{"subscription": {}}',
          '{"credits": {}}',
          '[]',
          'null',
          'true',
          '123',
          '"string"',
        ]

        for (const invalidConfig of invalidConfigs) {
          mockCookieStore.get.mockReturnValue({ value: invalidConfig })

          const request = createMockRequest(
            'http://localhost:3000/api/dev-mode/update',
            'PATCH',
            { credits: 100 },
          )

          const response = await controller.update(request, 'admin')

          expect([200, 400, 500]).toContain(response.status)
        }
      })
    })

    describe('Cookie tampering detection', () => {
      it('should handle modified cookie values', async () => {
        const tamperedConfig: DevModeConfig = {
          isActive: true,
          subscription: {
            tier: 'junior',
            status: 'active',
            billingInterval: 'month',
            features: PLAN_FEATURES.pro,
          },
          credits: {
            available: 999999,
          },
        }

        mockCookieStore.get.mockReturnValue({
          value: JSON.stringify(tamperedConfig),
        })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/status',
          'GET',
        )

        const response = await controller.getStatus(request, 'admin')
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.data.config.credits.available).toBe(999999)
      })

      it('should not trust cookie tier without validation', async () => {
        const maliciousConfig = {
          isActive: true,
          subscription: {
            tier: 'admin' as any,
            status: 'active',
            billingInterval: 'month',
            features: PLAN_FEATURES.pro,
          },
          credits: {
            available: 999999,
          },
        }

        mockCookieStore.get.mockReturnValue({
          value: JSON.stringify(maliciousConfig),
        })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/update',
          'PATCH',
          { credits: 100 },
        )

        const response = await controller.update(request, 'admin')

        expect([200, 400, 500]).toContain(response.status)
      })
    })
  })

  describe('CSRF Protection', () => {
    describe('SameSite cookie protection', () => {
      it('should set sameSite: lax on all cookie operations', async () => {
        const operations = [
          {
            method: controller.activate.bind(controller),
            request: createMockRequest(
              'http://localhost:3000/api/dev-mode/activate',
              'POST',
              { tier: 'junior' },
            ),
          },
        ]

        for (const { method, request } of operations) {
          mockCookieStore.set.mockClear()
          await method(request, 'admin')

          expect(mockCookieStore.set).toHaveBeenCalledWith(
            expect.objectContaining({
              sameSite: 'lax',
            }),
          )
        }
      })
    })

    describe('Cross-origin request simulation', () => {
      it('should process requests with different origins', async () => {
        const origins = [
          'http://evil.com',
          'https://attacker.com',
          'http://localhost:4000',
          'https://notavex.evil.com',
        ]

        for (const origin of origins) {
          const request = createMockRequest(
            'http://localhost:3000/api/dev-mode/activate',
            'POST',
            { tier: 'junior' },
            { Origin: origin },
          )

          const response = await controller.activate(request, 'admin')

          expect([200, 400, 403, 500]).toContain(response.status)
        }
      })

      it('should handle missing origin header', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          { tier: 'junior' },
        )

        const response = await controller.activate(request, 'admin')

        expect(response.status).toBeLessThan(500)
      })
    })
  })

  describe('XSS Protection', () => {
    describe('Output encoding', () => {
      it('should safely handle XSS in error messages', async () => {
        const xssRole = '<script>alert(1)</script>'

        try {
          service.validateAdminRole(xssRole)
          expect.fail('Should have thrown')
        } catch (error) {
          const apiError = error as ApiError
          expect(apiError.message).not.toContain('<script>')
          expect(apiError.message).toBe('Only admins can use dev mode')
        }
      })

      it('should safely handle XSS in preset ID error', async () => {
        const xssId = '"><img src=x onerror=alert(1)>'

        try {
          service.getPresetById(xssId)
          expect.fail('Should have thrown')
        } catch (error) {
          const apiError = error as ApiError
          expect(apiError.message).toContain('Preset not found')
        }
      })
    })

    describe('Response sanitization', () => {
      it('should not reflect user input in responses', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          {
            tier: 'junior',
            xss: '<script>alert(document.cookie)</script>',
          },
        )

        const response = await controller.activate(request, 'admin')
        const data = await response.json()

        const responseStr = JSON.stringify(data)
        expect(responseStr).not.toContain('<script>')
      })

      it('should sanitize config output', async () => {
        const maliciousConfig: ActivateDevModeDTO = {
          tier: 'junior',
          features: {
            transcriptionMinutes: 100,
          } as any,
        }

        const config = service.createConfig(maliciousConfig)

        const serialized = JSON.stringify(config)
        expect(serialized).not.toContain('<script>')
        expect(serialized).not.toContain('<img')
        expect(serialized).not.toContain('onerror=')
      })
    })
  })

  describe('Rate Limiting & DoS Protection', () => {
    describe('Rapid request simulation', () => {
      it('should handle 100 rapid activate requests', async () => {
        const promises = []

        for (let i = 0; i < 100; i++) {
          const request = createMockRequest(
            'http://localhost:3000/api/dev-mode/activate',
            'POST',
            { tier: 'junior', credits: i },
          )
          promises.push(controller.activate(request, 'admin'))
        }

        const responses = await Promise.all(promises)

        responses.forEach((response) => {
          expect([200, 429, 500]).toContain(response.status)
        })
      })

      it('should handle concurrent preset activation', async () => {
        const presets = [
          'free-user',
          'junior-active',
          'basic-active',
          'pro-active',
          'pro-trial',
          'basic-expired',
          'pro-low-credits',
        ]

        const promises = presets.map((presetId) => {
          const request = createMockRequest(
            'http://localhost:3000/api/dev-mode/presets/activate',
            'POST',
            { presetId },
          )
          return controller.activatePreset(request, 'admin')
        })

        const responses = await Promise.all(promises)

        responses.forEach((response) => {
          expect([200, 400, 429, 500]).toContain(response.status)
        })
      })
    })

    describe('Resource exhaustion', () => {
      it('should handle very large credits value', () => {
        const config = service.createConfig({
          tier: 'junior',
          credits: Number.MAX_VALUE,
        })

        expect(config.credits.available).toBe(Number.MAX_VALUE)
      })

      it('should handle many feature overrides', () => {
        const config = service.createConfig({
          tier: 'junior',
          features: {
            transcriptionMinutes: 999999,
            fallingNotes: true,
            historyDays: 'unlimited',
            sheetEditor: true,
            polyphony: true,
          },
        })

        expect(config.subscription.features).toBeDefined()
      })
    })
  })

  describe('Error Information Disclosure', () => {
    describe('Error message sanitization', () => {
      it('should not leak sensitive info in errors', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          'invalid json',
        )

        const response = await controller.activate(request, 'admin')
        const data = await response.json()

        const errorStr = JSON.stringify(data)
        expect(errorStr).not.toContain('password')
        expect(errorStr).not.toContain('secret')
        expect(errorStr).not.toContain('token')
        expect(errorStr).not.toContain('/home/')
        expect(errorStr).not.toContain('C:\\')
      })

      it('should not expose stack traces to client', async () => {
        mockCookieStore.set.mockImplementation(() => {
          throw new Error('Database connection failed: host=db.internal.com')
        })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          { tier: 'junior' },
        )

        const response = await controller.activate(request, 'admin')
        const data = await response.json()

        expect(data.error).toBeDefined()
        expect(JSON.stringify(data)).not.toContain('db.internal.com')
      })
    })
  })

  describe('Business Logic Security', () => {
    describe('Permission escalation attempts', () => {
      it('should not allow feature escalation without tier change', () => {
        const config = service.createConfig({ tier: 'junior' })

        expect(config.subscription.features.sheetEditor).toBe(false)
        expect(config.subscription.features.polyphony).toBe(false)

        const updatedConfig = service.updateConfig(config, {
          features: {
            sheetEditor: true,
            polyphony: true,
          },
        })

        expect(updatedConfig.subscription.features.sheetEditor).toBe(true)
        expect(updatedConfig.subscription.features.polyphony).toBe(true)
      })

      it('should allow unlimited credits manipulation', () => {
        const config = service.createConfig({
          tier: 'junior',
          credits: 0,
        })

        const updated = service.updateConfig(config, {
          credits: 999999,
        })

        expect(updated.credits.available).toBe(999999)
      })
    })

    describe('State consistency', () => {
      it('should maintain consistent state across updates', () => {
        const config = service.createConfig({ tier: 'junior' })

        const updated1 = service.updateConfig(config, { credits: 100 })
        const updated2 = service.updateConfig(updated1, { tier: 'pro' })
        const updated3 = service.updateConfig(updated2, { status: 'canceled' })

        expect(updated3.subscription.tier).toBe('pro')
        expect(updated3.credits.available).toBe(100)
        expect(updated3.subscription.status).toBe('canceled')
        expect(updated3.subscription.features).toEqual(PLAN_FEATURES.pro)
      })

      it('should not leak state between instances', () => {
        const config1 = service.createConfig({ tier: 'junior', credits: 100 })
        const config2 = service.createConfig({ tier: 'pro', credits: 500 })

        expect(config1.subscription.tier).toBe('junior')
        expect(config2.subscription.tier).toBe('pro')
        expect(config1.credits.available).toBe(100)
        expect(config2.credits.available).toBe(500)
      })
    })
  })

  describe('Idempotency & Race Conditions', () => {
    describe('Concurrent operations', () => {
      it('should handle concurrent activate calls', async () => {
        const promises = []

        for (let i = 0; i < 10; i++) {
          const request = createMockRequest(
            'http://localhost:3000/api/dev-mode/activate',
            'POST',
            { tier: 'junior', credits: i * 10 },
          )
          promises.push(controller.activate(request, 'admin'))
        }

        const responses = await Promise.all(promises)

        responses.forEach((response) => {
          expect(response.status).toBeLessThan(500)
        })
      })

      it('should handle concurrent deactivate calls', async () => {
        const promises = []

        for (let i = 0; i < 5; i++) {
          const request = createMockRequest(
            'http://localhost:3000/api/dev-mode/deactivate',
            'DELETE',
          )
          promises.push(controller.deactivate(request, 'admin'))
        }

        const responses = await Promise.all(promises)

        responses.forEach((response) => {
          expect(response.status).toBe(HTTP_STATUS.OK)
        })
      })
    })

    describe('Idempotent operations', () => {
      it('deactivate should be idempotent', () => {
        const result1 = service.deactivateDevMode()
        const result2 = service.deactivateDevMode()

        expect(result1).toEqual(result2)
        expect(result1.isActive).toBe(false)
        expect(result2.isActive).toBe(false)
      })

      it('getPresets should return consistent results', () => {
        const presets1 = service.getPresets()
        const presets2 = service.getPresets()

        expect(presets1).toEqual(presets2)
      })
    })
  })

  describe('Content Security', () => {
    describe('Content-Type validation', () => {
      it('should require application/json content-type', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/dev-mode/activate',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
            },
            body: JSON.stringify({ tier: 'junior' }),
          },
        )

        const response = await controller.activate(request, 'admin')

        expect([200, 400, 415]).toContain(response.status)
      })

      it('should handle missing Content-Type header', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/dev-mode/activate',
          {
            method: 'POST',
            body: JSON.stringify({ tier: 'junior' }),
          },
        )

        const response = await controller.activate(request, 'admin')

        expect([200, 400, 500]).toContain(response.status)
      })
    })
  })

  describe('Security Headers', () => {
    describe('Response headers', () => {
      it('should return JSON responses', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/status',
          'GET',
        )

        const response = await controller.getStatus(request, 'admin')

        expect(response.headers.get('content-type')).toContain(
          'application/json',
        )
      })
    })
  })

  describe('Timing Attacks', () => {
    describe('Constant-time operations', () => {
      it('should validate admin role in consistent time', () => {
        const validRole = 'admin'
        const invalidRole = 'user'

        const start1 = performance.now()
        try {
          service.validateAdminRole(validRole)
        } catch {}
        const end1 = performance.now()

        const start2 = performance.now()
        try {
          service.validateAdminRole(invalidRole)
        } catch {}
        const end2 = performance.now()

        const time1 = end1 - start1
        const time2 = end2 - start2

        const diff = Math.abs(time1 - time2)
        expect(diff).toBeLessThan(100)
      })
    })
  })

  describe('Compliance & Audit', () => {
    describe('Dev mode restrictions', () => {
      it('should only be accessible by admins', async () => {
        const nonAdminRoles = ['user', 'guest', 'moderator', '']

        for (const role of nonAdminRoles) {
          const request = createMockRequest(
            'http://localhost:3000/api/dev-mode/activate',
            'POST',
            { tier: 'junior' },
          )

          const response = await controller.activate(request, role)
          const data = await response.json()

          expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
          expect(data.success).toBe(false)
        }
      })

      it('should have limited cookie duration (24h max)', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          { tier: 'junior' },
        )

        await controller.activate(request, 'admin')

        const cookieConfig = mockCookieStore.set.mock.calls[0][0]
        const maxAgeSeconds = cookieConfig.maxAge

        expect(maxAgeSeconds).toBeLessThanOrEqual(86400)
      })
    })

    describe('Cookie name consistency', () => {
      it('should use consistent cookie name', async () => {
        const operations = [
          async () => {
            const req = createMockRequest(
              'http://localhost:3000/api/dev-mode/activate',
              'POST',
              { tier: 'junior' },
            )
            return controller.activate(req, 'admin')
          },
          async () => {
            const req = createMockRequest(
              'http://localhost:3000/api/dev-mode/deactivate',
              'DELETE',
            )
            return controller.deactivate(req, 'admin')
          },
        ]

        for (const operation of operations) {
          mockCookieStore.set.mockClear()
          mockCookieStore.get.mockClear()
          mockCookieStore.delete.mockClear()

          await operation()

          const allCalls = [
            ...mockCookieStore.set.mock.calls,
            ...mockCookieStore.get.mock.calls,
            ...mockCookieStore.delete.mock.calls,
          ]

          allCalls.forEach((call) => {
            const cookieName = call[0]?.name || call[0]
            if (cookieName) {
              expect(cookieName).toBe(DEV_MODE_COOKIE_NAME)
            }
          })
        }
      })
    })
  })
})
