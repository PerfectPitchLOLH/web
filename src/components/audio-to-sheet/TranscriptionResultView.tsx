'use client'

import {
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { TranscribeConfig } from '@/server/domains/transcription/transcription.types'

import { INSTRUMENT_LABELS } from './audio-to-sheet.constants'

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
  config,
  jobId,
  jobTitle,
  durationSeconds,
  onReset,
  onSaved,
}: TranscriptionResultViewProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span className="font-medium truncate">
            {selectedFile?.name.replace(/\.[^/.]+$/, '') ?? 'Transcription'}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground shrink-0">
            {durationSeconds.toFixed(1)}s
          </span>
          <Badge variant="secondary" className="shrink-0 capitalize">
            {INSTRUMENT_LABELS[config.instrument_type]}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedPartitionId ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-600"
                disabled
              >
                <BookmarkCheck className="mr-1.5 h-4 w-4" />
                Sauvegardée
              </Button>
              <Button variant="outline" size="sm" onClick={onReset}>
                Nouvelle transcription
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDiscardDialogOpen(true)}
              >
                Ignorer
              </Button>
              <Button size="sm" onClick={() => setSaveDialogOpen(true)}>
                <BookmarkPlus className="mr-1.5 h-4 w-4" />
                Garder la partition
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-muted/30">
        {svgContent ? (
          <ProtectedSheetMusic
            svgContent={svgContent}
            enableProtection={true}
            onSuspiciousActivity={(type, count) => {
              console.warn(`[Protection] ${type} (${count})`)
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
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
        defaultTitle={
          jobTitle ??
          selectedFile?.name.replace(/\.[^/.]+$/, '') ??
          `Transcription du ${new Date().toLocaleDateString('fr-FR')}`
        }
        jobId={jobId}
        originalFileName={selectedFile?.name}
        onSaved={onSaved}
      />
    </div>
  )
}
