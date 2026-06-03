import { DefaultSession } from 'next-auth'

import type { DevModeConfig } from '@/server/domains/dev-mode/dev-mode.types'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      emailVerified: Date | null
    } & DefaultSession['user']
    impersonation?: {
      isActive: boolean
      adminId: string
      adminEmail: string
      sessionId: string
    }
    devMode?: DevModeConfig
  }

  interface User {
    role: string
    emailVerified: Date | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    emailVerified: Date | null
    impersonation?: {
      isActive: boolean
      adminId: string
      adminEmail: string
      sessionId: string
    }
    devMode?: DevModeConfig
  }
}
