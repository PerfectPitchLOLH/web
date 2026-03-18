import { NextRequest } from 'next/server'

import {
  ERROR_CODES,
  HTTP_STATUS,
} from '@/server/shared/constants/http.constants'
import { requireAuth } from '@/server/shared/middleware'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils'
import {
  checkRateLimit,
  getClientIP,
  getRateLimitIdentifier,
  rateLimiters,
} from '@/server/shared/utils'

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
      const ip = getClientIP(request)
      const identifier = getRateLimitIdentifier(ip)

      const { success, reset } = await checkRateLimit(
        rateLimiters.signUp,
        identifier,
      )

      if (!success) {
        const response = createErrorResponse(
          'TOO_MANY_REQUESTS',
          'Too many signup attempts. Please try again later.',
          { retryAfter: new Date(reset).toISOString() },
          HTTP_STATUS.TOO_MANY_REQUESTS,
        )
        response.headers.set(
          'Retry-After',
          Math.ceil((reset - Date.now()) / 1000).toString(),
        )
        return response
      }

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

      const ip = getClientIP(request)
      const identifier = getRateLimitIdentifier(ip, validated.email)

      const { success, reset } = await checkRateLimit(
        rateLimiters.signIn,
        identifier,
      )

      if (!success) {
        const response = createErrorResponse(
          'TOO_MANY_REQUESTS',
          'Too many signin attempts. Please try again later.',
          { retryAfter: new Date(reset).toISOString() },
          HTTP_STATUS.TOO_MANY_REQUESTS,
        )
        response.headers.set(
          'Retry-After',
          Math.ceil((reset - Date.now()) / 1000).toString(),
        )
        return response
      }

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

      const ip = getClientIP(request)
      const identifier = getRateLimitIdentifier(ip, email)

      const { success, reset } = await checkRateLimit(
        rateLimiters.passwordReset,
        identifier,
      )

      if (!success) {
        const response = createErrorResponse(
          'TOO_MANY_REQUESTS',
          'Too many password reset attempts. Please try again later.',
          { retryAfter: new Date(reset).toISOString() },
          HTTP_STATUS.TOO_MANY_REQUESTS,
        )
        response.headers.set(
          'Retry-After',
          Math.ceil((reset - Date.now()) / 1000).toString(),
        )
        return response
      }

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

  async resendVerificationEmail(request: NextRequest) {
    try {
      const session = await requireAuth()

      const ip = getClientIP(request)
      const identifier = getRateLimitIdentifier(ip, session.user.email)

      const { success, reset } = await checkRateLimit(
        rateLimiters.verificationEmail,
        identifier,
      )

      if (!success) {
        const response = createErrorResponse(
          'TOO_MANY_REQUESTS',
          'Too many verification email requests. Please try again later.',
          { retryAfter: new Date(reset).toISOString() },
          HTTP_STATUS.TOO_MANY_REQUESTS,
        )
        response.headers.set(
          'Retry-After',
          Math.ceil((reset - Date.now()) / 1000).toString(),
        )
        return response
      }

      await this.service.resendVerificationEmail(session.user.email)
      return createSuccessResponse({
        message: 'Verification email sent successfully',
      })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
