import Link from 'next/link'

import { ShimmerButton } from '@/components/ui/shimmer-button'
import { COLORS } from '@/lib/constants'

export function NavbarCTA({ className }: { className?: string }) {
  return (
    <Link href="#pricing" className={className ?? 'cursor-pointer'}>
      <ShimmerButton
        shimmerColor={COLORS.brand.accent}
        shimmerSize="0.25em"
        shimmerDuration="2s"
        background={COLORS.brand.primary}
        className="text-sm font-semibold cursor-pointer"
      >
        Essayer gratuitement
      </ShimmerButton>
    </Link>
  )
}
