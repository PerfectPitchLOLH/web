'use client'

import { Loader2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { TranscriptionFailedView } from '@/components/audio-to-sheet/TranscriptionFailedView'
import { TranscriptionProcessingView } from '@/components/audio-to-sheet/TranscriptionProcessingView'
import { TranscriptionResultView } from '@/components/audio-to-sheet/TranscriptionResultView'
import { useJobProgress } from '@/hooks/useJobProgress'
import { useSvgContent } from '@/hooks/useSvgContent'
import {
  clearSession,
  readSession,
  writeSession,
} from '@/lib/transcription-session'

export default function JobPage() {
  const params = useParams()
  const jobId = params.jobId as string
  const router = useRouter()

  const {
    progress,
    step: currentStep,
    status,
    results,
    error,
    isInitialLoading,
  } = useJobProgress(jobId)
  const svgContent = useSvgContent(results, jobId, status)

  const [savedPartitionId, setSavedPartitionId] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    const session = readSession()
    if (session?.jobId === jobId) {
      setSavedPartitionId(session.savedPartitionId ?? null)
      setJobTitle(session.title ?? null)
    }
  }, [jobId])

  useEffect(() => {
    if (results?.title) setJobTitle(results.title)
  }, [results])

  useEffect(() => {
    if (!status) return
    const session = readSession()
    if (session?.jobId === jobId) {
      writeSession({ ...session, status })
    }
  }, [status, jobId])

  const handleCancel = useCallback(async () => {
    setIsCancelling(true)
    try {
      await fetch(`/api/transcription/${jobId}`, { method: 'DELETE' })
    } finally {
      clearSession()
      router.push('/dashboard/audio-to-sheet')
    }
  }, [jobId, router])

  const handleReset = useCallback(() => {
    clearSession()
    router.push('/dashboard/audio-to-sheet')
  }, [router])

  const handleSaved = useCallback((partitionId: string) => {
    setSavedPartitionId(partitionId)
    const session = readSession()
    if (session) writeSession({ ...session, savedPartitionId: partitionId })
    toast.success('Partition sauvegardée !', {
      description: 'Retrouvez-la dans votre bibliothèque.',
      action: {
        label: 'Voir →',
        onClick: () => {
          window.location.href = '/dashboard/partitions'
        },
      },
      duration: 6000,
    })
  }, [])

  const resolvedTitle = results?.title ?? jobTitle ?? null

  if (isInitialLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2.5 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Chargement de la transcription...</span>
      </div>
    )
  }

  if (status === 'completed' && results) {
    return (
      <TranscriptionResultView
        selectedFile={null}
        svgContent={svgContent}
        savedPartitionId={savedPartitionId}
        config={{
          instrument_mode: 'single',
          instrument_type: 'piano',
          polyphonic: false,
          partition_type: 'classique',
        }}
        jobId={jobId}
        jobTitle={resolvedTitle}
        durationSeconds={results.duration_seconds}
        onReset={handleReset}
        onSaved={handleSaved}
      />
    )
  }

  if (status === 'failed') {
    return <TranscriptionFailedView error={error} onReset={handleReset} />
  }

  return (
    <TranscriptionProcessingView
      progress={progress}
      currentStep={currentStep}
      isCancelling={isCancelling}
      error={error}
      onCancel={handleCancel}
    />
  )
}
