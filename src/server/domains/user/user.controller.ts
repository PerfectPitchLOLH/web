import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils'

import {
  createUserSchema,
  getUsersQuerySchema,
  updateUserSchema,
  userIdSchema,
} from './user.schemas'
import { UserService } from './user.service'

export class UserController {
  constructor(private service: UserService) {}

  async getUsers(request: NextRequest) {
    try {
      const { searchParams } = request.nextUrl

      const queryParams = {
        role: searchParams.get('role') || undefined,
        search: searchParams.get('search') || undefined,
        page: searchParams.get('page') || undefined,
        limit: searchParams.get('limit') || undefined,
      }

      const validated = getUsersQuerySchema.parse(queryParams)

      const filters = {
        role: validated.role,
        search: validated.search,
      }

      const pagination = {
        page: validated.page,
        limit: validated.limit,
      }

      const data = await this.service.getUsers(filters, pagination)
      return createSuccessResponse(data)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async getUserById(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      const { id } = await params
      const validatedId = userIdSchema.parse(id)
      const user = await this.service.getUserById(validatedId)
      return createSuccessResponse(user)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid user ID',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async createUser(request: NextRequest) {
    try {
      const body = await request.json()
      const validated = createUserSchema.parse(body)
      const user = await this.service.createUser(validated)
      return createSuccessResponse(user, HTTP_STATUS.CREATED)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid user data',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async updateUser(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      const { id } = await params
      const validatedId = userIdSchema.parse(id)
      const body = await request.json()
      const validated = updateUserSchema.parse(body)
      const user = await this.service.updateUser(validatedId, validated)
      return createSuccessResponse(user)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request data',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async deleteUser(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      const { id } = await params
      const validatedId = userIdSchema.parse(id)
      await this.service.deleteUser(validatedId)
      return createSuccessResponse(null, HTTP_STATUS.NO_CONTENT)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid user ID',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }
}
