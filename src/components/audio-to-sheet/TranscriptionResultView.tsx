'use client'

import { BookmarkCheck, BookmarkPlus, Loader2, Music2 } from 'lucide-react'
import { useState } from 'react'

import { SavePartitionDialog } from '@/components/partitions/SavePartitionDialog'
import { ProtectedSheetMusic } from '@/components/sheet-music/ProtectedSheetMusic'
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
import type { TranscribeConfig } from '@/server/domains/transcription/transcription.types'

interface TranscriptionResultViewProps {
  selectedFile: File | null
  svgContent: string | null
  savedPartitionId: string | null
  config: TranscribeConfig
  jobId: string
  jobTitle: string | null
  durationSeconds: number
  onReset: () => void
  onSaved: (partitionId: string) => void
}

export function TranscriptionResultView({
  selectedFile,
  svgContent,
  savedPartitionId,
  jobId,
  jobTitle,
  onReset,
  onSaved,
}: TranscriptionResultViewProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)

  const title =
    jobTitle ?? selectedFile?.name.replace(/\.[^/.]+$/, '') ?? 'Transcription'

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      <div className="flex items-center justify-between px-5 h-12 shrink-0 bg-background/90 backdrop-blur-sm border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Music2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{title}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {savedPartitionId ? (
            <>
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <BookmarkCheck className="h-3.5 w-3.5" />
                Sauvegardée
              </span>
              <Button size="sm" variant="outline" onClick={onReset}>
                Nouvelle transcription
              </Button>
            </>
          ) : (
            <>
              <button
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setDiscardDialogOpen(true)}
              >
                Ignorer
              </button>
              <Button size="sm" onClick={() => setSaveDialogOpen(true)}>
                <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />
                Sauvegarder
              </Button>
            </>
          )}
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

      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignorer la partition ?</AlertDialogTitle>
            <AlertDialogDescription>
              Attention, cette partition sera perdue et les crédits auront été
              utilisés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onReset}>
              Ignorer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SavePartitionDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        defaultTitle={title}
        jobId={jobId}
        originalFileName={selectedFile?.name}
        onSaved={onSaved}
      />
    </div>
  )
}
