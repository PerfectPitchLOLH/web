import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '@/server/lib/email'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'
import {
  hashPassword,
  verifyPassword,
} from '@/server/shared/utils/password.utils'

import type { AuthRepository } from './auth.repository'
import type { AuthUser, SignInData, SignUpData } from './auth.types'

function generateSecureToken(length: number = 32): string {
  const buffer = new Uint8Array(length)
  crypto.getRandomValues(buffer)
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export class AuthService {
  constructor(private repository: AuthRepository) {}

  async signUp(data: SignUpData): Promise<AuthUser> {
    const existingUser = await this.repository.findUserByEmail(data.email)

    if (existingUser) {
      throw new ApiError(
        'CONFLICT',
        HTTP_STATUS.CONFLICT,
        'Email already registered',
      )
    }

    const hashedPassword = await hashPassword(data.password)

    const user = await this.repository.createUser({
      ...data,
      hashedPassword,
    })

    const verificationToken = generateSecureToken()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.repository.createVerificationToken(
      user.email,
      verificationToken,
      expires,
    )

    await sendVerificationEmail(user.email, verificationToken)

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      image: user.image,
    }
  }

  async signIn(data: SignInData): Promise<AuthUser> {
    const user = await this.repository.findUserByEmail(data.email)

    if (!user || !user.password) {
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Invalid credentials',
      )
    }

    const isPasswordValid = await verifyPassword(data.password, user.password)

    if (!isPasswordValid) {
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Invalid credentials',
      )
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      image: user.image,
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await this.repository.findVerificationToken(token)

    if (!verificationToken) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Invalid verification token',
      )
    }

    if (verificationToken.expires < new Date()) {
      await this.repository.deleteVerificationToken(token)
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Verification token expired',
      )
    }

    const user = await this.repository.findUserByEmail(
      verificationToken.identifier,
    )

    if (!user) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    await this.repository.verifyEmail(user.id)
    await this.repository.deleteVerificationToken(token)
  }

  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.repository.findUserByEmail(email)

    if (!user) {
      return 'ok'
    }

    const resetToken = generateSecureToken()
    const expires = new Date(Date.now() + 60 * 60 * 1000)

    await this.repository.createVerificationToken(email, resetToken, expires)
    await sendPasswordResetEmail(email, resetToken)

    return resetToken
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const verificationToken = await this.repository.findVerificationToken(token)

    if (!verificationToken) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Invalid reset token',
      )
    }

    if (verificationToken.expires < new Date()) {
      await this.repository.deleteVerificationToken(token)
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Reset token expired',
      )
    }

    const user = await this.repository.findUserByEmail(
      verificationToken.identifier,
    )

    if (!user) {
      throw new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found')
    }

    const hashedPassword = await hashPassword(newPassword)
    await this.repository.updatePassword(user.id, hashedPassword)
    await this.repository.deleteVerificationToken(token)
  }
}
