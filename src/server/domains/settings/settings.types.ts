export type NotificationPreferences = {
  marketing: boolean
  security: boolean
  updates: boolean
  activity: boolean
}

export type UserSettings = {
  id: string
  email: string
  name: string
  image: string | null
  twoFactorEnabled: boolean
  theme: string
  language: string
  notificationPreferences: NotificationPreferences | null
  hasPassword: boolean
}

export type UpdateProfileDTO = {
  name?: string
  image?: string
}

export type ChangePasswordDTO = {
  currentPassword: string
  newPassword: string
}

export type Setup2FADTO = {
  userId: string
}

export type Verify2FADTO = {
  token: string
}

export type Disable2FADTO = {
  token: string
}

export type UpdateNotificationsDTO = Partial<NotificationPreferences>

export type UpdateAppearanceDTO = {
  theme?: 'light' | 'dark' | 'system'
  language?: 'fr' | 'en'
}

export type TwoFactorSetupResult = {
  secret: string
  uri: string
  qrCodeDataUrl: string
  backupCodes: string[]
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  marketing: true,
  security: true,
  updates: true,
  activity: true,
}
