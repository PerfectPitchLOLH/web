import type { User as PrismaUser } from '@prisma/client'

import type { CreateDTO, UpdateDTO } from '@/server/shared/types'

export type UserRole = 'admin' | 'user' | 'guest'

export type UserEntity = PrismaUser

export type CreateUserDTO = CreateDTO<PrismaUser>

export type UpdateUserDTO = UpdateDTO<PrismaUser>

export type UserListFilters = {
  role?: UserRole
  search?: string
}
