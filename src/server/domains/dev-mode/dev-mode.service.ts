import { PLAN_FEATURES } from '@/server/domains/subscription/subscription.constants'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { DEFAULT_DEV_MODE_CONFIG, DEV_MODE_PRESETS } from './dev-mode.constants'
import type {
  ActivateDevModeDTO,
  DevModeConfig,
  UpdateDevModeDTO,
} from './dev-mode.types'

export class DevModeService {
  validateAdminRole(userRole: string): void {
    if (userRole !== 'admin') {
      throw new ApiError(
        'FORBIDDEN',
        HTTP_STATUS.FORBIDDEN,
        'Only admins can use dev mode',
      )
    }
  }

  createConfig(data: ActivateDevModeDTO): DevModeConfig {
    const validTiers = ['junior', 'basic', 'pro'] as const
    const normalizedTier = validTiers.includes(data.tier as any)
      ? data.tier
      : 'junior'

    const baseFeaturesForTier = PLAN_FEATURES[normalizedTier]

    const config: DevModeConfig = {
      isActive: true,
      subscription: {
        tier: normalizedTier,
        status: data.status ?? 'active',
        billingInterval: data.billingInterval ?? 'month',
        features: data.features
          ? { ...baseFeaturesForTier, ...data.features }
          : baseFeaturesForTier,
      },
      credits: {
        available: data.credits ?? 50,
      },
    }

    return config
  }

  updateConfig(
    currentConfig: DevModeConfig,
    updates: UpdateDevModeDTO,
  ): DevModeConfig {
    const updatedConfig: DevModeConfig = {
      ...currentConfig,
      subscription: {
        ...currentConfig.subscription,
        features: { ...currentConfig.subscription.features },
      },
      credits: { ...currentConfig.credits },
    }

    if (updates.tier) {
      updatedConfig.subscription.tier = updates.tier
      updatedConfig.subscription.features = PLAN_FEATURES[updates.tier]
    }

    if (updates.status) {
      updatedConfig.subscription.status = updates.status
    }

    if (updates.billingInterval) {
      updatedConfig.subscription.billingInterval = updates.billingInterval
    }

    if (updates.features) {
      updatedConfig.subscription.features = {
        ...updatedConfig.subscription.features,
        ...updates.features,
      }
    }

    if (updates.credits !== undefined) {
      updatedConfig.credits.available = updates.credits
    }

    return updatedConfig
  }

  getPresets() {
    return DEV_MODE_PRESETS
  }

  getPresetById(presetId: string): DevModeConfig {
    const preset = DEV_MODE_PRESETS.find((p) => p.id === presetId)

    if (!preset) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        `Preset not found: ${presetId}`,
      )
    }

    return {
      isActive: true,
      ...preset.config,
    }
  }

  deactivateDevMode(): DevModeConfig {
    return {
      isActive: false,
      ...DEFAULT_DEV_MODE_CONFIG,
    }
  }
}
