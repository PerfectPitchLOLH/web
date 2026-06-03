import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { ActivateDevModeDTO, DevModeConfig } from './dev-mode.types'

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

    return {
      isActive: true,
      subscription: {
        tier: normalizedTier,
      },
      credits: {
        monthly: data.monthlyCredits,
        bonus: data.bonusCredits,
      },
    }
  }

  deactivateDevMode(): DevModeConfig {
    return {
      isActive: false,
      subscription: {
        tier: 'junior',
      },
      credits: {
        monthly: 0,
        bonus: 0,
      },
    }
  }
}
