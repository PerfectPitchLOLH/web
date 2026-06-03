'use client'

import { X } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'

interface YoutubePreviewCardProps {
  thumbnailUrl: string
  title: string
  channelName: string
  onRemove: () => void
}

export function YoutubePreviewCard({
  thumbnailUrl,
  title,
  channelName,
  onRemove,
}: YoutubePreviewCardProps) {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/40 p-3 items-start">
      <div className="relative shrink-0 w-28 aspect-video rounded overflow-hidden bg-muted">
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover"
          unoptimized={false}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-2 leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{channelName}</p>
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
