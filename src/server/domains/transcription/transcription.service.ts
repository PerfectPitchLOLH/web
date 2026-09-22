import type { CreditService } from '@/server/domains/credit/credit.service'
import { permissionService } from '@/server/domains/permission'
import {
  ERROR_CODES,
  HTTP_STATUS,
} from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { AudioRejectionCode } from './transcription.constants'
import {
  ACTIVE_JOB_LIMITS,
  AUDIO_REJECTION_CODES,
  LOCAL_JOB_STATUS,
  OPEN_JOB_STATUSES,
  PENDING_JOB_TTL_MS,
  RECONCILE_BATCH_SIZE,
  STALE_JOB_TTL_MS,
} from './transcription.constants'
import type { TranscriptionRepository } from './transcription.repository'
import { BackendApiError } from './transcription.repository'
import type {
  ConfigValidationResponse,
  HealthStatus,
  JobDetails,
  LocalJob,
  TranscribeConfig,
  TranscribeResponse,
} from './transcription.types'
import {
  AUDIO_FORMATS,
  SPOTIFY_URL_REGEX,
  YOUTUBE_URL_REGEX,
} from './transcription.types'

const MAX_FILE_SIZE_MB = parseInt(
  process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '100',
  10,
)
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

type PlanTier = keyof typeof ACTIVE_JOB_LIMITS

function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return minutes > 0
    ? `${minutes} min ${String(rest).padStart(2, '0')} s`
    : `${rest} s`
}

function isAudioRejectionCode(code: unknown): code is AudioRejectionCode {
  return AUDIO_REJECTION_CODES.includes(code as AudioRejectionCode)
}

function audioRejectionMessage(
  code: AudioRejectionCode,
  durationSeconds?: number | null,
): string {
  if (code === ERROR_CODES.AUDIO_UNREADABLE) {
    return "La durée de ce fichier audio n'a pas pu être lue : le fichier semble illisible ou corrompu."
  }
  const measured = durationSeconds
    ? ` (${formatDuration(durationSeconds)})`
    : ''
  return `Cet audio${measured} dépasse la durée autorisée pour une transcription ou vos crédits restants.`
}

function measuredDuration(job: JobDetails): number {
  const direct = job.duration_seconds
  if (direct && direct > 0) return direct
  const fromResults = job.results?.duration_seconds
  return fromResults && fromResults > 0 ? fromResults : 0
}

function rejectionCodeOf(job: JobDetails): AudioRejectionCode | null {
  if (job.status !== 'failed') return null
  if (isAudioRejectionCode(job.error_code)) return job.error_code
  return AUDIO_REJECTION_CODES.find((code) => job.error?.includes(code)) ?? null
}

export class TranscriptionService {
  constructor(
    private repository: TranscriptionRepository,
    private creditService: CreditService,
  ) {}

  async transcribe(
    file: File,
    config: TranscribeConfig,
    userId: string,
    skipCreditCheck = false,
  ): Promise<TranscribeResponse> {
    this.validateAudioFile(file)

    return this.launch(userId, config, skipCreditCheck, async (max) => {
      try {
        await this.validateConfigWithBackend(config)
      } catch (error) {
        console.warn(
          '[TranscriptionService] Config validation with backend failed (non-blocking):',
          error instanceof Error ? error.message : error,
        )
      }
      return this.repository.uploadAudio(file, config, max)
    })
  }

  async transcribeFromYoutube(
    url: string,
    config: TranscribeConfig,
    userId: string,
    skipCreditCheck = false,
  ): Promise<TranscribeResponse> {
    if (!YOUTUBE_URL_REGEX.test(url)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'URL YouTube invalide',
      )
    }

