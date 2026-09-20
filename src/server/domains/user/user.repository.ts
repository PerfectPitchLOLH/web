import { Prisma } from '@prisma/client'

import { db } from '@/server/lib/database'
import type { PaginationParams } from '@/server/shared/types'

import type {
  CreateUserDTO,
  PublicUser,
  UpdateUserDTO,
  UserListFilters,
} from './user.types'

const PUBLIC_USER_OMIT = {
  password: true,
  twoFactorSecret: true,
  twoFactorBackupCodes: true,
} as const

export class UserRepository {
  async findAll(
    filters?: UserListFilters,
    pagination?: PaginationParams,
  ): Promise<PublicUser[]> {
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
      omit: PUBLIC_USER_OMIT,
      skip: pagination?.page
        ? (pagination.page - 1) * (pagination.limit ?? 10)
        : 0,
      take: pagination?.limit ?? 10,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: string): Promise<PublicUser | null> {
    return db.user.findUnique({
      where: { id },
      omit: PUBLIC_USER_OMIT,
    })
  }

  async findByEmail(email: string): Promise<PublicUser | null> {
    return db.user.findUnique({
      where: { email },
      omit: PUBLIC_USER_OMIT,
    })
  }

  async create(data: CreateUserDTO): Promise<PublicUser> {
    return db.user.create({
      data,
      omit: PUBLIC_USER_OMIT,
    })
  }

  async update(id: string, data: UpdateUserDTO): Promise<PublicUser | null> {
    return db.user.update({
      where: { id },
      omit: PUBLIC_USER_OMIT,
      data: {
        ...data,
        twoFactorBackupCodes:
          data.twoFactorBackupCodes === null
            ? Prisma.JsonNull
            : data.twoFactorBackupCodes,
        notificationPreferences:
          data.notificationPreferences === null
            ? Prisma.JsonNull
            : data.notificationPreferences,
      },
    })
  }

  async delete(id: string): Promise<boolean> {
    await db.user.delete({
      where: { id },
    })
    return true
  }

  async findActivationData(userId: string): Promise<{
    emailVerified: Date | null
    activationChecklistDismissedAt: Date | null
    fallingNotesTriedAt: Date | null
    transcriptionCount: number
    partitionCount: number
  } | null> {
    const [user, transcriptionCount, partitionCount] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          emailVerified: true,
          activationChecklistDismissedAt: true,
          fallingNotesTriedAt: true,
        },
      }),
      db.transcriptionJob.count({ where: { userId } }),
      db.savedPartition.count({ where: { userId } }),
    ])

    if (!user) return null
    return { ...user, transcriptionCount, partitionCount }
  }

  async dismissActivationChecklist(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: { activationChecklistDismissedAt: new Date() },
    })
  }

  async markFallingNotesTried(userId: string): Promise<void> {
    await db.user.updateMany({
      where: { id: userId, fallingNotesTriedAt: null },
      data: { fallingNotesTriedAt: new Date() },
    })
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
