import { db } from '@/server/lib/database'

import type {
  NotificationPreferences,
  UpdateAppearanceDTO,
  UpdateProfileDTO,
  UserSettings,
} from './settings.types'

export class SettingsRepository {
  async findById(id: string): Promise<UserSettings | null> {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        twoFactorEnabled: true,
        theme: true,
        language: true,
        notificationPreferences: true,
        password: true,
      },
    })

    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      twoFactorEnabled: user.twoFactorEnabled,
      theme: user.theme,
      language: user.language,
      notificationPreferences:
        (user.notificationPreferences as NotificationPreferences) ?? null,
      hasPassword: !!user.password,
    }
  }

  async updateProfile(id: string, data: UpdateProfileDTO): Promise<void> {
    await db.user.update({
      where: { id },
      data,
    })
  }

  async getPassword(id: string): Promise<string | null> {
    const user = await db.user.findUnique({
      where: { id },
      select: { password: true },
    })
    return user?.password ?? null
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await db.user.update({
      where: { id },
      data: { password: hashedPassword },
    })
  }

  async updateTwoFactor(
    id: string,
    data: {
      twoFactorEnabled: boolean
      twoFactorSecret: string | null
      twoFactorBackupCodes: string[] | null
    },
  ): Promise<void> {
    await db.user.update({
      where: { id },
      data: {
        twoFactorEnabled: data.twoFactorEnabled,
        twoFactorSecret: data.twoFactorSecret,
        twoFactorBackupCodes: data.twoFactorBackupCodes ?? undefined,
      },
    })
  }

  async getTwoFactorSecret(id: string): Promise<string | null> {
    const user = await db.user.findUnique({
      where: { id },
      select: { twoFactorSecret: true },
    })
    return user?.twoFactorSecret ?? null
  }

  async updateNotifications(
    id: string,
    prefs: NotificationPreferences,
  ): Promise<void> {
    await db.user.update({
      where: { id },
      data: { notificationPreferences: prefs },
    })
  }

  async updateAppearance(id: string, data: UpdateAppearanceDTO): Promise<void> {
    await db.user.update({
      where: { id },
      data,
    })
  }

  async deleteUser(userId: string): Promise<void> {
    await db.user.delete({ where: { id: userId } })
  }
}
