import { CREDIT_TRANSACTION_TYPES } from '@/server/domains/credit/credit.constants'
import {
  CreditRepository,
  InsufficientCreditsError,
} from '@/server/domains/credit/credit.repository'
import { db } from '@/server/lib/database'

import { LOCAL_JOB_STATUS, OPEN_JOB_STATUSES } from './transcription.constants'
import type {
  ConfigValidationResponse,
  HealthStatus,
  JobDetails,
  JobFailureOutcome,
  JobReserveResult,
  LocalJob,
  TranscribeConfig,
  TranscribeResponse,
} from './transcription.types'

const LOCAL_JOB_SELECT = {
  id: true,
  backendJobId: true,
  userId: true,
  status: true,
  creditsDeducted: true,
  chargedMonthlySeconds: true,
  chargedBonusSeconds: true,
  durationSeconds: true,
  estimatedDurationSeconds: true,
  createdAt: true,
} as const

class JobAlreadyBilledError extends Error {}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const BACKEND_API_KEY = process.env.BACKEND_API_KEY ?? ''

function backendAuthHeaders(): Record<string, string> {
  return BACKEND_API_KEY ? { 'X-API-Key': BACKEND_API_KEY } : {}
}

export class BackendApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public durationSeconds?: number,
  ) {
    super(message)
    this.name = 'BackendApiError'
  }
}

async function backendErrorFrom(
  response: Response,
  label: string,
): Promise<BackendApiError> {
  const body = await response.json().catch(() => ({}))
  const detail = body?.detail

  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    return new BackendApiError(
      response.status,
      `${label}: ${detail.message ?? response.statusText}`,
      detail.code,
      typeof detail.duration_seconds === 'number'
        ? detail.duration_seconds
        : undefined,
    )
  }

  return new BackendApiError(
    response.status,
    `${label}: ${typeof detail === 'string' && detail ? detail : response.statusText}`,
  )
}

export class TranscriptionRepository {
  constructor(private credits: CreditRepository = new CreditRepository()) {}

