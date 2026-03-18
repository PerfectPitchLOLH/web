// @ts-nocheck
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { DEV_MODE_COOKIE_NAME } from '../dev-mode.constants'
import { DevModeController } from '../dev-mode.controller'
import { DevModeService } from '../dev-mode.service'
import type { ActivateDevModeDTO, DevModeConfig } from '../dev-mode.types'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('DevModeController - Deep Tests', () => {
  let controller: DevModeController
  let mockService: DevModeService
  let mockCookieStore: any

  const createMockRequest = (
    url: string,
    method: string,
    body?: any,
  ): NextRequest => {
    return new NextRequest(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Agent/1.0',
        'X-Forwarded-For': '127.0.0.1',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  const mockConfig: DevModeConfig = {
    isActive: true,
    subscription: {
      tier: 'pro',
      status: 'active',
      billingInterval: 'month',
      features: {
        transcriptionMinutes: 50,
        fallingNotes: true,
        historyDays: 'unlimited',
        sheetEditor: true,
        polyphony: true,
      },
    },
    credits: {
      available: 100,
    },
  }

  beforeEach(() => {
    mockService = {
      validateAdminRole: vi.fn(),
      createConfig: vi.fn(),
      updateConfig: vi.fn(),
      deactivateDevMode: vi.fn(),
      getPresets: vi.fn(),
      getPresetById: vi.fn(),
    } as any

    mockCookieStore = {
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    }

    vi.mocked(cookies).mockResolvedValue(mockCookieStore)

    controller = new DevModeController(mockService)
    vi.clearAllMocks()
  })

  describe('activate', () => {
    describe('Success cases - All tiers', () => {
      it('should activate dev mode with junior tier', async () => {
        const requestBody: ActivateDevModeDTO = {
          tier: 'junior',
        }

        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        const response = await controller.activate(request, 'admin')
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
        expect(data.data.config).toEqual(mockConfig)
        expect(mockService.validateAdminRole).toHaveBeenCalledWith('admin')
        expect(mockService.createConfig).toHaveBeenCalledWith(requestBody)
      })

      it('should activate dev mode with basic tier', async () => {
        const requestBody: ActivateDevModeDTO = {
          tier: 'basic',
          status: 'trialing',
          credits: 200,
        }

        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        const response = await controller.activate(request, 'admin')
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
      })

      it('should activate dev mode with pro tier', async () => {
        const requestBody: ActivateDevModeDTO = {
          tier: 'pro',
          billingInterval: 'year',
        }

        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        const response = await controller.activate(request, 'admin')

        expect(response.status).toBe(HTTP_STATUS.OK)
      })
    })

    describe('Success cases - Cookie management', () => {
      it('should set cookie with correct structure', async () => {
        const requestBody: ActivateDevModeDTO = {
          tier: 'pro',
        }

        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        await controller.activate(request, 'admin')

        expect(mockCookieStore.set).toHaveBeenCalledWith({
          name: DEV_MODE_COOKIE_NAME,
          value: JSON.stringify(mockConfig),
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
        })
      })

      it('should set secure cookie in production', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        const requestBody: ActivateDevModeDTO = {
          tier: 'pro',
        }

        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        await controller.activate(request, 'admin')

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          expect.objectContaining({
            secure: true,
          }),
        )

        process.env.NODE_ENV = originalEnv
      })

      it('should set non-secure cookie in development', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        const requestBody: ActivateDevModeDTO = {
          tier: 'pro',
        }

        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        await controller.activate(request, 'admin')

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          expect.objectContaining({
            secure: false,
          }),
        )

        process.env.NODE_ENV = originalEnv
      })

      it('should set cookie with 24 hour maxAge', async () => {
        const requestBody: ActivateDevModeDTO = {
          tier: 'pro',
        }

        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        await controller.activate(request, 'admin')

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          expect.objectContaining({
            maxAge: 86400,
          }),
        )
      })
    })

    describe('Authorization failures', () => {
      it('should reject non-admin user', async () => {
        vi.mocked(mockService.validateAdminRole).mockImplementation(() => {
          throw new ApiError(
            'FORBIDDEN',
            HTTP_STATUS.FORBIDDEN,
            'Only admins can use dev mode',
          )
        })

        const requestBody: ActivateDevModeDTO = {
          tier: 'pro',
        }

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        const response = await controller.activate(request, 'user')
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
        expect(data.success).toBe(false)
        expect(data.error.message).toBe('Only admins can use dev mode')
        expect(mockCookieStore.set).not.toHaveBeenCalled()
      })

      it('should reject empty role', async () => {
        vi.mocked(mockService.validateAdminRole).mockImplementation(() => {
          throw new ApiError(
            'FORBIDDEN',
            HTTP_STATUS.FORBIDDEN,
            'Only admins can use dev mode',
          )
        })

        const requestBody: ActivateDevModeDTO = {
          tier: 'pro',
        }

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        const response = await controller.activate(request, '')

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
      })
    })

    describe('Edge cases - Invalid request bodies', () => {
      it('should handle malformed JSON', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/dev-mode/activate',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{invalid json',
          },
        )

        const response = await controller.activate(request, 'admin')
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        expect(data.success).toBe(false)
      })

      it('should handle empty request body', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          null,
        )

        const response = await controller.activate(request, 'admin')

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should handle very large request body', async () => {
        const largeBody = {
          tier: 'pro' as const,
          features: {
            transcriptionMinutes: Number.MAX_SAFE_INTEGER,
          },
          credits: Number.MAX_SAFE_INTEGER,
          extraData: 'x'.repeat(10000),
        }

        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          largeBody,
        )

        const response = await controller.activate(request, 'admin')

        expect([200, 400, 413, 500]).toContain(response.status)
      })

      it('should handle request with Unicode characters', async () => {
        const requestBody = {
          tier: 'pro' as const,
          extraField: '你好世界🎵',
        }

        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        const response = await controller.activate(request, 'admin')

        expect(response.status).toBeLessThan(500)
      })
    })

    describe('Service errors', () => {
      it('should handle service throwing error', async () => {
        vi.mocked(mockService.createConfig).mockImplementation(() => {
          throw new Error('Service error')
        })

        const requestBody: ActivateDevModeDTO = {
          tier: 'pro',
        }

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        const response = await controller.activate(request, 'admin')
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        expect(data.success).toBe(false)
      })

      it('should handle cookie store errors', async () => {
        vi.mocked(mockService.createConfig).mockReturnValue(mockConfig)
        mockCookieStore.set.mockImplementation(() => {
          throw new Error('Cookie error')
        })

        const requestBody: ActivateDevModeDTO = {
          tier: 'pro',
        }

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/activate',
          'POST',
          requestBody,
        )

        const response = await controller.activate(request, 'admin')

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      })
    })
  })

  describe('deactivate', () => {
    describe('Success cases', () => {
      it('should deactivate dev mode and delete cookie', async () => {
        const deactivatedConfig = {
          isActive: false,
          subscription: {
            tier: 'junior' as const,
            status: 'active' as const,
            billingInterval: 'month' as const,
            features: {
              transcriptionMinutes: 10,
              fallingNotes: true,
              historyDays: 30,
              sheetEditor: false,
              polyphony: false,
            },
          },
          credits: {
            available: 50,
          },
        }

        vi.mocked(mockService.deactivateDevMode).mockReturnValue(
          deactivatedConfig,
        )

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/deactivate',
          'DELETE',
        )

        const response = await controller.deactivate(request, 'admin')
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
        expect(data.data.config).toEqual(deactivatedConfig)
        expect(mockCookieStore.delete).toHaveBeenCalledWith(
          DEV_MODE_COOKIE_NAME,
        )
      })

      it('should deactivate even when no cookie exists', async () => {
        mockCookieStore.get.mockReturnValue(undefined)

        const deactivatedConfig = {
          isActive: false,
          subscription: {
            tier: 'junior' as const,
            status: 'active' as const,
            billingInterval: 'month' as const,
            features: {
              transcriptionMinutes: 10,
              fallingNotes: true,
              historyDays: 30,
              sheetEditor: false,
              polyphony: false,
            },
          },
          credits: {
            available: 50,
          },
        }

        vi.mocked(mockService.deactivateDevMode).mockReturnValue(
          deactivatedConfig,
        )

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/deactivate',
          'DELETE',
        )

        const response = await controller.deactivate(request, 'admin')

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(mockCookieStore.delete).toHaveBeenCalled()
      })
    })

    describe('Authorization failures', () => {
      it('should reject non-admin', async () => {
        vi.mocked(mockService.validateAdminRole).mockImplementation(() => {
          throw new ApiError(
            'FORBIDDEN',
            HTTP_STATUS.FORBIDDEN,
            'Only admins can use dev mode',
          )
        })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/deactivate',
          'DELETE',
        )

        const response = await controller.deactivate(request, 'user')

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
        expect(mockCookieStore.delete).not.toHaveBeenCalled()
      })
    })

    describe('Cookie deletion errors', () => {
      it('should handle cookie delete errors', async () => {
        mockCookieStore.delete.mockImplementation(() => {
          throw new Error('Cookie delete failed')
        })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/deactivate',
          'DELETE',
        )

        const response = await controller.deactivate(request, 'admin')

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      })
    })
  })

  describe('getStatus', () => {
    describe('Success cases - Active dev mode', () => {
      it('should return active config from cookie', async () => {
        const currentConfig = JSON.stringify(mockConfig)
        mockCookieStore.get.mockReturnValue({ value: currentConfig })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/status',
          'GET',
        )

        const response = await controller.getStatus(request, 'admin')
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
        expect(data.data.config).toEqual(mockConfig)
        expect(mockCookieStore.get).toHaveBeenCalledWith(DEV_MODE_COOKIE_NAME)
      })
    })

    describe('Success cases - No active dev mode', () => {
      it('should return deactivated config when no cookie', async () => {
        mockCookieStore.get.mockReturnValue(undefined)

        const deactivatedConfig = {
          isActive: false,
          subscription: {
            tier: 'junior' as const,
            status: 'active' as const,
            billingInterval: 'month' as const,
            features: {
              transcriptionMinutes: 10,
              fallingNotes: true,
              historyDays: 30,
              sheetEditor: false,
              polyphony: false,
            },
          },
          credits: {
            available: 50,
          },
        }

        vi.mocked(mockService.deactivateDevMode).mockReturnValue(
          deactivatedConfig,
        )

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/status',
          'GET',
        )

        const response = await controller.getStatus(request, 'admin')
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
        expect(data.data.config.isActive).toBe(false)
      })
    })

    describe('Edge cases - Invalid cookie', () => {
      it('should handle malformed cookie JSON', async () => {
        mockCookieStore.get.mockReturnValue({ value: '{invalid' })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/status',
          'GET',
        )

        const response = await controller.getStatus(request, 'admin')

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      })
    })

    describe('Authorization failures', () => {
      it('should reject non-admin', async () => {
        vi.mocked(mockService.validateAdminRole).mockImplementation(() => {
          throw new ApiError(
            'FORBIDDEN',
            HTTP_STATUS.FORBIDDEN,
            'Only admins can use dev mode',
          )
        })

        const request = createMockRequest(
          'http://localhost:3000/api/dev-mode/status',
          'GET',
        )

        const response = await controller.getStatus(request, 'user')

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
      })
    })
  })
})
