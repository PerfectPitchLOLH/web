'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import { NavbarCTA } from './navbar-cta'
import { NavbarLanguageSelector } from './navbar-language-selector'
import { NavbarLinks } from './navbar-links'
import { NavbarLogo } from './navbar-logo'
import { NavbarThemeToggle } from './navbar-theme-toggle'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={cn(
        'fixed flex items-center justify-around w-full top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? ' mx-auto mt-4' : '',
      )}
    >
      <div
        className={cn(
          'transition-all duration-300 w-11/12 md:w-9/12',
          isScrolled
            ? 'bg-background/80 backdrop-blur-lg border border-white/10 shadow-lg rounded-xl'
            : 'bg-transparent',
        )}
      >
        <div className="flex justify-center items-center mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 w-full">
            <NavbarLogo />
            <NavbarLinks className="hidden md:flex" />
            <div className="flex items-center gap-2 md:gap-3">
              <NavbarThemeToggle />
              <NavbarLanguageSelector />
              <NavbarCTA className="hidden md:flex" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
