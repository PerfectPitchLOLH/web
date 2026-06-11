'use client'

import { FileMusic, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { formatDuration } from '@/components/audio-to-sheet/audio-to-sheet.constants'
import { Button } from '@/components/ui/button'

interface SelectedFileCardProps {
  file: File
  durationSeconds?: number
  onRemove: () => void
  disabled?: boolean
}

export function SelectedFileCard({
  file,
  durationSeconds,
  onRemove,
  disabled,
}: SelectedFileCardProps) {
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file])

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileMusic className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(file.size / 1024 / 1024).toFixed(2)} MB
            {durationSeconds ? ` · ${formatDuration(durationSeconds)}` : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Retirer le fichier"
          onClick={onRemove}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <audio
        controls
        src={objectUrl}
        preload="metadata"
        className="w-full h-9"
      />
    </div>
  )
}
