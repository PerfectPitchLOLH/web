import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'
import {
  hashPassword,
  isStrongPassword,
  verifyPassword,
} from '@/server/shared/utils/password.utils'

import type { SettingsRepository } from './settings.repository'
import type {
  ChangePasswordDTO,
  Disable2FADTO,
  TwoFactorSetupResult,
  UpdateAppearanceDTO,
  UpdateNotificationsDTO,
  UpdateProfileDTO,
  UserSettings,
} from './settings.types'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
} from './settings.types'

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const buffer = new Uint8Array(5)
    crypto.getRandomValues(buffer)
    const code = Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`)
  }
  return codes
}

export class SettingsService {
  constructor(private repository: SettingsRepository) {}

  async getSettings(userId: string): Promise<UserSettings> {
    const settings = await this.repository.findById(userId)

    if (!settings) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    return settings
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileDTO,
  ): Promise<UserSettings> {
    const existing = await this.repository.findById(userId)

    if (!existing) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    if (data.name !== undefined && data.name.trim().length < 2) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'Name must be at least 2 characters',
      )
    }

    await this.repository.updateProfile(userId, data)
    const updated = await this.repository.findById(userId)
    return updated!
  }

  async changePassword(userId: string, data: ChangePasswordDTO): Promise<void> {
    const currentHash = await this.repository.getPassword(userId)

    if (!currentHash) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'Cannot change password for OAuth accounts',
      )
    }

    const isValid = await verifyPassword(data.currentPassword, currentHash)

    if (!isValid) {
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Current password is incorrect',
      )
    }

    if (!isStrongPassword(data.newPassword)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'New password does not meet security requirements',
      )
    }

    const newHash = await hashPassword(data.newPassword)
    await this.repository.updatePassword(userId, newHash)
  }

  async setup2FA(userId: string): Promise<TwoFactorSetupResult> {
    const user = await this.repository.findById(userId)

    if (!user) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    if (user.twoFactorEnabled) {
      throw new ApiError(
        'CONFLICT',
        HTTP_STATUS.CONFLICT,
        '2FA is already enabled',
      )
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'Notavex',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    })

    const secret = totp.secret.base32
    const uri = totp.toString()
    const qrCodeDataUrl = await QRCode.toDataURL(uri)
    const backupCodes = generateBackupCodes()

    await this.repository.updateTwoFactor(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: secret,
      twoFactorBackupCodes: backupCodes,
    })

    return { secret, uri, qrCodeDataUrl, backupCodes }
  }

  async verify2FA(userId: string, token: string): Promise<void> {
    const secret = await this.repository.getTwoFactorSecret(userId)

    if (!secret) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        '2FA setup not initiated',
      )
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'Notavex',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    })

    const delta = totp.validate({ token, window: 1 })

    if (delta === null) {
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Invalid 2FA code',
      )
    }

    await this.repository.updateTwoFactor(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorBackupCodes: null,
    })
  }

  async disable2FA(userId: string, data: Disable2FADTO): Promise<void> {
    const user = await this.repository.findById(userId)

    if (!user) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    if (!user.twoFactorEnabled) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        '2FA is not enabled',
      )
    }

    const secret = await this.repository.getTwoFactorSecret(userId)

    if (!secret) {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        '2FA secret not found',
      )
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'Notavex',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    })

    const delta = totp.validate({ token: data.token, window: 1 })

    if (delta === null) {
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Invalid 2FA code',
      )
    }

    await this.repository.updateTwoFactor(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    })
  }

  async updateNotifications(
    userId: string,
    data: UpdateNotificationsDTO,
  ): Promise<void> {
    const user = await this.repository.findById(userId)

    if (!user) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    const current: NotificationPreferences =
      user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES

    await this.repository.updateNotifications(userId, { ...current, ...data })
  }

  async updateAppearance(
    userId: string,
    data: UpdateAppearanceDTO,
  ): Promise<void> {
    const user = await this.repository.findById(userId)

    if (!user) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    await this.repository.updateAppearance(userId, data)
  }

  async exportData(userId: string): Promise<object> {
    const user = await this.repository.findById(userId)

    if (!user) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    const { ...safeUser } = user
    return { exportedAt: new Date().toISOString(), user: safeUser }
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.repository.findById(userId)

    if (!user) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    await this.repository.deleteUser(userId)
  }
}
