'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/button'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'
import { cn } from '@/lib/utils'

import { computeCardPosition } from './onboarding.utils'

const SPOTLIGHT_PADDING = 8

type OnboardingTourProps = {
  active: boolean
}

export function OnboardingTour({ active }: OnboardingTourProps) {
  const [mounted, setMounted] = useState(false)
  const {
    isVisible,
    step,
    stepIndex,
    stepCount,
    isLastStep,
    rect,
    next,
    previous,
    skip,
  } = useOnboardingTour(active)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isVisible || !step) return null

  const spotlight = rect
    ? {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      }
    : null

  const cardPosition = spotlight
    ? computeCardPosition(spotlight, step.side)
    : null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        style={
          spotlight
            ? {
                clipPath: `polygon(
                  0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                  ${spotlight.left}px ${spotlight.top}px,
                  ${spotlight.left}px ${spotlight.top + spotlight.height}px,
                  ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px,
                  ${spotlight.left + spotlight.width}px ${spotlight.top}px,
                  ${spotlight.left}px ${spotlight.top}px
                )`,
              }
            : undefined
        }
        onClick={skip}
      />

      {spotlight && (
        <div
          className="absolute rounded-lg ring-2 ring-primary transition-all duration-300"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        className={cn(
          'absolute w-[min(20rem,calc(100vw-2rem))] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg transition-all duration-300',
          !cardPosition && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
        style={cardPosition ?? undefined}
      >
        <button
          type="button"
          onClick={skip}
          aria-label="Fermer la visite guidée"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <p className="text-xs font-medium text-muted-foreground">
          Étape {stepIndex + 1} / {stepCount}
        </p>
        <h3 className="mt-1 font-semibold">{step.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={skip}>
            Passer
          </Button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={previous}>
                Précédent
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {isLastStep ? 'Terminer' : 'Suivant'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
