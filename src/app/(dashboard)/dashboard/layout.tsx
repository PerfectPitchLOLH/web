import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { auth } from '@/server/lib/auth'

export const metadata: Metadata = {
  title: 'Dashboard - Notavex',
  description: 'Votre espace de travail musical',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  return <DashboardShell session={session}>{children}</DashboardShell>
}
