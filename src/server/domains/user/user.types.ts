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

export type UpdateUserDTO = UpdateDTO<PrismaUser>

export type UserListFilters = {
  role?: UserRole
  search?: string
}
