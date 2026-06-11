'use client'

import { CheckCircle2, Circle, X } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useActivationStatus } from '@/hooks/useActivationStatus'
import { cn } from '@/lib/utils'

type ChecklistStep = {
  done: boolean
  label: string
  href: string
}

export function ActivationChecklist() {
  const { status, loading, dismiss } = useActivationStatus()

  if (loading || !status || status.dismissed) return null

  const steps: ChecklistStep[] = [
    {
      done: status.emailVerified,
      label: 'Vérifier mon email',
      href: '/dashboard/settings',
    },
    {
      done: status.hasTranscription,
      label: 'Lancer ma première transcription',
      href: '/dashboard/audio-to-sheet',
    },
    {
      done: status.hasSavedPartition,
      label: 'Sauvegarder une partition',
      href: '/dashboard/partitions',
    },
    {
      done: status.triedFallingNotes,
      label: 'Essayer Falling Notes',
      href: '/dashboard/falling-notes',
    },
  ]

  const doneCount = steps.filter((s) => s.done).length
  if (doneCount === steps.length) return null

  const progressPercent = (doneCount / steps.length) * 100

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-border/50',
        'bg-gradient-to-br from-card via-card to-card/50 p-5 sm:p-6',
        'shadow-lg shadow-black/5',
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={dismiss}
        aria-label="Masquer la checklist"
        className="absolute right-3 top-3 h-7 w-7 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </Button>

      <h3 className="pr-8 font-semibold">Bien démarrer avec Notavex</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {doneCount}/{steps.length} étapes complétées
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.label}>
            {step.done ? (
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4.5 shrink-0 text-green-500" />
                <span className="line-through">{step.label}</span>
              </div>
            ) : (
              <Link
                href={step.href}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
              >
                <Circle className="size-4.5 shrink-0 text-muted-foreground" />
                <span>{step.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
