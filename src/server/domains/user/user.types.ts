import type { User as PrismaUser } from '@prisma/client'

import type { CreateDTO, UpdateDTO } from '@/server/shared/types'

export type UserRole = 'admin' | 'user'

export type UserEntity = PrismaUser

export type CreateUserDTO = Omit<
  CreateDTO<PrismaUser>,
  | 'password'
  | 'emailVerified'
  | 'image'
  | 'isRootAdmin'
  | 'status'
  | 'suspendedAt'
  | 'deletedAt'
  | 'stripeCustomerId'
  | 'bio'
  | 'twoFactorEnabled'
  | 'twoFactorSecret'
  | 'twoFactorBackupCodes'
  | 'theme'
  | 'language'
  | 'notificationPreferences'
> & {
  password?: string | null
  emailVerified?: Date | null
  image?: string | null
  isRootAdmin?: boolean
  status?: string
  suspendedAt?: Date | null
  deletedAt?: Date | null
  stripeCustomerId?: string | null
}

export type UpdateUserDTO = Omit<
  UpdateDTO<PrismaUser>,
  'twoFactorBackupCodes' | 'notificationPreferences'
> & {
  twoFactorBackupCodes?: string[] | null
  notificationPreferences?: Record<string, boolean> | null
}

export type UserListFilters = {
  role?: UserRole
  search?: string
}
