import type { CreateDTO, Entity, UpdateDTO } from '@/server/shared/types'

// ============================================================================
// Enums & Literal Types (FastAPI Backend)
// ============================================================================

export type InstrumentMode = 'single' | 'multiple'
export type InstrumentType =
  | 'bass'
  | 'vocals'
  | 'drums'
  | 'guitar'
  | 'piano'
  | 'other'
  | 'multiple'
export type PartitionType = 'classique' | 'piano' | 'tab_basse' | 'tab_guitare'
export type TargetStem = 'bass' | 'vocals' | 'drums' | 'other'
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'
export type ProcessingStep =
  | 'preprocessing'
  | 'separating'
  | 'transcribing'
  | 'generating'
  | 'completed'

// ============================================================================
// Configuration Types (FastAPI Backend)
// ============================================================================

export type TranscribeConfig = {
  instrument_mode: InstrumentMode
  instrument_type: InstrumentType
  polyphonic: boolean
  partition_type: PartitionType
  target_stem?: TargetStem
}

// ============================================================================
// Backend API Response Types
// ============================================================================

export type TranscribeResponse = {
  job_id: string
  status: JobStatus
}

export type JobResults = {
  partition_svg_url: string
  duration_seconds: number
}

export type JobDetails = {
  job_id: string
  status: JobStatus
  progress: number
  current_step: ProcessingStep
  created_at: string
  completed_at?: string
  results?: JobResults
  error?: string
  config?: TranscribeConfig
}

export type ProgressUpdate = {
  progress: number
  step?: ProcessingStep
  current_step?: ProcessingStep
  status: JobStatus
  error?: string
}

export type ConfigValidationResponse = {
  valid: boolean
  errors?: string[]
}

export type HealthStatus = {
  status: 'healthy' | 'degraded'
  demucs_available: boolean
  disk_space_gb: number
}

// ============================================================================
// Database Entity Types (for persistence in local DB)
// ============================================================================

export type TranscriptionJob = {
  userId: string
  backendJobId: string
  fileName: string
  fileSize: number
  config: TranscribeConfig
  status: JobStatus
  progress: number
  currentStep: ProcessingStep
  error?: string
  partitionSvgUrl?: string
  durationSeconds?: number
  completedAt?: Date
}

export type TranscriptionJobEntity = Entity<TranscriptionJob>
export type CreateTranscriptionJobDTO = CreateDTO<TranscriptionJob>
export type UpdateTranscriptionJobDTO = UpdateDTO<TranscriptionJob>

// ============================================================================
// Helper Types
// ============================================================================

export type TranscriptionFilters = {
  userId?: string
  status?: JobStatus
  fromDate?: Date
  toDate?: Date
}

// ============================================================================
// Constants
// ============================================================================

export const AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/x-ogg',
] as const

export const PROCESSING_STEP_LABELS: Record<ProcessingStep, string> = {
  preprocessing: 'Préparation...',
  separating: 'Séparation des pistes...',
  transcribing: 'Transcription...',
  generating: 'Génération de la partition...',
  completed: 'Terminé !',
} as const

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
} as const