  private async callBackendAPI<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(url, {
        ...options,
        signal: options?.signal ?? controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...backendAuthHeaders(),
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new BackendApiError(
          response.status,
          errorData.detail ||
            `HTTP error ${response.status}: ${response.statusText}`,
        )
      }

      return response.json()
    } catch (error) {
      if (error instanceof BackendApiError) {
        throw error
      }
      if (error instanceof Error) {
        throw new Error(`Backend API call failed: ${error.message}`)
      }
      throw new Error('Backend API call failed with unknown error')
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async uploadAudio(
    file: File,
    config: TranscribeConfig,
    maxDurationSeconds?: number,
  ): Promise<TranscribeResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('config', JSON.stringify(config))
    if (maxDurationSeconds !== undefined) {
      formData.append('max_duration_seconds', String(maxDurationSeconds))
    }

    const url = `${API_BASE_URL}/transcribe`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: backendAuthHeaders(),
        body: formData,
      })

      if (!response.ok) {
        throw await backendErrorFrom(response, 'Audio upload failed')
      }

      return response.json()
    } catch (error) {
      if (error instanceof BackendApiError) throw error
      if (error instanceof Error) {
        throw new Error(`Audio upload failed: ${error.message}`)
      }
      throw new Error('Audio upload failed with unknown error')
    }
  }

  async uploadFromYoutubeUrl(
    url: string,
    config: TranscribeConfig,
    maxDurationSeconds?: number,
  ): Promise<TranscribeResponse> {
    return this.uploadFromUrl('transcribe/youtube', 'YouTube upload failed', {
      url,
      config,
      maxDurationSeconds,
    })
  }

  async uploadFromSpotifyUrl(
    url: string,
    config: TranscribeConfig,
    maxDurationSeconds?: number,
  ): Promise<TranscribeResponse> {
    return this.uploadFromUrl('transcribe/spotify', 'Spotify upload failed', {
      url,
      config,
      maxDurationSeconds,
    })
  }

  private async uploadFromUrl(
    path: string,
    label: string,
    payload: {
      url: string
      config: TranscribeConfig
      maxDurationSeconds?: number
    },
  ): Promise<TranscribeResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...backendAuthHeaders(),
        },
        body: JSON.stringify({
          url: payload.url,
          config: payload.config,
          ...(payload.maxDurationSeconds !== undefined && {
            max_duration_seconds: payload.maxDurationSeconds,
          }),
        }),
      })

      if (!response.ok) {
        throw await backendErrorFrom(response, label)
      }

      return response.json()
    } catch (error) {
      if (error instanceof BackendApiError) throw error
      if (error instanceof Error) {
        throw new Error(`${label}: ${error.message}`)
      }
      throw new Error(`${label} with unknown error`)
    }
  }

  async getJobStatus(jobId: string): Promise<JobDetails> {
    const response = await this.callBackendAPI<any>(`/jobs/${jobId}`)

    let partitionUrl: string | undefined

    if (response.results) {
      partitionUrl =
        response.results.partition_url || response.results.partition_svg_url

      if (partitionUrl) {
        response.results.partition_svg_url = `/api/transcription/${jobId}/download`
      }

      delete response.results.partition_url
      delete response.results.musicxml_url
    }

    if (response.status === 'completed') {
      const existing = await db.transcriptionJob.findUnique({
        where: { backendJobId: jobId },
        select: { svgContent: true },
      })
      if (!existing?.svgContent) {
        await this.cacheJobContent(jobId, partitionUrl)
      }
    }

    return response as JobDetails
  }

  private async cacheJobContent(
    jobId: string,
    partitionUrl?: string,
  ): Promise<void> {
    let svgContent: string | undefined

    const resolveUrl = (url: string) => {
      if (url.startsWith('http')) return url
      const origin = new URL(API_BASE_URL).origin
      return `${origin}${url.startsWith('/') ? '' : '/'}${url}`
    }

    const svgUrls = [
      partitionUrl && resolveUrl(partitionUrl),
      `${API_BASE_URL}/jobs/${jobId}/download/partition`,
    ].filter(Boolean) as string[]

    for (const url of svgUrls) {
      try {
        const res = await fetch(url, { headers: backendAuthHeaders() })
        if (res.ok) {
          svgContent = await res.text()
          break
        }
      } catch {}
    }

    if (svgContent) {
      await db.transcriptionJob.update({
        where: { backendJobId: jobId },
        data: { svgContent },
      })
    }
  }

  async downloadPartition(jobId: string): Promise<Blob> {
    const url = `${API_BASE_URL}/jobs/${jobId}/download/partition`

    try {
      const response = await fetch(url, { headers: backendAuthHeaders() })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      return response.blob()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Partition download failed: ${error.message}`)
      }
      throw new Error('Partition download failed with unknown error')
    }
  }

  async validateConfig(
    config: TranscribeConfig,
  ): Promise<ConfigValidationResponse> {
    return this.callBackendAPI<ConfigValidationResponse>('/config/validate', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  async cancelJob(jobId: string): Promise<void> {
    const url = `${API_BASE_URL}/jobs/${jobId}`
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: backendAuthHeaders(),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || `Cancel failed: ${response.statusText}`,
        )
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Job cancellation failed: ${error.message}`)
      }
      throw new Error('Job cancellation failed with unknown error')
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.callBackendAPI<HealthStatus>('/health')
  }

  async getYoutubeInfo(
    url: string,
  ): Promise<{ duration_seconds: number; title: string }> {
    const backendUrl = `${API_BASE_URL}/transcribe/youtube/info?url=${encodeURIComponent(url)}`
    const response = await fetch(backendUrl, { headers: backendAuthHeaders() })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Could not fetch YouTube info')
    }
    return response.json()
  }

  async acquireJobSlot(
    userId: string,
    maxOpenJobs: number,
    estimatedDurationSeconds?: number,
  ): Promise<string | null> {
    return db.$transaction(async (tx) => {
      // The row lock serializes concurrent launches of one user, so the count below cannot be raced
      await tx.user.update({
        where: { id: userId },
        data: { updatedAt: new Date() },
      })

      const openJobs = await tx.transcriptionJob.count({
        where: { userId, status: { in: OPEN_JOB_STATUSES } },
      })
      if (openJobs >= maxOpenJobs) return null

      const job = await tx.transcriptionJob.create({
        data: {
          userId,
          status: LOCAL_JOB_STATUS.PENDING,
          estimatedDurationSeconds,
        },
        select: { id: true },
      })
      return job.id
    })
  }

  async attachBackendJob(
    slotId: string,
    backendJobId: string,
    durationSeconds?: number | null,
  ): Promise<void> {
    await db.transcriptionJob.update({
      where: { id: slotId },
      data: {
        backendJobId,
        status: LOCAL_JOB_STATUS.ACTIVE,
        ...(durationSeconds && durationSeconds > 0 && { durationSeconds }),
      },
    })
  }

  async releaseJobSlot(slotId: string): Promise<void> {
    await db.transcriptionJob.deleteMany({ where: { id: slotId } })
  }

  async deleteStalePendingJobs(olderThan: Date, userId?: string) {
    const result = await db.transcriptionJob.deleteMany({
      where: {
        status: LOCAL_JOB_STATUS.PENDING,
        createdAt: { lt: olderThan },
        ...(userId && { userId }),
      },
    })
    return result.count
  }

  async recordExemptJob(
    backendJobId: string,
    userId: string,
    estimatedDurationSeconds?: number,
  ): Promise<void> {
    await db.transcriptionJob.upsert({
      where: { backendJobId },
      create: {
        backendJobId,
        userId,
        estimatedDurationSeconds,
        creditsDeducted: true,
        status: LOCAL_JOB_STATUS.EXEMPT,
      },
      update: {},
    })
  }

  async findJobForUser(
    backendJobId: string,
    userId: string,
  ): Promise<LocalJob | null> {
    const job = await db.transcriptionJob.findUnique({
      where: { backendJobId },
      select: LOCAL_JOB_SELECT,
    })
    return job?.userId === userId ? job : null
  }

  async findOpenJobsForUser(userId: string): Promise<LocalJob[]> {
    return db.transcriptionJob.findMany({
      where: { userId, status: { in: OPEN_JOB_STATUSES } },
      select: LOCAL_JOB_SELECT,
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOpenJobs(limit: number): Promise<LocalJob[]> {
    return db.transcriptionJob.findMany({
      where: { status: { in: OPEN_JOB_STATUSES } },
      select: LOCAL_JOB_SELECT,
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  async reserveCredits(
    backendJobId: string,
    userId: string,
    durationSeconds: number,
    description: string,
  ): Promise<JobReserveResult> {
    const seconds = Math.ceil(durationSeconds)

    try {
      await db.$transaction(async (tx) => {
        const flagged = await tx.transcriptionJob.updateMany({
          where: {
            backendJobId,
            creditsDeducted: false,
            status: { in: OPEN_JOB_STATUSES },
          },
          data: { creditsDeducted: true, durationSeconds },
        })
        if (flagged.count === 0) throw new JobAlreadyBilledError()

        const debit = await this.credits.debitCredits(userId, seconds, tx)

        await tx.transcriptionJob.updateMany({
          where: { backendJobId },
          data: {
            chargedMonthlySeconds: debit.fromMonthly,
            chargedBonusSeconds: debit.fromBonus,
          },
        })

        await this.credits.createTransaction(
          {
            userId,
            type: CREDIT_TRANSACTION_TYPES.USAGE,
            amount: -Math.ceil(seconds / 60),
            balanceAfter: Math.floor(
              (debit.monthlyCredits + debit.bonusCredits) / 60,
            ),
            description,
          },
          tx,
        )
      })
      return 'reserved'
    } catch (error) {
      if (error instanceof JobAlreadyBilledError) return 'already_reserved'
      if (error instanceof InsufficientCreditsError) return 'insufficient'
      throw error
    }
  }

  async settleCompletedJob(backendJobId: string): Promise<void> {
    await db.transcriptionJob.updateMany({
      where: { backendJobId, status: { in: OPEN_JOB_STATUSES } },
      data: { status: LOCAL_JOB_STATUS.COMPLETED },
    })
  }

  async settleUnsuccessfulJob(
    backendJobId: string,
    userId: string,
    outcome: JobFailureOutcome,
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      const closed = await tx.transcriptionJob.updateMany({
        where: { backendJobId, status: { in: OPEN_JOB_STATUSES } },
        data: { status: outcome.status },
      })
      if (closed.count === 0) return

      const job = await tx.transcriptionJob.findUnique({
        where: { backendJobId },
        select: LOCAL_JOB_SELECT,
      })
      if (!job) return

      const charged = job.chargedMonthlySeconds + job.chargedBonusSeconds
      const basis =
        charged > 0
          ? charged
          : Math.ceil(
              outcome.measuredDurationSeconds ??
                job.durationSeconds ??
                job.estimatedDurationSeconds ??
                0,
            )
      const progress = Math.min(100, Math.max(0, outcome.progress))
      const owed =
        outcome.status === 'refused'
          ? 0
          : Math.min(basis, Math.ceil((progress / 100) * basis))

      if (charged > owed) {
        const keptMonthly = Math.min(job.chargedMonthlySeconds, owed)
        const keptBonus = owed - keptMonthly
        const refundMonthly = job.chargedMonthlySeconds - keptMonthly
        const refundBonus = job.chargedBonusSeconds - keptBonus

        const credits = await this.credits.restoreCredits(
          userId,
          { monthly: refundMonthly, bonus: refundBonus },
          tx,
        )
        await tx.transcriptionJob.update({
          where: { backendJobId },
          data: {
            chargedMonthlySeconds: keptMonthly,
            chargedBonusSeconds: keptBonus,
          },
        })
        await this.credits.createTransaction(
          {
            userId,
            type: CREDIT_TRANSACTION_TYPES.REFUND,
            amount: Math.ceil((refundMonthly + refundBonus) / 60),
            balanceAfter: Math.floor(
              (credits.monthlyCredits + credits.bonusCredits) / 60,
            ),
            description:
              owed > 0
                ? `Transcription interrompue à ${progress}% : remboursement partiel`
                : 'Transcription non aboutie : remboursement',
          },
          tx,
        )
        return
      }

      if (owed > charged) {
        const balance = await tx.userCredits.findUnique({ where: { userId } })
        const extra = Math.min(
          owed - charged,
          balance ? balance.monthlyCredits + balance.bonusCredits : 0,
        )
        if (extra <= 0) return

        let debit
        try {
          debit = await this.credits.debitCredits(userId, extra, tx)
        } catch (error) {
          if (error instanceof InsufficientCreditsError) return
          throw error
        }

        await tx.transcriptionJob.update({
          where: { backendJobId },
          data: {
            creditsDeducted: true,
            chargedMonthlySeconds:
              job.chargedMonthlySeconds + debit.fromMonthly,
            chargedBonusSeconds: job.chargedBonusSeconds + debit.fromBonus,
          },
        })
        await this.credits.createTransaction(
          {
            userId,
            type: CREDIT_TRANSACTION_TYPES.USAGE,
            amount: -Math.ceil(extra / 60),
            balanceAfter: Math.floor(
              (debit.monthlyCredits + debit.bonusCredits) / 60,
            ),
            description: `Transcription interrompue à ${progress}% (${extra}s)`,
          },
          tx,
        )
      }
    })
  }

  async verifyJobOwner(backendJobId: string, userId: string): Promise<boolean> {
    const job = await db.transcriptionJob.findUnique({
      where: { backendJobId },
    })
    return job?.userId === userId
  }

  async findUserAccess(
    userId: string,
  ): Promise<{ isAdmin: boolean; emailVerified: Date | null } | null> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, isRootAdmin: true, emailVerified: true },
    })
    if (!user) return null
    return {
      isAdmin: user.role === 'admin' || user.isRootAdmin === true,
      emailVerified: user.emailVerified,
    }
  }

  async hasPastDueSubscription(userId: string): Promise<boolean> {
    const subscription = await db.subscription.findFirst({
      where: { userId, status: 'past_due' },
      select: { id: true },
    })
    return subscription !== null
  }
}
