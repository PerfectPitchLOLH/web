'use client'

import {
  CreditCard,
  FileText,
  History,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sun,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { memo, useCallback, useMemo } from 'react'

import { CircularProgressAvatar } from '@/components/dashboard/credits/CircularProgressAvatar'
import { UserMenuSkeleton } from '@/components/dashboard/skeletons/UserMenuSkeleton'
import { UserMenuLabel } from '@/components/dashboard/topbar/UserMenuLabel'
import { WalletDropdownCard } from '@/components/dashboard/topbar/WalletDropdownCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCredits } from '@/hooks/useCredits'
import { useSubscription } from '@/hooks/useSubscription'

export const UserMenu = memo(function UserMenu() {
  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const { credits } = useCredits()
  const { subscription } = useSubscription()
  const hasSubscription = subscription?.hasActiveSubscription ?? false

  const userEmail = useMemo(
    () => session?.user?.email ?? 'Loading...',
    [session?.user?.email],
  )

  const userName = useMemo(
    () => session?.user?.name ?? 'Mon compte',
    [session?.user?.name],
  )

  const userImage = useMemo(
    () => session?.user?.image ?? null,
    [session?.user?.image],
  )

  const userInitial = useMemo(
    () => session?.user?.name?.charAt(0).toUpperCase() ?? 'U',
    [session?.user?.name],
  )

  const isAdmin = useMemo(
    () => session?.user?.role === 'admin',
    [session?.user?.role],
  )

  const creditsPercentage = useMemo(() => {
    if (!credits) return 75
    const total = credits.totalCredits
    return total > 0 ? (credits.remainingCredits / total) * 100 : 0
  }, [credits])

  const handleThemeToggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const handleSignOut = useCallback(async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }, [])

  if (status === 'loading') {
    return <UserMenuSkeleton />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-10 rounded-full p-0">
          <CircularProgressAvatar percentage={creditsPercentage}>
            <Avatar className="size-10">
              <AvatarImage src={userImage || undefined} alt={userName} />
              <AvatarFallback>
                {userInitial ? (
                  <span className="text-sm font-medium">{userInitial}</span>
                ) : (
                  <UserCircle className="size-6" />
                )}
              </AvatarFallback>
            </Avatar>
          </CircularProgressAvatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end">
        <DropdownMenuLabel>
          <UserMenuLabel name={userName} email={userEmail} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2 py-3">
          <WalletDropdownCard />
        </div>

        <DropdownMenuSeparator />

        {isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield className="mr-2 size-4 text-red-500" />
                <span className="font-semibold text-red-500">Admin Panel</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="mr-2 size-4" />
            Paramètres
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/dashboard/subscription">
            <CreditCard className="mr-2 size-4" />
            {hasSubscription ? "Gestion de l'abonnement" : 'Abonnement'}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleThemeToggle}>
          {theme === 'dark' ? (
            <>
              <Sun className="mr-2 size-4" />
              Mode clair
            </>
          ) : (
            <>
              <Moon className="mr-2 size-4" />
              Mode sombre
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/dashboard/payments">
            <Wallet className="mr-2 size-4" />
            Paiements
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/dashboard/credits/history">
            <History className="mr-2 size-4" />
            Historique des crédits
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard/affiliate">
            <Users className="mr-2 size-4" />
            Devenir affilié
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/terms">
            <FileText className="mr-2 size-4" />
            Conditions & Confidentialité
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 size-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
