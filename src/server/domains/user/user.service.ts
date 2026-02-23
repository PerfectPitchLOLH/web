import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import type { PaginatedData, PaginationParams } from '@/server/shared/types'
import { ApiError } from '@/server/shared/utils'

import { UserRepository } from './user.repository'
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UserEntity,
  UserListFilters,
} from './user.types'

export class UserService {
  constructor(private repository: UserRepository) {}

  async getUsers(
    filters?: UserListFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedData<UserEntity>> {
    const page = pagination?.page || 1
    const limit = pagination?.limit || 10

    const [items, total] = await Promise.all([
      this.repository.findAll(filters, { page, limit }),
      this.repository.count(filters),
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getUserById(id: string): Promise<UserEntity> {
    const user = await this.repository.findById(id)

    if (!user) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        `User with id ${id} not found`,
      )
    }

    return user
  }

  async createUser(data: CreateUserDTO): Promise<UserEntity> {
    const existingUser = await this.repository.findByEmail(data.email)

    if (existingUser) {
      throw new ApiError(
        'CONFLICT',
        HTTP_STATUS.CONFLICT,
        'User with this email already exists',
      )
    }

    return this.repository.create(data)
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<UserEntity> {
    const existingUser = await this.repository.findById(id)

    if (!existingUser) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        `User with id ${id} not found`,
      )
    }

    if (data.email && data.email !== existingUser.email) {
      const emailTaken = await this.repository.findByEmail(data.email)
      if (emailTaken) {
        throw new ApiError(
          'CONFLICT',
          HTTP_STATUS.CONFLICT,
          'Email already taken',
        )
      }
    }

    const updated = await this.repository.update(id, data)

    if (!updated) {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to update user',
      )
    }

    return updated
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.repository.findById(id)

    if (!user) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        `User with id ${id} not found`,
      )
    }

    const deleted = await this.repository.delete(id)

    if (!deleted) {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to delete user',
      )
    }
  }
}
