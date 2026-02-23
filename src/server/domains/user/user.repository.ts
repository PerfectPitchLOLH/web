import type { User } from '@prisma/client'

import { db } from '@/server/lib/database'
import type { PaginationParams } from '@/server/shared/types'

import type {
  CreateUserDTO,
  UpdateUserDTO,
  UserListFilters,
} from './user.types'

export class UserRepository {
  async findAll(
    filters?: UserListFilters,
    pagination?: PaginationParams,
  ): Promise<User[]> {
    const where = {
      ...(filters?.role && { role: filters.role }),
      ...(filters?.search && {
        OR: [
          { email: { contains: filters.search, mode: 'insensitive' as const } },
          { name: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    }

    return db.user.findMany({
      where,
      skip: pagination?.page
        ? (pagination.page - 1) * (pagination.limit || 10)
        : 0,
      take: pagination?.limit || 10,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email },
    })
  }

  async create(data: CreateUserDTO): Promise<User> {
    return db.user.create({
      data,
    })
  }

  async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    return db.user.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<boolean> {
    await db.user.delete({
      where: { id },
    })
    return true
  }

  async count(filters?: UserListFilters): Promise<number> {
    const where = {
      ...(filters?.role && { role: filters.role }),
      ...(filters?.search && {
        OR: [
          { email: { contains: filters.search, mode: 'insensitive' as const } },
          { name: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    }

    return db.user.count({ where })
  }
}
