'use client'

import { FileAudio, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAudioDropzone } from '@/hooks/useAudioDropzone'

interface AudioDropzoneProps {
  selectedFile: File | null
  onFileSelect: (file: File, durationSeconds?: number) => void
  onFileRemove: () => void
}

export function AudioDropzone({
  selectedFile,
  onFileSelect,
  onFileRemove,
}: AudioDropzoneProps) {
  const {
    isDragOver,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    openFilePicker,
    handleInputChange,
  } = useAudioDropzone(onFileSelect)

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleInputChange}
      />
      <div
        onClick={() => !selectedFile && openFilePicker()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 min-h-48 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : selectedFile
              ? 'border-green-400 bg-green-50 dark:bg-green-950/20 cursor-default'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
        }`}
      >
        {selectedFile ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileAudio className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onFileRemove()
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="text-muted-foreground hover:text-foreground text-xs h-7"
            >
              Changer de fichier
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {isDragOver
                  ? 'Relâchez pour importer'
                  : 'Glissez votre audio ici'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ou{' '}
                <span className="text-primary underline underline-offset-2">
                  cliquez pour sélectionner
                </span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground/70">
              MP3, WAV, FLAC, M4A, OGG
            </p>
          </div>
        )}
      </div>
    </>
  )
}
