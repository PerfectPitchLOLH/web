import { DefaultSession } from 'next-auth'

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
  }
}
