'use client'

import { ArrowLeft, Download, Pencil } from 'lucide-react'
import Link from 'next/link'
import type { RefObject } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PartitionSummary } from '@/server/domains/partition'

interface PartitionViewerHeaderProps {
  partition: PartitionSummary
  isRenaming: boolean
  renameValue: string
  renameInputRef: RefObject<HTMLInputElement | null>
  svgContent: string | null
  onStartRenaming: () => void
  onRenameChange: (value: string) => void
  onRenameBlur: () => void
  onRenameKeyDown: (e: React.KeyboardEvent) => void
  onDownload: () => void
}

export function PartitionViewerHeader({
  partition,
  isRenaming,
  renameValue,
  renameInputRef,
  svgContent,
  onStartRenaming,
  onRenameChange,
  onRenameBlur,
  onRenameKeyDown,
  onDownload,
}: PartitionViewerHeaderProps) {
  return (
    <div className="space-y-3">
      <Link
        href="/dashboard/partitions"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la bibliothèque
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onBlur={onRenameBlur}
              onKeyDown={onRenameKeyDown}
              className="text-3xl font-bold bg-transparent border-b border-primary outline-none w-full"
              maxLength={120}
            />
          ) : (
            <h1
              className="text-3xl font-bold cursor-pointer hover:opacity-70 transition-opacity"
              onClick={onStartRenaming}
            >
              {partition.title}
            </h1>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onStartRenaming}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          {svgContent && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              SVG
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="capitalize">
          {partition.instrument}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {partition.partitionType}
        </Badge>
        {partition.tags.map((tag: string) => (
          <Badge key={tag} variant="outline" className="text-muted-foreground">
            {tag}
          </Badge>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Sauvegardée le{' '}
        {new Date(partition.createdAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        {partition.durationSeconds
          ? ` · ${Math.floor(partition.durationSeconds / 60)} min ${Math.floor(partition.durationSeconds % 60)} s`
          : ''}
      </p>
    </div>
  )
}
