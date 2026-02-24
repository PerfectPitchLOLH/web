'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function NavbarLogo() {
  const [mounted, setMounted] = useState(false)
  const { theme, resolvedTheme } = useTheme()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const currentTheme = mounted ? resolvedTheme || theme : 'dark'
  const logoSrc = currentTheme === 'dark' ? '/logo_dark.svg' : '/logo_light.svg'

  return (
    <Link href="/" className="group cursor-pointer">
      <div className="flex items-center gap-3 transition-transform">
        <div className="relative w-9 h-9">
          <Image
            src={logoSrc}
            alt="Notavex Logo"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
        </div>
        <span className="text-xl font-bold bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Notavex
        </span>
      </div>
    </Link>
  )
}
