'use client'

import {
  BookmarkCheck,
  BookmarkPlus,
  Loader2,
  Music2,
  Pencil,
  Trash2,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { toast } from 'sonner'

import { SavePartitionDialog } from '@/components/partitions/SavePartitionDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { usePartitionResultActions } from '@/hooks/usePartitionResultActions'

const ProtectedSheetMusic = dynamic(
  () =>
    import('@/components/sheet-music/ProtectedSheetMusic').then(
      (mod) => mod.ProtectedSheetMusic,
    ),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> },
)

interface TranscriptionResultViewProps {
  svgContent: string | null
  savedPartitionId: string | null
  jobId: string
  jobTitle: string | null
  isAutoSaving: boolean
  autoSaveFailed: boolean
  onReset: () => void
  onSaved: (partitionId: string) => void
}

export function TranscriptionResultView({
  svgContent,
  savedPartitionId,
  jobId,
  jobTitle,
  isAutoSaving,
  autoSaveFailed,
  onReset,
  onSaved,
}: TranscriptionResultViewProps) {
  const [title, setTitle] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const { isRenaming, isDeleting, renamePartition, deletePartition } =
    usePartitionResultActions(savedPartitionId, onReset)

  const displayTitle = title ?? jobTitle ?? 'Transcription'

  const startEditing = () => {
    setEditValue(displayTitle)
    setIsEditingTitle(true)
  }

  const commitRename = async () => {
    setIsEditingTitle(false)
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === displayTitle) return
    const ok = await renamePartition(trimmed)
    if (ok) {
      setTitle(trimmed)
      toast.success('Partition renommée')
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      <div className="flex items-center justify-between gap-3 px-5 h-12 shrink-0 bg-background/90 backdrop-blur-sm border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Music2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {isEditingTitle ? (
            <Input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setIsEditingTitle(false)
              }}
              maxLength={120}
              className="h-7 w-64 text-sm"
              aria-label="Nom de la partition"
            />
          ) : (
            <>
              <span className="text-sm font-medium truncate">
                {displayTitle}
              </span>
              {savedPartitionId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground"
                  aria-label="Renommer la partition"
                  onClick={startEditing}
                  disabled={isRenaming}
                >
                  {isRenaming ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Pencil className="h-3 w-3" />
                  )}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAutoSaving && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sauvegarde...
            </span>
          )}

          {savedPartitionId && (
            <>
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <BookmarkCheck className="h-3.5 w-3.5" />
                Dans la bibliothèque
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Supprimer la partition"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {autoSaveFailed && !savedPartitionId && (
            <Button size="sm" onClick={() => setSaveDialogOpen(true)}>
              <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />
              Sauvegarder
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={onReset}>
            Nouvelle transcription
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-muted/20">
        {svgContent ? (
          <ProtectedSheetMusic
            svgContent={svgContent}
            enableProtection={true}
            onSuspiciousActivity={(type, count) => {
              console.warn(`[Protection] ${type} (${count})`)
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center gap-2.5 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Chargement de la partition...</span>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette partition ?</AlertDialogTitle>
            <AlertDialogDescription>
              Elle sera retirée de votre bibliothèque. Les crédits utilisés ne
              sont pas remboursés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deletePartition} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SavePartitionDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        defaultTitle={displayTitle}
        jobId={jobId}
        onSaved={onSaved}
      />
    </div>
  )
}
