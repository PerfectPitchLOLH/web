'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { useAnalytics } from '@/hooks/useAnalytics'
import { useCompleteOnboarding } from '@/hooks/useSettings'

export type OnboardingStep = {
  target: string
  title: string
  description: string
  href?: string
  side: 'top' | 'bottom' | 'left' | 'right'
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: 'upload',
    title: 'Transformez un audio en partition',
    description:
      'Importez un fichier audio (guitare, basse, voix, piano) et obtenez sa notation ou sa tablature en quelques minutes.',
    href: '/dashboard/audio-to-sheet',
    side: 'right',
  },
  {
    target: 'partitions',
    title: 'Retrouvez vos partitions',
    description:
      'Toutes vos transcriptions terminées sont rangées ici : consultez, renommez ou supprimez-les à tout moment.',
    href: '/dashboard/partitions',
    side: 'right',
  },
  {
    target: 'credits',
    title: 'Suivez vos minutes de transcription',
    description:
      'Ce module affiche vos crédits restants et la date de leur prochain renouvellement.',
    href: '/dashboard',
    side: 'bottom',
  },
  {
    target: 'subscription',
    title: 'Gérez votre abonnement',
    description:
      "Besoin de plus de minutes ? Changez de formule ou achetez des crédits depuis l'espace Abonnement & Crédits.",
    href: '/dashboard/subscription',
    side: 'right',
  },
]

export type TargetRect = {
  top: number
  left: number
  width: number
  height: number
}

function measure(target: string): TargetRect | null {
  const element = document.querySelector(`[data-onboarding-step="${target}"]`)
  if (!element) return null

  const rect = element.getBoundingClientRect()
  // Hidden elements (collapsed sidebar on mobile) report a 0×0 rect —
  // spotlighting them would highlight the viewport corner
  if (rect.width === 0 || rect.height === 0) return null

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

export function useOnboardingTour(active: boolean) {
  const router = useRouter()
  const { track } = useAnalytics()
  const [completeOnboarding] = useCompleteOnboarding()

  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<TargetRect | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  const step = ONBOARDING_STEPS[stepIndex]
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1

  useEffect(() => {
    if (!active || !step?.href) return

    // Only re-run when the step changes, not on every pathname change —
    // otherwise the tour fights any navigation the user does mid-tour.
    router.push(step.href)
  }, [active, step, router])

  useEffect(() => {
    if (!active || !step) {
      setRect(null)
      return
    }

    let frame = 0
    const update = () => {
      frame = requestAnimationFrame(() => setRect(measure(step.target)))
    }

    update()
    // The target may mount only after the step's router.push resolves —
    // poll until the page settles
    const interval = setInterval(update, 400)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      cancelAnimationFrame(frame)
      clearInterval(interval)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, step])

  const finish = useCallback(
    async (skipped: boolean) => {
      if (isFinishing) return
      setIsFinishing(true)
      track({
        name: 'onboarding_completed',
        properties: { skipped, lastStep: stepIndex },
      })
      try {
        await completeOnboarding()
      } catch {
        // best-effort: tour must close even if persistence fails
      }
    },
    [completeOnboarding, isFinishing, stepIndex, track],
  )

  const next = useCallback(() => {
    if (isLastStep) {
      void finish(false)
      return
    }
    setStepIndex((current) => current + 1)
  }, [finish, isLastStep])

  const previous = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1))
  }, [])

  const skip = useCallback(() => {
    void finish(true)
  }, [finish])

  return {
    isVisible: active && !isFinishing && !!step,
    step,
    stepIndex,
    stepCount: ONBOARDING_STEPS.length,
    isLastStep,
    rect,
    next,
    previous,
    skip,
  }
}
