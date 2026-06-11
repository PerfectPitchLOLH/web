'use client'

import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowRight, FileMusic, Play } from 'lucide-react'
import Link from 'next/link'

import {
  INSTRUMENT_LABELS,
  PARTITION_TYPE_LABELS,
} from '@/components/audio-to-sheet/audio-to-sheet.constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLastOpenedPartition } from '@/hooks/useLastOpenedPartition'
import { cn } from '@/lib/utils'
import type {
  InstrumentType,
  PartitionType,
} from '@/server/domains/transcription'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m${s.toString().padStart(2, '0')}s`
}

export function ResumeCard() {
  const { partition, loading } = useLastOpenedPartition()

  if (loading) {
    return (
      <div className="h-32 animate-pulse rounded-2xl border border-border/50 bg-muted/30" />
    )
  }

  if (!partition) {
    return (
      <div
        className={cn(
          'flex items-center gap-4 rounded-2xl border border-dashed border-border/70',
          'bg-card/50 p-5 sm:p-6',
        )}
      >
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted sm:size-16">
          <FileMusic className="size-7 text-muted-foreground sm:size-8" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reprendre où vous en étiez
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-muted-foreground">
            Aucune partition pour le moment
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Votre dernier morceau transcrit apparaîtra ici.
          </p>
        </div>
      </div>
    )
  }

  const openedAgo = formatDistanceToNow(
    new Date(partition.lastOpenedAt ?? partition.createdAt),
    { addSuffix: true, locale: fr },
  )

  return (
    <Link
      href={`/dashboard/partitions/${partition.id}`}
      className={cn(
        'group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border/50',
        'bg-gradient-to-br from-card via-card to-card/50 p-5 sm:p-6',
        'shadow-lg shadow-black/5',
        'transition-all duration-300 hover:scale-[1.01] hover:shadow-xl',
      )}
    >
      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:size-16">
        <FileMusic className="size-7 text-primary sm:size-8" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reprendre où vous en étiez
        </p>
        <h3 className="mt-0.5 truncate text-lg font-semibold">
          {partition.title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {INSTRUMENT_LABELS[partition.instrument as InstrumentType] ??
              partition.instrument}
          </Badge>
          <Badge variant="outline" className="hidden text-xs sm:inline-flex">
            {PARTITION_TYPE_LABELS[partition.partitionType as PartitionType] ??
              partition.partitionType}
          </Badge>
          <span>
            {partition.durationSeconds
              ? `${formatDuration(partition.durationSeconds)} · `
              : ''}
            ouvert {openedAgo}
          </span>
        </div>
      </div>

      <Button
        size="sm"
        className="pointer-events-none hidden shrink-0 gap-1.5 sm:flex"
        tabIndex={-1}
      >
        <Play className="size-3.5" />
        Reprendre
      </Button>
      <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:hidden" />

      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-2xl',
          'bg-gradient-to-br from-primary/10 via-transparent to-transparent',
          'opacity-0 blur-xl transition-opacity group-hover:opacity-100',
        )}
      />
    </Link>
  )
}
