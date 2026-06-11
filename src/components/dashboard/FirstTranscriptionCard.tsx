'use client'

import { AudioLines, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FirstTranscriptionCard() {
  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-primary/20',
        'bg-gradient-to-br from-primary/10 via-card to-card p-6',
        'shadow-lg shadow-black/5',
      )}
    >
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/15 p-2.5">
            <Sparkles className="size-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            Créez votre première partition
          </h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Importez un fichier audio — guitare, basse, piano ou voix — et recevez
          sa partition ou sa tablature en quelques minutes.
        </p>
      </div>

      <Button asChild size="lg" className="mt-5 w-full gap-2 sm:w-auto">
        <Link href="/dashboard/audio-to-sheet">
          <AudioLines className="size-4" />
          Commencer à transcrire
        </Link>
      </Button>

      <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 blur-2xl" />
    </div>
  )
}
