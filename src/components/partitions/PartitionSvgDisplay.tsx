'use client'

import { AlertCircle, Loader2 } from 'lucide-react'

import { ProtectedSheetMusic } from '@/components/sheet-music/ProtectedSheetMusic'
import { Button } from '@/components/ui/button'

interface PartitionSvgDisplayProps {
  svgError: boolean
  svgContent: string | null
  onDeleteClick: () => void
}

export function PartitionSvgDisplay({
  svgError,
  svgContent,
  onDeleteClick,
}: PartitionSvgDisplayProps) {
  if (svgError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 border rounded-lg">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium">
            Cette partition n'est plus disponible en affichage.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Les données de transcription ont peut-être expiré sur le serveur.
          </p>
        </div>
        <Button variant="destructive" onClick={onDeleteClick}>
          Supprimer de ma bibliothèque
        </Button>
      </div>
    )
  }

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div style={{ maxHeight: '70vh' }}>
      <ProtectedSheetMusic
        svgContent={svgContent}
        enableProtection={true}
        onSuspiciousActivity={(type, count) => {
          console.warn(`[Protection] ${type} (${count})`)
        }}
      />
    </div>
  )
}
