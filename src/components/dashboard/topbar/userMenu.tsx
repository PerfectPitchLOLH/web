'use client'

import {
  CreditCard,
  FileText,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sparkles,
  Sun,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { memo, useCallback, useMemo } from 'react'

import { UserMenuSkeleton } from '@/components/dashboard/skeletons/UserMenuSkeleton'
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

export const UserMenu = memo(function UserMenu() {
  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()

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

  const handleThemeToggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const handleSignOut = useCallback(async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }, [])

  const credits = {
    total: 1000,
    remaining: 750,
  }

  if (status === 'loading') {
    return <UserMenuSkeleton />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-10 rounded-full p-0">
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
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2 py-3">
          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-amber-500" />
                <span className="text-sm font-medium">Solde de crédits</span>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold">{credits.remaining}</span>
              <span className="text-sm text-muted-foreground">
                / {credits.total}
              </span>
            </div>
            <Button size="sm" className="mt-2 w-full" variant="outline" asChild>
              <Link href="/dashboard/upgrade">
                <Sparkles className="mr-2 size-4" />
                Acheter des crédits
              </Link>
            </Button>
          </div>
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
            Abonnement
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
