'use client'

import type { Session } from 'next-auth'

import { ImpersonationBanner } from '@/components/admin/impersonation'
import { EmailVerificationBanner } from '@/components/dashboard/EmailVerificationBanner'
import { OnboardingTour } from '@/components/dashboard/onboarding/OnboardingTour'
import { PaymentFailedBanner } from '@/components/dashboard/PaymentFailedBanner'
import { AppSidebar } from '@/components/dashboard/sidebar/AppSidebar'
import { DashboardTopbar } from '@/components/dashboard/topbar/DashboardTopbar'
import { DevModeBox } from '@/components/dev-mode/DevModeBox'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus'

interface DashboardShellProps {
  children: React.ReactNode
  session: Session
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  const { shouldShowTour } = useOnboardingStatus()

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <OnboardingTour active={shouldShowTour} />
        <ImpersonationBanner />
        <DevModeBox />
        <div className="flex h-screen overflow-hidden w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-h-0">
            <DashboardTopbar />
            <PaymentFailedBanner />
            <EmailVerificationBanner />
            <main className="flex-1 min-h-0 overflow-auto flex flex-col">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </SessionProvider>
  )
}
