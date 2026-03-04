import { PrismaAdapter } from '@auth/prisma-adapter'
import { cookies } from 'next/headers'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

import { signInSchema } from '../domains/auth/auth.schemas'
import { verifyPassword } from '../shared/utils/password.utils'
import { db } from './database'

const MAX_SESSION_DURATION_MS = 30 * 60 * 1000

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
      async authorize(credentials) {
        try {
          const { email, password } = await signInSchema.parseAsync(credentials)

          const user = await db.user.findUnique({
            where: { email },
          })

          if (!user || !user.password) {
            throw new Error('Invalid credentials')
          }

          const isPasswordValid = await verifyPassword(password, user.password)

          if (!isPasswordValid) {
            throw new Error('Invalid credentials')
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.emailVerified = token.emailVerified as Date | null
      }

      const cookieStore = await cookies()
      const impersonationCookie = cookieStore.get('impersonation_session_id')

      if (!impersonationCookie?.value) {
        return session
      }

      if (session.user.role !== 'admin') {
        return session
      }

      try {
        const impersonationSession = await db.impersonationSession.findUnique({
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
        })

        if (!impersonationSession) {
          return session
        }

        if (impersonationSession.adminId !== session.user.id) {
          return session
        }

        const currentAdmin = await db.user.findUnique({
          where: { id: impersonationSession.adminId },
          select: { role: true },
        })

        if (!currentAdmin || currentAdmin.role !== 'admin') {
          await db.impersonationSession.update({
            where: { id: impersonationSession.id },
            data: {
              endedAt: new Date(),
              isActive: false,
            },
          })
          return session
        }

        const sessionAge = Date.now() - impersonationSession.startedAt.getTime()
        if (sessionAge > MAX_SESSION_DURATION_MS) {
          await db.impersonationSession.update({
            where: { id: impersonationSession.id },
            data: {
              endedAt: new Date(),
              isActive: false,
            },
          })
          return session
        }

        const transformedSession = {
          ...session,
          user: {
            id: impersonationSession.targetUser.id,
            name: impersonationSession.targetUser.name,
            email: impersonationSession.targetUser.email,
            role: impersonationSession.targetUser.role,
            emailVerified: impersonationSession.targetUser.emailVerified,
            image: impersonationSession.targetUser.image,
          },
          impersonation: {
            isActive: true,
            adminId: impersonationSession.adminId,
            adminEmail: impersonationSession.admin.email,
            sessionId: impersonationSession.id,
          },
        }

        return transformedSession
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[IMPERSONATION] Error in callback:', error)
        }
        return session
      }
    },
  },
  trustHost: true,
})
