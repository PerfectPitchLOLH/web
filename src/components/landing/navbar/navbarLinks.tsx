'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

const links = [
  { label: 'Overview', href: '#overview' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
]

export function NavbarLinks({ className }: { className?: string }) {
  const [activeSection, setActiveSection] = useState('')
  const isScrollingRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingRef.current) return

      const sections = links.map((link) => link.href.slice(1))
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault()
    const sectionId = href.slice(1)

    isScrollingRef.current = true
    setActiveSection(sectionId)

    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })

      setTimeout(() => {
        isScrollingRef.current = false
      }, 1000)
    }
  }

  return (
    <div className={cn('flex items-center gap-8', className)}>
      {links.map((link) => {
        const isActive = activeSection === link.href.slice(1)
        return (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleClick(e, link.href)}
            className={`relative text-sm font-medium transition-colors cursor-pointer ${
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {link.label}
            {isActive && (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </a>
        )
      })}
    </div>
  )
}
