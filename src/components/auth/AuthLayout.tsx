'use client'

import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ReactNode, useEffect, useState } from 'react'

import { GridBackground } from '@/components/landing/GridBackground'

type Props = {
  children: ReactNode
}

export function AuthLayout({ children }: Props) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 100
      const y = (e.clientY / window.innerHeight - 0.5) * 100
      setMousePosition({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative flex items-center justify-center p-8">
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        {children}
      </div>

      <div className="relative hidden lg:flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
        <GridBackground />

        <div
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-primary/60 rounded-full blur-3xl"
          style={{
            transform: mounted
              ? `translate(${mousePosition.x}px, ${mousePosition.y}px)`
              : 'translate(0px, 0px)',
            transition: 'transform 0.2s ease-out',
          }}
        />

        <div
          className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-accent/60 rounded-full blur-3xl"
          style={{
            transform: mounted
              ? `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`
              : 'translate(0px, 0px)',
            transition: 'transform 0.2s ease-out',
          }}
        />

        <div
          className="relative z-10 text-center space-y-4"
          style={{
            transform: mounted
              ? `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)`
              : 'translate(0px, 0px)',
            transition: 'transform 0.15s ease-out',
          }}
        >
          <div className="flex gap-4 items-center justify-around">
            <Image
              src="/logo_light.svg"
              alt="Notavex Logo"
              width={80}
              height={80}
              className="mx-auto dark:hidden"
            />
            <Image
              src="/logo_dark.svg"
              alt="Notavex Logo"
              width={80}
              height={80}
              className="mx-auto hidden dark:block"
            />
            <h1 className="text-6xl font-bold">Notavex</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Transform audio into sheet music
          </p>
        </div>
      </div>
    </div>
  )
}
