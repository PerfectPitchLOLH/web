// @ts-nocheck
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { DevModeController } from '../dev-mode.controller'
import { DevModeService } from '../dev-mode.service'

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
          { name: 'deactivate', method: 'DELETE' },
          { name: 'getStatus', method: 'GET' },
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
})
