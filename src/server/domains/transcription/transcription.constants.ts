export const LOCAL_JOB_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUSED: 'refused',
  EXEMPT: 'exempt',
} as const

export type LocalJobStatus =
  (typeof LOCAL_JOB_STATUS)[keyof typeof LOCAL_JOB_STATUS]

export const OPEN_JOB_STATUSES: LocalJobStatus[] = [
  LOCAL_JOB_STATUS.PENDING,
  LOCAL_JOB_STATUS.ACTIVE,
]

export const ACTIVE_JOB_LIMITS = {
  free: 1,
  paid: 2,
} as const

export const PENDING_JOB_TTL_MS = 10 * 60 * 1000
export const STALE_JOB_TTL_MS = 2 * 60 * 60 * 1000
export const RECONCILE_BATCH_SIZE = 50

export const AUDIO_REJECTION_CODES = [
  'AUDIO_TOO_LONG',
  'AUDIO_UNREADABLE',
] as const

export type AudioRejectionCode = (typeof AUDIO_REJECTION_CODES)[number]
