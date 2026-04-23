'use client'

import { CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import type { TranscriptionSession } from '@/lib/transcription-session'
import { formatSessionAge } from '@/lib/transcription-session'

interface ResumeBannerProps {
  session: TranscriptionSession
  resumeHref: string
  onDismiss: () => void
}

export function ResumeBanner({
  session,
  resumeHref,
  onDismiss,
}: ResumeBannerProps) {
  const isCompleted = session.status === 'completed'
  const title = session.title || 'Fichier audio'

  return (
    <div className="rounded-lg border bg-muted px-4 py-3 flex items-start gap-3 animate-in slide-in-from-top-2 fade-in-0 duration-300">
      {isCompleted ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
      ) : (
        <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {isCompleted
            ? `Vous avez une transcription récente : « ${title} »`
            : `Une transcription est en cours : « ${title} » · ${formatSessionAge(session.timestamp)}`}
        </p>
        <p className="text-sm text-muted-foreground">
          {isCompleted
            ? 'Voulez-vous reprendre là où vous en étiez ?'
            : 'Lancée ' + formatSessionAge(session.timestamp) + '.'}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" asChild>
          <Link href={resumeHref}>
            {isCompleted ? 'Voir la partition' : "Suivre l'avancement"}
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss}>
          {isCompleted ? 'Nouvelle transcription' : 'Annuler et recommencer'}
        </Button>
      </div>
    </div>
  )
}
