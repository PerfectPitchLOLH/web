'use client'

import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileMusic, MoreHorizontal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PartitionCardProps {
  id: string
  title: string
  instrument: string
  partitionType: string
  tags: string[]
  createdAt: Date
  durationSeconds?: number | null
  onView: (id: string) => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
  className?: string
  style?: React.CSSProperties
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m${s.toString().padStart(2, '0')}s`
}

export function PartitionCard({
  id,
  title,
  instrument,
  partitionType,
  tags,
  createdAt,
  durationSeconds,
  onView,
  onRename,
  onDelete,
  className,
  style,
}: PartitionCardProps) {
  return (
    <Card
      className={`hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer ${className ?? ''}`}
      style={style}
      onClick={() => onView(id)}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-center h-32 bg-muted rounded-t-lg border-b">
          <FileMusic className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="p-4 space-y-2">
          <p className="font-medium truncate">{title}</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs capitalize">
              {instrument}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {partitionType}
            </Badge>
          </div>
          {tags.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              {tags.join(' · ')}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), {
              addSuffix: true,
              locale: fr,
            })}
            {durationSeconds ? ` · ${formatDuration(durationSeconds)}` : ''}
          </p>
          <div
            className="flex items-center justify-between pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="sm" onClick={() => onView(id)}>
              Ouvrir
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(id)}>
                  Ouvrir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRename(id)}>
                  Renommer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(id)}
                >
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
