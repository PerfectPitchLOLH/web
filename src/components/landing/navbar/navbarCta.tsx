import { cookies } from 'next/headers'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { ShimmerButton } from '@/components/ui/shimmer-button'
import { COLORS } from '@/lib/constants'
import { auth } from '@/server/lib/auth'

export async function NavbarCTA({ className }: { className?: string }) {
  const session = await auth()
  const t = await getTranslations('Navbar')
  let href: string
  if (session) {
    href = '/dashboard'
  } else {
    const cookieStore = await cookies()
    href = cookieStore.has('nv_visited') ? '/auth/signin' : '/auth/signup'
  }

  return (
    <Link href={href} className={className ?? 'cursor-pointer'}>
      <ShimmerButton
        shimmerColor={COLORS.brand.accent}
        shimmerSize="0.25em"
        shimmerDuration="2s"
        background={COLORS.brand.primary}
        className="text-sm font-semibold cursor-pointer"
      >
        {t('tryFree')}
      </ShimmerButton>
    </Link>
  )
}
