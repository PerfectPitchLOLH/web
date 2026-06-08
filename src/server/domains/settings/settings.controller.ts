import type { NextRequest } from 'next/server'

import { requireAuth } from '@/server/shared/middleware/auth.middleware'
import { createSuccessResponse, handleApiError } from '@/server/shared/utils'

import type { SettingsService } from './settings.service'
import type {
  ChangePasswordDTO,
  Disable2FADTO,
  UpdateAppearanceDTO,
  UpdateNotificationsDTO,
  UpdateProfileDTO,
  Verify2FADTO,
} from './settings.types'

export class SettingsController {
  constructor(private service: SettingsService) {}

  async getSettings() {
    try {
      const session = await requireAuth()
      const settings = await this.service.getSettings(session.user.id)
      return createSuccessResponse(settings)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async updateProfile(request: NextRequest) {
    try {
      const session = await requireAuth()
      const body = (await request.json()) as UpdateProfileDTO
      const updated = await this.service.updateProfile(session.user.id, body)
      return createSuccessResponse(updated)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async changePassword(request: NextRequest) {
    try {
      const session = await requireAuth()
      const body = (await request.json()) as ChangePasswordDTO
      await this.service.changePassword(session.user.id, body)
      return createSuccessResponse({ message: 'Password updated successfully' })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async setup2FA() {
    try {
      const session = await requireAuth()
      const result = await this.service.setup2FA(session.user.id)
      return createSuccessResponse(result)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async verify2FA(request: NextRequest) {
    try {
      const session = await requireAuth()
      const body = (await request.json()) as Verify2FADTO
      await this.service.verify2FA(session.user.id, body.token)
      return createSuccessResponse({ message: '2FA enabled successfully' })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async disable2FA(request: NextRequest) {
    try {
      const session = await requireAuth()
      const body = (await request.json()) as Disable2FADTO
      await this.service.disable2FA(session.user.id, body)
      return createSuccessResponse({ message: '2FA disabled successfully' })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async updateNotifications(request: NextRequest) {
    try {
      const session = await requireAuth()
      const body = (await request.json()) as UpdateNotificationsDTO
      await this.service.updateNotifications(session.user.id, body)
      return createSuccessResponse({
        message: 'Notification preferences updated',
      })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async updateAppearance(request: NextRequest) {
    try {
      const session = await requireAuth()
      const body = (await request.json()) as UpdateAppearanceDTO
      await this.service.updateAppearance(session.user.id, body)
      return createSuccessResponse({
        message: 'Appearance preferences updated',
      })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async completeOnboarding() {
    try {
      const session = await requireAuth()
      await this.service.completeOnboarding(session.user.id)
      return createSuccessResponse({ message: 'Onboarding completed' })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async exportData() {
    try {
      const session = await requireAuth()
      const data = await this.service.exportData(session.user.id)
      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async deleteAccount() {
    try {
      const session = await requireAuth()
      await this.service.deleteAccount(session.user.id)
      return createSuccessResponse(null)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