    return this.launch(
      userId,
      config,
      skipCreditCheck,
      (max) => this.repository.uploadFromYoutubeUrl(url, config, max),
      async () => (await this.repository.getYoutubeInfo(url)).duration_seconds,
    )
  }

  async transcribeFromSpotify(
    url: string,
    config: TranscribeConfig,
    userId: string,
    skipCreditCheck = false,
  ): Promise<TranscribeResponse> {
    if (!SPOTIFY_URL_REGEX.test(url)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'URL Spotify invalide',
      )
    }

    return this.launch(userId, config, skipCreditCheck, (max) =>
      this.repository.uploadFromSpotifyUrl(url, config, max),
    )
  }

  async getJob(jobId: string, userId: string): Promise<JobDetails> {
    const local = await this.repository.findJobForUser(jobId, userId)
    if (!local) {
      throw new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, 'Access denied')
    }

    try {
      const job = await this.repository.getJobStatus(jobId)

      if (this.isOpen(local)) {
        const outcome = await this.reconcileJob(local, job)
        if (outcome === 'refused') throw this.undeliverableResultError()
      } else if (
        job.status === 'completed' &&
        (local.status === LOCAL_JOB_STATUS.REFUSED ||
          local.status === LOCAL_JOB_STATUS.FAILED)
      ) {
        throw this.undeliverableResultError()
      }

      return this.presentJob(job)
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (error instanceof BackendApiError && error.status === 404) {
        if (this.isOpen(local)) await this.settleLostJob(local)
        throw new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Job not found or expired',
        )
      }
      throw new ApiError(
        'SERVICE_UNAVAILABLE',
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        'Backend temporarily unreachable',
      )
    }
  }

  async reconcileOpenJobs(): Promise<{ scanned: number; failed: number }> {
    await this.repository.deleteStalePendingJobs(
      new Date(Date.now() - PENDING_JOB_TTL_MS),
    )

    const jobs = await this.repository.findOpenJobs(RECONCILE_BATCH_SIZE)
    let failed = 0

    for (const job of jobs) {
      try {
        await this.reconcileOpenJob(job)
      } catch (error) {
        failed++
        console.error(
          '[TranscriptionService] Reconciliation failed for job',
          job.backendJobId,
          error instanceof Error ? error.message : error,
        )
      }
    }

    return { scanned: jobs.length, failed }
  }

  async downloadPartition(jobId: string, userId: string): Promise<Blob> {
    const job = await this.getJob(jobId, userId)

    if (job.status !== 'completed') {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'Job is not completed yet',
      )
    }

    if (!job.results?.partition_svg_url) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Partition SVG is not available',
      )
    }

    return this.repository.downloadPartition(jobId)
  }

  async validateConfiguration(
    config: TranscribeConfig,
  ): Promise<ConfigValidationResponse> {
    try {
      return await this.repository.validateConfig(config)
    } catch {
      return {
        valid: false,
        errors: ['Unable to validate configuration with backend'],
      }
    }
  }

  async cancelJob(jobId: string, userId: string): Promise<void> {
    const local = await this.repository.findJobForUser(jobId, userId)
    if (!local) {
      throw new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, 'Access denied')
    }
    try {
      await this.repository.cancelJob(jobId)
    } catch {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Job introuvable ou ne peut pas être annulé',
      )
    }

    if (this.isOpen(local)) {
      await this.reconcileOpenJob(local).catch(() => {})
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    return this.repository.healthCheck()
  }

  validateAudioFile(file: File): void {
    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.PAYLOAD_TOO_LARGE,
        `Le fichier dépasse la taille maximale de ${MAX_FILE_SIZE_MB}MB`,
      )
    }

    if (!AUDIO_FORMATS.includes(file.type as any)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        `Format de fichier non supporté. Formats acceptés : MP3, WAV, FLAC, M4A, OGG`,
      )
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    const validExtensions = ['mp3', 'wav', 'flac', 'm4a', 'ogg']

    if (!extension || !validExtensions.includes(extension)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        `Extension de fichier invalide. Extensions acceptées : ${validExtensions.join(', ')}`,
      )
    }
  }

  private isOpen(job: LocalJob): boolean {
    return OPEN_JOB_STATUSES.includes(job.status as never)
  }

  private undeliverableResultError(): ApiError {
    return new ApiError(
      ERROR_CODES.INSUFFICIENT_CREDITS,
      HTTP_STATUS.PAYMENT_REQUIRED,
      "Crédits insuffisants : le résultat de cette transcription n'est pas disponible.",
    )
  }

  private presentJob(job: JobDetails): JobDetails {
    const code = rejectionCodeOf(job)
    if (!code) return job
    return {
      ...job,
      error: audioRejectionMessage(code, job.duration_seconds),
    }
  }

  private async launch(
    userId: string,
    config: TranscribeConfig,
    skipCreditCheck: boolean,
    start: (maxDurationSeconds?: number) => Promise<TranscribeResponse>,
    estimateDuration?: () => Promise<number>,
  ): Promise<TranscribeResponse> {
    if (!skipCreditCheck) {
      await this.enforcePolyphonyAccess(userId, config)
    }

    const access = await this.repository.findUserAccess(userId)
    if (skipCreditCheck || access?.isAdmin) {
      const response = await start()
      await this.repository.recordExemptJob(response.job_id, userId)
      return response
    }

    const tier = await this.resolveTier(userId)
    await this.assertMayTranscribe(userId, tier, access?.emailVerified ?? null)

    const balance = await this.creditService.getUserCreditsBalance(userId)
    const remaining = balance.remainingCredits
    if (remaining <= 0) {
      throw new ApiError(
        ERROR_CODES.INSUFFICIENT_CREDITS,
        HTTP_STATUS.PAYMENT_REQUIRED,
        'Crédits insuffisants pour lancer une transcription',
      )
    }

    const estimate = estimateDuration ? await estimateDuration() : undefined
    if (estimate && estimate > remaining) {
      throw new ApiError(
        ERROR_CODES.INSUFFICIENT_CREDITS,
        HTTP_STATUS.PAYMENT_REQUIRED,
        `Crédits insuffisants : ${Math.ceil(estimate / 60)} min nécessaires, ${Math.floor(remaining / 60)} min disponibles`,
      )
    }

    const slotId = await this.acquireSlot(userId, tier, estimate)

    let response: TranscribeResponse
    try {
      response = await start(remaining)
    } catch (error) {
      await this.repository.releaseJobSlot(slotId).catch(() => {})
      throw this.mapLaunchError(error)
    }

    await this.confirmLaunch(slotId, userId, response)
    return response
  }

  private async resolveTier(userId: string): Promise<PlanTier> {
    const context = await permissionService.getUserPermissionContext(userId)
    return context.planTier === 'free' ? 'free' : 'paid'
  }

  private async assertMayTranscribe(
    userId: string,
    tier: PlanTier,
    emailVerified: Date | null,
  ): Promise<void> {
    if (tier === 'free' && !emailVerified) {
      throw new ApiError(
        ERROR_CODES.EMAIL_NOT_VERIFIED,
        HTTP_STATUS.FORBIDDEN,
        'Confirmez votre adresse e-mail pour lancer une transcription.',
      )
    }

    if (await this.repository.hasPastDueSubscription(userId)) {
      throw new ApiError(
        'SUBSCRIPTION_PAST_DUE',
        HTTP_STATUS.PAYMENT_REQUIRED,
        'Votre abonnement a un paiement en retard. Mettez à jour votre moyen de paiement pour continuer à transcrire.',
      )
    }
  }

  private async acquireSlot(
    userId: string,
    tier: PlanTier,
    estimate?: number,
  ): Promise<string> {
    const limit = ACTIVE_JOB_LIMITS[tier]

    let slotId = await this.repository.acquireJobSlot(userId, limit, estimate)
    if (slotId) return slotId

    await this.reconcileUserOpenJobs(userId)
    slotId = await this.repository.acquireJobSlot(userId, limit, estimate)
    if (slotId) return slotId

    throw new ApiError(
      ERROR_CODES.ACTIVE_JOBS_LIMIT_REACHED,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      limit === 1
        ? 'Une transcription est déjà en cours. Attendez sa fin pour en lancer une autre, ou passez à un abonnement payant pour en lancer deux en parallèle.'
        : `${limit} transcriptions sont déjà en cours. Attendez la fin de l'une d'elles pour en lancer une autre.`,
    )
  }

  private async reconcileUserOpenJobs(userId: string): Promise<void> {
    await this.repository.deleteStalePendingJobs(
      new Date(Date.now() - PENDING_JOB_TTL_MS),
      userId,
    )
    const jobs = await this.repository.findOpenJobsForUser(userId)
    for (const job of jobs) {
      await this.reconcileOpenJob(job).catch(() => {})
    }
  }

  private async confirmLaunch(
    slotId: string,
    userId: string,
    response: TranscribeResponse,
  ): Promise<void> {
    const measured = response.duration_seconds ?? 0

    try {
      await this.repository.attachBackendJob(slotId, response.job_id, measured)

      if (measured <= 0) return

      const seconds = Math.ceil(measured)
      const result = await this.repository.reserveCredits(
        response.job_id,
        userId,
        measured,
        `Transcription (${seconds}s)`,
      )
      if (result !== 'insufficient') return

      await this.abortLaunch(slotId, response.job_id)
      throw new ApiError(
        ERROR_CODES.INSUFFICIENT_CREDITS,
        HTTP_STATUS.PAYMENT_REQUIRED,
        `Crédits insuffisants : ${Math.ceil(seconds / 60)} min nécessaires pour cet audio`,
      )
    } catch (error) {
      if (!(error instanceof ApiError)) {
        await this.abortLaunch(slotId, response.job_id)
      }
      throw error
    }
  }

  private async abortLaunch(slotId: string, backendJobId: string) {
    await this.cancelBackendJob(backendJobId)
    await this.repository.releaseJobSlot(slotId).catch(() => {})
  }

  private async cancelBackendJob(backendJobId: string): Promise<void> {
    try {
      await this.repository.cancelJob(backendJobId)
    } catch {}
  }

  private mapLaunchError(error: unknown): unknown {
    if (
      error instanceof BackendApiError &&
      error.status === HTTP_STATUS.UNPROCESSABLE_ENTITY &&
      isAudioRejectionCode(error.code)
    ) {
      return new ApiError(
        error.code,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        audioRejectionMessage(error.code, error.durationSeconds),
      )
    }
    return error
  }

  private async reconcileOpenJob(job: LocalJob): Promise<void> {
    if (!job.backendJobId) return

    let status: JobDetails
    try {
      status = await this.repository.getJobStatus(job.backendJobId)
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 404) {
        await this.settleLostJob(job)
        return
      }
      throw error
    }

    await this.reconcileJob(job, status)

    const isTerminal =
      status.status === 'completed' || status.status === 'failed'
    if (
      !isTerminal &&
      Date.now() - job.createdAt.getTime() > STALE_JOB_TTL_MS
    ) {
      await this.cancelBackendJob(job.backendJobId)
      await this.repository.settleUnsuccessfulJob(
        job.backendJobId,
        job.userId,
        {
          status: 'failed',
          progress: 0,
        },
      )
    }
  }

  private async settleLostJob(job: LocalJob): Promise<void> {
    if (!job.backendJobId) return
    await this.repository
      .settleUnsuccessfulJob(job.backendJobId, job.userId, {
        status: 'failed',
        progress: 0,
      })
      .catch(() => {})
  }

  private async reconcileJob(
    local: LocalJob,
    status: JobDetails,
  ): Promise<'ok' | 'refused'> {
    const backendJobId = local.backendJobId
    if (!backendJobId) return 'ok'

    const measured = measuredDuration(status)

    if (status.status === 'failed') {
      await this.repository.settleUnsuccessfulJob(backendJobId, local.userId, {
        status: 'failed',
        progress: rejectionCodeOf(status)
          ? 0
          : Number.isFinite(status.progress)
            ? status.progress
            : 0,
        measuredDurationSeconds: measured > 0 ? measured : undefined,
      })
      return 'ok'
    }

    if (measured > 0 && !local.creditsDeducted) {
      const result = await this.repository.reserveCredits(
        backendJobId,
        local.userId,
        measured,
        `Transcription (${Math.ceil(measured)}s)`,
      )
      if (result === 'insufficient') {
        await this.cancelBackendJob(backendJobId)
        await this.repository.settleUnsuccessfulJob(
          backendJobId,
          local.userId,
          {
            status: 'refused',
            progress: 0,
          },
        )
        return 'refused'
      }
    }

    if (status.status === 'completed') {
      await this.repository.settleCompletedJob(backendJobId)
    }
    return 'ok'
  }

  private async enforcePolyphonyAccess(
    userId: string,
    config: TranscribeConfig,
  ): Promise<void> {
    if (!config.polyphonic) return

    const access = await permissionService.checkFeatureAccessForUser(
      userId,
      'polyphony',
    )
    if (!access.hasAccess) {
      throw new ApiError(
        'FORBIDDEN',
        HTTP_STATUS.FORBIDDEN,
        'La transcription polyphonique (accords) est réservée au plan Pro.',
        { feature: 'polyphony', upgradeRequired: access.upgradeRequired },
      )
    }
  }

  private async validateConfigWithBackend(
    config: TranscribeConfig,
  ): Promise<void> {
    const validation = await this.validateConfiguration(config)

    if (!validation.valid) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        `Configuration invalide: ${validation.errors?.join(', ')}`,
      )
    }
  }
}
