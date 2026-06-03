'use client'

import { X } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'

interface SpotifyPreviewCardProps {
  thumbnailUrl: string
  title: string
  artistName: string
  onRemove: () => void
}

export function SpotifyPreviewCard({
  thumbnailUrl,
  title,
  artistName,
  onRemove,
}: SpotifyPreviewCardProps) {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/40 p-3 items-start">
      <div className="relative shrink-0 w-14 h-14 rounded overflow-hidden bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            unoptimized={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-green-500/10">
            <span className="text-green-500 text-xs font-bold">♪</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-2 leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{artistName}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-7 w-7"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
