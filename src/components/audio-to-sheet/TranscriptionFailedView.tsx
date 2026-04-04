'use client'

import { XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface TranscriptionFailedViewProps {
  error: string | null
  onReset: () => void
}

export function TranscriptionFailedView({
  error,
  onReset,
}: TranscriptionFailedViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 min-h-0">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-lg">Transcription échouée</p>
          <p className="text-sm text-muted-foreground">
            {error || 'Une erreur est survenue lors de la transcription.'}
          </p>
        </div>
        <Button onClick={onReset} className="w-full">
          Réessayer
        </Button>
      </div>
    </div>
  )
}
