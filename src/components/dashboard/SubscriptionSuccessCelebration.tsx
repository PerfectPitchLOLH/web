'use client'

import confetti from 'canvas-confetti'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/button'
import { useAnalytics } from '@/hooks/useAnalytics'

export function SubscriptionSuccessCelebration() {
  const router = useRouter()
  const { track } = useAnalytics()
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    setMounted(true)
    const url = new URL(window.location.href)
    if (url.searchParams.get('subscribed') === 'true') {
      setIsVisible(true)
      track({ name: 'subscription_created' })
    }
  }, [track])

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return

    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    })

    const fire = (particleRatio: number, opts: confetti.Options) => {
      myConfetti({
        particleCount: Math.floor(200 * particleRatio),
        origin: { y: 0.7 },
        colors: ['#ff6b35', '#ffffff', '#ffa366', '#ff8c5a', '#ffbb99'],
        ...opts,
      })
    }

    const t1 = setTimeout(() => {
      fire(0.25, { spread: 26, startVelocity: 55 })
      fire(0.2, { spread: 60 })
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
      fire(0.1, { spread: 120, startVelocity: 45 })
    }, 500)

    const t2 = setTimeout(() => {
      fire(0.15, { spread: 80, startVelocity: 35, origin: { x: 0.2, y: 0.6 } })
      fire(0.15, { spread: 80, startVelocity: 35, origin: { x: 0.8, y: 0.6 } })
    }, 800)

    const t3 = setTimeout(() => {
      fire(0.2, { spread: 120, startVelocity: 45, origin: { x: 0.5, y: 0.5 } })
    }, 1100)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      myConfetti.reset()
    }
  }, [isVisible])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete('subscribed')
      router.replace(url.pathname + url.search)
      setIsVisible(false)
      setIsExiting(false)
    }, 300)
  }

  if (!mounted) return null

  return (
    <>
      {isVisible &&
        createPortal(
          <canvas
            ref={canvasRef}
            style={{
              position: 'fixed',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 99999,
            }}
          />,
          document.body,
        )}
      {isVisible && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300 ${
            isExiting ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={handleClose}
        >
          <div
            className={`relative mx-4 max-w-lg transform transition-all duration-500 ${
              isExiting
                ? 'scale-95 opacity-0'
                : 'scale-100 opacity-100 animate-in fade-in zoom-in'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm transition-all hover:bg-muted hover:scale-110"
              aria-label="Fermer"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-card via-card to-card/80 p-8 shadow-2xl">
              <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/10" />

              <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80">
                      <Sparkles className="h-8 w-8 text-primary-foreground animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-center">
                  <h2 className="text-3xl font-bold tracking-tight">
                    Abonnement activé !
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Bienvenue dans l&apos;univers premium de Notavex
                  </p>
                </div>

                <div className="space-y-3 rounded-lg bg-muted/50 p-4 backdrop-blur-sm">
                  <h3 className="font-semibold text-foreground">
                    Profitez de vos avantages :
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-primary">✓</span>
                      <span>Minutes de transcription mensuelles incluses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-primary">✓</span>
                      <span>Séparation de stems illimitée</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-primary">✓</span>
                      <span>
                        Accès prioritaire aux nouvelles fonctionnalités
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button
                    onClick={handleClose}
                    className="group relative flex-1 overflow-hidden"
                    size="lg"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Commencer
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
