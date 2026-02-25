import { NextRequest } from 'next/server'

import {
  ERROR_CODES,
  HTTP_STATUS,
} from '@/server/shared/constants/http.constants'
import { createSuccessResponse, handleApiError } from '@/server/shared/utils'

import {
  emailSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from './auth.schemas'
import type { AuthService } from './auth.service'

export class AuthController {
  constructor(private service: AuthService) {}

  async signUp(request: NextRequest) {
    try {
      const body = await request.json()
      const validated = signUpSchema.parse(body)
      const user = await this.service.signUp(validated)
      return createSuccessResponse(
        { user, message: 'Verification email sent' },
        HTTP_STATUS.CREATED,
      )
    } catch (error) {
      return handleApiError(error)
    }
  }

  async signIn(request: NextRequest) {
    try {
      const body = await request.json()
      const validated = signInSchema.parse(body)
      const user = await this.service.signIn(validated)
      return createSuccessResponse(user)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async verifyEmail(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url)
      const token = searchParams.get('token')

      if (!token) {
        const { ApiError } = await import('@/server/shared/utils')
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          HTTP_STATUS.BAD_REQUEST,
          'Token required',
        )
      }

      await this.service.verifyEmail(token)
      return createSuccessResponse({ message: 'Email verified successfully' })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async requestPasswordReset(request: NextRequest) {
    try {
      const body = await request.json()
      const { email } = emailSchema.parse(body)
      await this.service.requestPasswordReset(email)
      return createSuccessResponse({
        message: 'If email exists, reset link sent',
      })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async resetPassword(request: NextRequest) {
    try {
      const body = await request.json()
      const { token, password } = resetPasswordSchema.parse(body)
      await this.service.resetPassword(token, password)
      return createSuccessResponse({ message: 'Password reset successfully' })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
