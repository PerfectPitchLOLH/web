import type { User } from '@prisma/client'

import { db } from '@/server/lib/database'

import type { SignUpData } from './auth.types'

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email },
    })
  }

  async createUser(
    data: SignUpData & { hashedPassword: string },
  ): Promise<User> {
    return db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.hashedPassword,
        role: 'user',
      },
    })
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })
  }

  async verifyEmail(userId: string): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    })
  }

  async createVerificationToken(
    email: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    })
  }

  async findVerificationToken(token: string) {
    return db.verificationToken.findUnique({
      where: { token },
    })
  }

  async deleteVerificationToken(token: string): Promise<void> {
    await db.verificationToken.delete({
      where: { token },
    })
  }
}
