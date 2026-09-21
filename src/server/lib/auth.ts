import { PrismaAdapter } from '@auth/prisma-adapter'
import { cookies } from 'next/headers'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

import { auditLogger } from '@/server/shared/utils/audit.logger'
import {
  checkRateLimit,
  getClientIP,
  getSignInRateLimitKey,
  rateLimiters,
} from '@/server/shared/utils/rate-limit.utils'

import { AuthRepository } from '../domains/auth/auth.repository'
import { signInSchema } from '../domains/auth/auth.schemas'
import { DEV_MODE_COOKIE_NAME } from '../domains/dev-mode'
import { verifyPassword } from '../shared/utils/password.utils'
import { db } from './database'

const MAX_SESSION_DURATION_MS = 30 * 60 * 1000
const TIMING_EQUALIZER_HASH =
  '$2b$12$uZCeUtGKmz1QbMepfo7v1eNLkpVEobqgc.S0GkBboqHkRg1F5suhm'
const authRepository = new AuthRepository()

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as any,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
    newUser: '/dashboard',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        try {
          const { email, password } = await signInSchema.parseAsync(credentials)

          const ip = getClientIP(request)
          const rateLimitKey = getSignInRateLimitKey(email, ip)
          const { success } = await checkRateLimit(
            rateLimiters.signIn,
            rateLimitKey,
          )

          if (!success) {
            auditLogger.logRateLimitExceeded(rateLimitKey, 'signin', ip)
            return null
          }

          const user = await db.user.findUnique({
            where: { email },
          })

          // Compare against a dummy hash when the account is unknown so the
          // response time matches a wrong password
          const isPasswordValid = await verifyPassword(
            password,
            user?.password ?? TIMING_EQUALIZER_HASH,
          )

          if (!user?.password || !isPasswordValid) {
            return null
          }

          if (user.suspendedAt) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            emailVerified: user.emailVerified,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'credentials' || !user.email) {
        return true
      }

      const existing = await authRepository.findSuspendedAtByEmail(user.email)
      return !existing?.suspendedAt
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.emailVerified = user.emailVerified
      }

      if (trigger === 'update' && token.id) {
        const freshUser = await authRepository.findEmailVerifiedById(
          token.id as string,
        )
        if (freshUser) {
          token.emailVerified = freshUser.emailVerified
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.emailVerified = token.emailVerified as Date | null

        if (!session.user.emailVerified) {
          const freshUser = await authRepository.findEmailVerifiedById(
            session.user.id,
          )
          session.user.emailVerified = freshUser?.emailVerified ?? null
        }
      }

      const cookieStore = await cookies()

      const impersonationCookie = cookieStore.get('impersonation_session_id')

      let finalSession = session

      if (impersonationCookie?.value && session.user.role === 'admin') {
        try {
          const impersonationSession = await db.impersonationSession.findUnique(
            {
              where: {
                id: impersonationCookie.value,
                isActive: true,
              },
              include: {
                admin: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                targetUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    emailVerified: true,
                    image: true,
                  },
                },
              },
            },
          )

          if (
            impersonationSession &&
            impersonationSession.adminId === session.user.id
          ) {
            const currentAdmin = await db.user.findUnique({
              where: { id: impersonationSession.adminId },
              select: { role: true },
            })

            if (currentAdmin && currentAdmin.role === 'admin') {
              const sessionAge =
                Date.now() - impersonationSession.startedAt.getTime()

              if (sessionAge <= MAX_SESSION_DURATION_MS) {
                finalSession = {
                  ...session,
                  user: {
                    id: impersonationSession.targetUser.id,
                    name: impersonationSession.targetUser.name,
                    email: impersonationSession.targetUser.email,
                    role: impersonationSession.targetUser.role,
                    emailVerified:
                      impersonationSession.targetUser.emailVerified,
                    image: impersonationSession.targetUser.image,
                  },
                  impersonation: {
                    isActive: true,
                    adminId: impersonationSession.adminId,
                    adminEmail: impersonationSession.admin.email,
                    sessionId: impersonationSession.id,
                  },
                }
              } else {
                await db.impersonationSession.update({
                  where: { id: impersonationSession.id },
                  data: {
                    endedAt: new Date(),
                    isActive: false,
                  },
                })
              }
            } else {
              await db.impersonationSession.update({
                where: { id: impersonationSession.id },
                data: {
                  endedAt: new Date(),
                  isActive: false,
                },
              })
            }
          }
        } catch {
          // Ignore error
        }
      }

      const devModeCookie = cookieStore.get(DEV_MODE_COOKIE_NAME)
      if (devModeCookie?.value && finalSession.user.role === 'admin') {
        try {
          finalSession.devMode = JSON.parse(devModeCookie.value)
        } catch {
          // Ignore error
        }
      }

      return finalSession
    },
  },
  trustHost: true,
})
