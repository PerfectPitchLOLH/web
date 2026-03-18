import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PLAN_FEATURES } from '@/server/domains/subscription/subscription.constants'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { DEV_MODE_PRESETS } from '../dev-mode.constants'
import { DevModeService } from '../dev-mode.service'
import type {
  ActivateDevModeDTO,
  DevModeConfig,
  UpdateDevModeDTO,
} from '../dev-mode.types'

describe('DevModeService - Deep Tests', () => {
  let service: DevModeService

  beforeEach(() => {
    service = new DevModeService()
    vi.clearAllMocks()
  })

  describe('validateAdminRole', () => {
    describe('Success cases', () => {
      it('should allow admin role', () => {
        expect(() => service.validateAdminRole('admin')).not.toThrow()
      })
    })

    describe('Authorization failures', () => {
      it('should reject user role', () => {
        expect(() => service.validateAdminRole('user')).toThrow(ApiError)
        expect(() => service.validateAdminRole('user')).toThrow(
          'Only admins can use dev mode',
        )
      })

      it('should reject guest role', () => {
        expect(() => service.validateAdminRole('guest')).toThrow(ApiError)
      })

      it('should reject moderator role', () => {
        expect(() => service.validateAdminRole('moderator')).toThrow(ApiError)
      })

      it('should throw ApiError with FORBIDDEN status', () => {
        try {
          service.validateAdminRole('user')
          expect.fail('Should have thrown')
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError)
          expect((error as ApiError).statusCode).toBe(HTTP_STATUS.FORBIDDEN)
          expect((error as ApiError).code).toBe('FORBIDDEN')
        }
      })
    })

    describe('Edge cases - Invalid roles', () => {
      it('should reject empty string', () => {
        expect(() => service.validateAdminRole('')).toThrow(ApiError)
      })

      it('should reject null as string', () => {
        expect(() => service.validateAdminRole('null')).toThrow(ApiError)
      })

      it('should reject undefined as string', () => {
        expect(() => service.validateAdminRole('undefined')).toThrow(ApiError)
      })

      it('should reject uppercase ADMIN', () => {
        expect(() => service.validateAdminRole('ADMIN')).toThrow(ApiError)
      })

      it('should reject mixed case Admin', () => {
        expect(() => service.validateAdminRole('Admin')).toThrow(ApiError)
      })

      it('should reject admin with whitespace', () => {
        expect(() => service.validateAdminRole(' admin')).toThrow(ApiError)
        expect(() => service.validateAdminRole('admin ')).toThrow(ApiError)
        expect(() => service.validateAdminRole(' admin ')).toThrow(ApiError)
      })

      it('should reject role with special characters', () => {
        expect(() => service.validateAdminRole('admin!')).toThrow(ApiError)
        expect(() => service.validateAdminRole('admin@')).toThrow(ApiError)
        expect(() => service.validateAdminRole('admin#')).toThrow(ApiError)
      })

      it('should reject SQL injection attempts', () => {
        expect(() => service.validateAdminRole("admin' OR '1'='1")).toThrow(
          ApiError,
        )
        expect(() =>
          service.validateAdminRole('admin"; DROP TABLE users; --'),
        ).toThrow(ApiError)
      })

      it('should reject very long role strings', () => {
        const longRole = 'a'.repeat(1000)
        expect(() => service.validateAdminRole(longRole)).toThrow(ApiError)
      })

      it('should reject Unicode characters', () => {
        expect(() => service.validateAdminRole('adminé')).toThrow(ApiError)
        expect(() => service.validateAdminRole('管理者')).toThrow(ApiError)
        expect(() => service.validateAdminRole('админ')).toThrow(ApiError)
      })

      it('should reject emojis', () => {
        expect(() => service.validateAdminRole('admin🔥')).toThrow(ApiError)
        expect(() => service.validateAdminRole('🔒admin')).toThrow(ApiError)
      })
    })
  })

  describe('createConfig', () => {
    describe('Success cases - All tiers', () => {
      it('should create config for junior tier with defaults', () => {
        const data: ActivateDevModeDTO = {
          tier: 'junior',
        }

        const result = service.createConfig(data)

        expect(result).toEqual({
          isActive: true,
          subscription: {
            tier: 'junior',
            status: 'active',
            billingInterval: 'month',
            features: PLAN_FEATURES.junior,
          },
          credits: {
            available: 50,
          },
        })
      })

      it('should create config for basic tier with defaults', () => {
        const data: ActivateDevModeDTO = {
          tier: 'basic',
        }

        const result = service.createConfig(data)

        expect(result).toEqual({
          isActive: true,
          subscription: {
            tier: 'basic',
            status: 'active',
            billingInterval: 'month',
            features: PLAN_FEATURES.basic,
          },
          credits: {
            available: 50,
          },
        })
      })

      it('should create config for pro tier with defaults', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
        }

        const result = service.createConfig(data)

        expect(result).toEqual({
          isActive: true,
          subscription: {
            tier: 'pro',
            status: 'active',
            billingInterval: 'month',
            features: PLAN_FEATURES.pro,
          },
          credits: {
            available: 50,
          },
        })
      })
    })

    describe('Success cases - Custom status', () => {
      const statuses = [
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'paused',
        'trialing',
        'unpaid',
      ] as const

      statuses.forEach((status) => {
        it(`should create config with status: ${status}`, () => {
          const data: ActivateDevModeDTO = {
            tier: 'pro',
            status,
          }

          const result = service.createConfig(data)

          expect(result.subscription.status).toBe(status)
        })
      })
    })

    describe('Success cases - Custom billing interval', () => {
      it('should create config with monthly billing', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          billingInterval: 'month',
        }

        const result = service.createConfig(data)

        expect(result.subscription.billingInterval).toBe('month')
      })

      it('should create config with yearly billing', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          billingInterval: 'year',
        }

        const result = service.createConfig(data)

        expect(result.subscription.billingInterval).toBe('year')
      })
    })

    describe('Success cases - Custom features', () => {
      it('should merge partial custom features with base features', () => {
        const data: ActivateDevModeDTO = {
          tier: 'junior',
          features: {
            fallingNotes: true,
            sheetEditor: true,
          },
        }

        const result = service.createConfig(data)

        expect(result.subscription.features).toEqual({
          ...PLAN_FEATURES.junior,
          fallingNotes: true,
          sheetEditor: true,
        })
      })

      it('should override all features', () => {
        const data: ActivateDevModeDTO = {
          tier: 'junior',
          features: {
            transcriptionMinutes: 999,
            fallingNotes: true,
            historyDays: 'unlimited',
            sheetEditor: true,
            polyphony: true,
          },
        }

        const result = service.createConfig(data)

        expect(result.subscription.features).toEqual({
          transcriptionMinutes: 999,
          fallingNotes: true,
          historyDays: 'unlimited',
          sheetEditor: true,
          polyphony: true,
        })
      })

      it('should handle feature override with 0 transcription minutes', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          features: {
            transcriptionMinutes: 0,
          },
        }

        const result = service.createConfig(data)

        expect(result.subscription.features.transcriptionMinutes).toBe(0)
      })

      it('should handle feature override disabling features', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          features: {
            fallingNotes: false,
            sheetEditor: false,
            polyphony: false,
          },
        }

        const result = service.createConfig(data)

        expect(result.subscription.features.fallingNotes).toBe(false)
        expect(result.subscription.features.sheetEditor).toBe(false)
        expect(result.subscription.features.polyphony).toBe(false)
      })
    })

    describe('Success cases - Custom credits', () => {
      it('should create config with 0 credits', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          credits: 0,
        }

        const result = service.createConfig(data)

        expect(result.credits.available).toBe(0)
      })

      it('should create config with 1000 credits', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          credits: 1000,
        }

        const result = service.createConfig(data)

        expect(result.credits.available).toBe(1000)
      })

      it('should create config with very large credits', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          credits: 999999999,
        }

        const result = service.createConfig(data)

        expect(result.credits.available).toBe(999999999)
      })
    })

    describe('Edge cases - Boundary values', () => {
      it('should handle negative credits (potential bug)', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          credits: -100,
        }

        const result = service.createConfig(data)

        expect(result.credits.available).toBe(-100)
      })

      it('should handle Number.MAX_SAFE_INTEGER credits', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          credits: Number.MAX_SAFE_INTEGER,
        }

        const result = service.createConfig(data)

        expect(result.credits.available).toBe(Number.MAX_SAFE_INTEGER)
      })

      it('should handle very large transcription minutes', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          features: {
            transcriptionMinutes: 999999,
          },
        }

        const result = service.createConfig(data)

        expect(result.subscription.features.transcriptionMinutes).toBe(999999)
      })

      it('should handle negative transcription minutes (potential bug)', () => {
        const data: ActivateDevModeDTO = {
          tier: 'pro',
          features: {
            transcriptionMinutes: -10,
          },
        }

        const result = service.createConfig(data)

        expect(result.subscription.features.transcriptionMinutes).toBe(-10)
      })
    })

    describe('Immutability tests', () => {
      it('should not mutate input data', () => {
        const data: ActivateDevModeDTO = {
          tier: 'junior',
          status: 'active',
          billingInterval: 'month',
          features: {
            fallingNotes: true,
          },
          credits: 100,
        }

        const originalData = JSON.parse(JSON.stringify(data))
        service.createConfig(data)

        expect(data).toEqual(originalData)
      })

      it('should not mutate PLAN_FEATURES constant', () => {
        const originalFeatures = JSON.parse(JSON.stringify(PLAN_FEATURES))

        service.createConfig({
          tier: 'pro',
          features: {
            transcriptionMinutes: 9999,
          },
        })

        expect(PLAN_FEATURES).toEqual(originalFeatures)
      })
    })

    describe('Config structure validation', () => {
      it('should always set isActive to true', () => {
        const configs = [
          { tier: 'junior' as const },
          { tier: 'basic' as const },
          { tier: 'pro' as const },
          { tier: 'junior' as const, status: 'canceled' as const },
          { tier: 'junior' as const, status: 'past_due' as const },
        ]

        configs.forEach((data) => {
          const result = service.createConfig(data)
          expect(result.isActive).toBe(true)
        })
      })

      it('should always include all required fields', () => {
        const result = service.createConfig({ tier: 'junior' })

        expect(result).toHaveProperty('isActive')
        expect(result).toHaveProperty('subscription')
        expect(result).toHaveProperty('credits')
        expect(result.subscription).toHaveProperty('tier')
        expect(result.subscription).toHaveProperty('status')
        expect(result.subscription).toHaveProperty('billingInterval')
        expect(result.subscription).toHaveProperty('features')
        expect(result.credits).toHaveProperty('available')
      })
    })
  })

  describe('updateConfig', () => {
    const baseConfig: DevModeConfig = {
      isActive: true,
      subscription: {
        tier: 'junior',
        status: 'active',
        billingInterval: 'month',
        features: PLAN_FEATURES.junior,
      },
      credits: {
        available: 50,
      },
    }

    describe('Success cases - Tier updates', () => {
      it('should update tier and reset features', () => {
        const updates: UpdateDevModeDTO = {
          tier: 'pro',
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.tier).toBe('pro')
        expect(result.subscription.features).toEqual(PLAN_FEATURES.pro)
      })

      it('should update from junior to basic', () => {
        const updates: UpdateDevModeDTO = {
          tier: 'basic',
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.tier).toBe('basic')
        expect(result.subscription.features).toEqual(PLAN_FEATURES.basic)
      })

      it('should update from pro to junior (downgrade)', () => {
        const proConfig: DevModeConfig = {
          ...baseConfig,
          subscription: {
            ...baseConfig.subscription,
            tier: 'pro',
            features: PLAN_FEATURES.pro,
          },
        }

        const updates: UpdateDevModeDTO = {
          tier: 'junior',
        }

        const result = service.updateConfig(proConfig, updates)

        expect(result.subscription.tier).toBe('junior')
        expect(result.subscription.features).toEqual(PLAN_FEATURES.junior)
      })
    })

    describe('Success cases - Status updates', () => {
      it('should update status from active to canceled', () => {
        const updates: UpdateDevModeDTO = {
          status: 'canceled',
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.status).toBe('canceled')
        expect(result.subscription.tier).toBe('junior')
      })

      it('should update status to trialing', () => {
        const updates: UpdateDevModeDTO = {
          status: 'trialing',
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.status).toBe('trialing')
      })

      it('should update status to past_due', () => {
        const updates: UpdateDevModeDTO = {
          status: 'past_due',
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.status).toBe('past_due')
      })
    })

    describe('Success cases - Billing interval updates', () => {
      it('should update billing interval from month to year', () => {
        const updates: UpdateDevModeDTO = {
          billingInterval: 'year',
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.billingInterval).toBe('year')
      })

      it('should update billing interval from year to month', () => {
        const yearlyConfig: DevModeConfig = {
          ...baseConfig,
          subscription: {
            ...baseConfig.subscription,
            billingInterval: 'year',
          },
        }

        const updates: UpdateDevModeDTO = {
          billingInterval: 'month',
        }

        const result = service.updateConfig(yearlyConfig, updates)

        expect(result.subscription.billingInterval).toBe('month')
      })
    })

    describe('Success cases - Feature updates', () => {
      it('should merge partial features without changing tier', () => {
        const updates: UpdateDevModeDTO = {
          features: {
            sheetEditor: true,
          },
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.features).toEqual({
          ...PLAN_FEATURES.junior,
          sheetEditor: true,
        })
        expect(result.subscription.tier).toBe('junior')
      })

      it('should update multiple features at once', () => {
        const updates: UpdateDevModeDTO = {
          features: {
            sheetEditor: true,
            polyphony: true,
            fallingNotes: false,
          },
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.features.sheetEditor).toBe(true)
        expect(result.subscription.features.polyphony).toBe(true)
        expect(result.subscription.features.fallingNotes).toBe(false)
      })

      it('should override transcription minutes', () => {
        const updates: UpdateDevModeDTO = {
          features: {
            transcriptionMinutes: 999,
          },
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.features.transcriptionMinutes).toBe(999)
      })

      it('should update historyDays to unlimited', () => {
        const updates: UpdateDevModeDTO = {
          features: {
            historyDays: 'unlimited',
          },
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.features.historyDays).toBe('unlimited')
      })
    })

    describe('Success cases - Credits updates', () => {
      it('should update credits to 0', () => {
        const updates: UpdateDevModeDTO = {
          credits: 0,
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.credits.available).toBe(0)
      })

      it('should update credits to 1000', () => {
        const updates: UpdateDevModeDTO = {
          credits: 1000,
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.credits.available).toBe(1000)
      })

      it('should handle negative credits', () => {
        const updates: UpdateDevModeDTO = {
          credits: -50,
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.credits.available).toBe(-50)
      })

      it('should not update credits when undefined', () => {
        const updates: UpdateDevModeDTO = {
          tier: 'pro',
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.credits.available).toBe(50)
      })
    })

    describe('Success cases - Multiple updates', () => {
      it('should update tier, status, and credits together', () => {
        const updates: UpdateDevModeDTO = {
          tier: 'pro',
          status: 'trialing',
          credits: 100,
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.tier).toBe('pro')
        expect(result.subscription.status).toBe('trialing')
        expect(result.credits.available).toBe(100)
        expect(result.subscription.features).toEqual(PLAN_FEATURES.pro)
      })

      it('should update all possible fields', () => {
        const updates: UpdateDevModeDTO = {
          tier: 'pro',
          status: 'active',
          billingInterval: 'year',
          features: {
            transcriptionMinutes: 200,
          },
          credits: 500,
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.tier).toBe('pro')
        expect(result.subscription.status).toBe('active')
        expect(result.subscription.billingInterval).toBe('year')
        expect(result.subscription.features.transcriptionMinutes).toBe(200)
        expect(result.credits.available).toBe(500)
      })
    })

    describe('Edge cases - Empty updates', () => {
      it('should handle empty updates object', () => {
        const updates: UpdateDevModeDTO = {}

        const result = service.updateConfig(baseConfig, updates)

        expect(result).toEqual(baseConfig)
      })

      it('should handle empty features object', () => {
        const updates: UpdateDevModeDTO = {
          features: {},
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.features).toEqual(PLAN_FEATURES.junior)
      })
    })

    describe('Immutability tests', () => {
      it('should not mutate original config', () => {
        const originalConfig = JSON.parse(JSON.stringify(baseConfig))
        const updates: UpdateDevModeDTO = {
          tier: 'pro',
          credits: 1000,
        }

        service.updateConfig(baseConfig, updates)

        expect(baseConfig).toEqual(originalConfig)
      })

      it('should not mutate updates object', () => {
        const updates: UpdateDevModeDTO = {
          tier: 'pro',
          features: {
            sheetEditor: true,
          },
        }
        const originalUpdates = JSON.parse(JSON.stringify(updates))

        service.updateConfig(baseConfig, updates)

        expect(updates).toEqual(originalUpdates)
      })

      it('should create a new config object', () => {
        const updates: UpdateDevModeDTO = {
          tier: 'pro',
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result).not.toBe(baseConfig)
        expect(result.subscription).not.toBe(baseConfig.subscription)
        expect(result.credits).not.toBe(baseConfig.credits)
      })
    })

    describe('Feature precedence - Tier vs custom features', () => {
      it('should apply tier features first, then custom features', () => {
        const updates: UpdateDevModeDTO = {
          tier: 'pro',
          features: {
            transcriptionMinutes: 100,
          },
        }

        const result = service.updateConfig(baseConfig, updates)

        expect(result.subscription.features).toEqual({
          ...PLAN_FEATURES.pro,
          transcriptionMinutes: 100,
        })
      })

      it('should preserve custom features when only updating status', () => {
        const customConfig: DevModeConfig = {
          ...baseConfig,
          subscription: {
            ...baseConfig.subscription,
            features: {
              ...PLAN_FEATURES.junior,
              sheetEditor: true,
            },
          },
        }

        const updates: UpdateDevModeDTO = {
          status: 'trialing',
        }

        const result = service.updateConfig(customConfig, updates)

        expect(result.subscription.features.sheetEditor).toBe(true)
      })

      it('should reset custom features when updating tier', () => {
        const customConfig: DevModeConfig = {
          ...baseConfig,
          subscription: {
            ...baseConfig.subscription,
            features: {
              ...PLAN_FEATURES.junior,
              sheetEditor: true,
              polyphony: true,
            },
          },
        }

        const updates: UpdateDevModeDTO = {
          tier: 'basic',
        }

        const result = service.updateConfig(customConfig, updates)

        expect(result.subscription.features).toEqual(PLAN_FEATURES.basic)
      })
    })
  })

  describe('getPresets', () => {
    it('should return all presets', () => {
      const result = service.getPresets()

      expect(result).toEqual(DEV_MODE_PRESETS)
      expect(result).toHaveLength(DEV_MODE_PRESETS.length)
    })

    it('should return presets with correct structure', () => {
      const result = service.getPresets()

      result.forEach((preset) => {
        expect(preset).toHaveProperty('id')
        expect(preset).toHaveProperty('name')
        expect(preset).toHaveProperty('description')
        expect(preset).toHaveProperty('config')
        expect(preset.config).toHaveProperty('subscription')
        expect(preset.config).toHaveProperty('credits')
      })
    })

    it('should include all expected preset IDs', () => {
      const result = service.getPresets()
      const ids = result.map((p) => p.id)

      expect(ids).toContain('free-user')
      expect(ids).toContain('junior-active')
      expect(ids).toContain('basic-active')
      expect(ids).toContain('pro-active')
      expect(ids).toContain('pro-trial')
      expect(ids).toContain('basic-expired')
      expect(ids).toContain('pro-low-credits')
    })
  })

  describe('getPresetById', () => {
    describe('Success cases - Valid preset IDs', () => {
      it('should return free-user preset with isActive: true', () => {
        const result = service.getPresetById('free-user')

        expect(result.isActive).toBe(true)
        expect(result.subscription.tier).toBe('junior')
        expect(result.subscription.status).toBe('canceled')
        expect(result.credits.available).toBe(0)
      })

      it('should return junior-active preset', () => {
        const result = service.getPresetById('junior-active')

        expect(result.isActive).toBe(true)
        expect(result.subscription.tier).toBe('junior')
        expect(result.subscription.status).toBe('active')
        expect(result.credits.available).toBe(50)
      })

      it('should return basic-active preset', () => {
        const result = service.getPresetById('basic-active')

        expect(result.isActive).toBe(true)
        expect(result.subscription.tier).toBe('basic')
        expect(result.subscription.status).toBe('active')
        expect(result.credits.available).toBe(100)
      })

      it('should return pro-active preset', () => {
        const result = service.getPresetById('pro-active')

        expect(result.isActive).toBe(true)
        expect(result.subscription.tier).toBe('pro')
        expect(result.subscription.status).toBe('active')
        expect(result.subscription.billingInterval).toBe('year')
        expect(result.credits.available).toBe(500)
      })

      it('should return pro-trial preset', () => {
        const result = service.getPresetById('pro-trial')

        expect(result.isActive).toBe(true)
        expect(result.subscription.tier).toBe('pro')
        expect(result.subscription.status).toBe('trialing')
        expect(result.credits.available).toBe(100)
      })

      it('should return basic-expired preset', () => {
        const result = service.getPresetById('basic-expired')

        expect(result.isActive).toBe(true)
        expect(result.subscription.tier).toBe('basic')
        expect(result.subscription.status).toBe('past_due')
        expect(result.credits.available).toBe(0)
      })

      it('should return pro-low-credits preset', () => {
        const result = service.getPresetById('pro-low-credits')

        expect(result.isActive).toBe(true)
        expect(result.subscription.tier).toBe('pro')
        expect(result.subscription.status).toBe('active')
        expect(result.credits.available).toBe(5)
      })
    })

    describe('Error cases - Invalid preset IDs', () => {
      it('should throw ApiError for non-existent preset', () => {
        expect(() => service.getPresetById('non-existent')).toThrow(ApiError)
        expect(() => service.getPresetById('non-existent')).toThrow(
          'Preset not found: non-existent',
        )
      })

      it('should throw ApiError with NOT_FOUND status', () => {
        try {
          service.getPresetById('invalid-id')
          expect.fail('Should have thrown')
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError)
          expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
          expect((error as ApiError).code).toBe('NOT_FOUND')
        }
      })

      it('should throw error for empty string', () => {
        expect(() => service.getPresetById('')).toThrow(ApiError)
      })

      it('should throw error for similar but wrong ID', () => {
        expect(() => service.getPresetById('free-users')).toThrow(ApiError)
        expect(() => service.getPresetById('junior-activ')).toThrow(ApiError)
        expect(() => service.getPresetById('Pro-active')).toThrow(ApiError)
      })

      it('should throw error for case-insensitive match', () => {
        expect(() => service.getPresetById('FREE-USER')).toThrow(ApiError)
        expect(() => service.getPresetById('Free-User')).toThrow(ApiError)
      })

      it('should throw error for preset ID with whitespace', () => {
        expect(() => service.getPresetById(' free-user')).toThrow(ApiError)
        expect(() => service.getPresetById('free-user ')).toThrow(ApiError)
        expect(() => service.getPresetById(' free-user ')).toThrow(ApiError)
      })

      it('should throw error for special characters', () => {
        expect(() => service.getPresetById('free-user!')).toThrow(ApiError)
        expect(() => service.getPresetById('free@user')).toThrow(ApiError)
      })

      it('should throw error for SQL injection attempts', () => {
        expect(() => service.getPresetById("free-user' OR '1'='1")).toThrow(
          ApiError,
        )
        expect(() =>
          service.getPresetById('free-user"; DROP TABLE presets; --'),
        ).toThrow(ApiError)
      })

      it('should throw error for null as string', () => {
        expect(() => service.getPresetById('null')).toThrow(ApiError)
      })

      it('should throw error for undefined as string', () => {
        expect(() => service.getPresetById('undefined')).toThrow(ApiError)
      })

      it('should throw error for very long preset ID', () => {
        const longId = 'a'.repeat(1000)
        expect(() => service.getPresetById(longId)).toThrow(ApiError)
      })

      it('should throw error for Unicode characters', () => {
        expect(() => service.getPresetById('free-useré')).toThrow(ApiError)
        expect(() => service.getPresetById('無料ユーザー')).toThrow(ApiError)
      })

      it('should throw error for emojis', () => {
        expect(() => service.getPresetById('free-user🔥')).toThrow(ApiError)
      })
    })

    describe('Immutability tests', () => {
      it('should not mutate DEV_MODE_PRESETS constant', () => {
        const originalPresets = JSON.parse(JSON.stringify(DEV_MODE_PRESETS))

        service.getPresetById('free-user')

        expect(DEV_MODE_PRESETS).toEqual(originalPresets)
      })

      it('should return a new config object', () => {
        const result1 = service.getPresetById('free-user')
        const result2 = service.getPresetById('free-user')

        expect(result1).not.toBe(result2)
        expect(result1).toEqual(result2)
      })
    })
  })

  describe('deactivateDevMode', () => {
    it('should return config with isActive: false', () => {
      const result = service.deactivateDevMode()

      expect(result.isActive).toBe(false)
    })

    it('should return default config structure', () => {
      const result = service.deactivateDevMode()

      expect(result).toHaveProperty('isActive')
      expect(result).toHaveProperty('subscription')
      expect(result).toHaveProperty('credits')
      expect(result.subscription).toHaveProperty('tier')
      expect(result.subscription).toHaveProperty('status')
      expect(result.subscription).toHaveProperty('billingInterval')
      expect(result.subscription).toHaveProperty('features')
      expect(result.credits).toHaveProperty('available')
    })

    it('should return junior tier by default', () => {
      const result = service.deactivateDevMode()

      expect(result.subscription.tier).toBe('junior')
    })

    it('should return active status by default', () => {
      const result = service.deactivateDevMode()

      expect(result.subscription.status).toBe('active')
    })

    it('should return month billing by default', () => {
      const result = service.deactivateDevMode()

      expect(result.subscription.billingInterval).toBe('month')
    })

    it('should return 50 credits by default', () => {
      const result = service.deactivateDevMode()

      expect(result.credits.available).toBe(50)
    })

    it('should return junior features', () => {
      const result = service.deactivateDevMode()

      expect(result.subscription.features).toEqual(PLAN_FEATURES.junior)
    })

    it('should be idempotent', () => {
      const result1 = service.deactivateDevMode()
      const result2 = service.deactivateDevMode()

      expect(result1).toEqual(result2)
    })

    it('should return new object on each call', () => {
      const result1 = service.deactivateDevMode()
      const result2 = service.deactivateDevMode()

      expect(result1).not.toBe(result2)
    })
  })
})
