import type { JobStatus } from '@/server/domains/transcription'

export type TranscriptionSession = {
  jobId: string
  timestamp: number
  status: JobStatus
  title?: string
  savedPartitionId?: string
}

const SESSION_KEY = 'transcription_job_id'
const SESSION_TTL_MS = 60 * 60 * 1000

export function readSession(): TranscriptionSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as TranscriptionSession
    if (Date.now() - session.timestamp > SESSION_TTL_MS) {
      clearSession()
      return null
    }
    if (session.status === 'failed') {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function writeSession(session: TranscriptionSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function formatSessionAge(timestamp: number): string {
  const diffMin = Math.floor((Date.now() - timestamp) / 60000)
  if (diffMin < 1) return 'il y a quelques instants'
  return `il y a ~${diffMin} min`
}
