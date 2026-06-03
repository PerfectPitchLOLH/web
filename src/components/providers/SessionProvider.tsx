'use client'

import type { Session } from 'next-auth'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

import { DevModeProvider } from '@/contexts/DevModeContext'

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session?: Session | null
}) {
  return (
    <NextAuthSessionProvider session={session}>
      <DevModeProvider>{children}</DevModeProvider>
    </NextAuthSessionProvider>
  )
}
