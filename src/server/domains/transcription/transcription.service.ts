import type { CreditService } from '@/server/domains/credit/credit.service'
import { db } from '@/server/lib/database'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { TranscriptionRepository } from './transcription.repository'
import type {
  ConfigValidationResponse,
  HealthStatus,
  JobDetails,
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

export class TranscriptionService {
  constructor(
    private repository: TranscriptionRepository,
    private creditService: CreditService,
  ) {}

  async transcribe(
    file: File,
    config: TranscribeConfig,
    userId: string,
    durationSeconds?: number,
    skipCreditCheck = false,
  ): Promise<TranscribeResponse> {
    if (!skipCreditCheck)
      await this.checkCreditsAvailable(userId, durationSeconds)
    this.validateAudioFile(file)

    try {
      await this.validateConfigWithBackend(config)
    } catch (error) {
      console.warn(
        '[TranscriptionService] Config validation with backend failed (non-blocking):',
        error instanceof Error ? error.message : error,
      )
    }

    const response = await this.repository.uploadAudio(file, config)
    await this.repository.saveJobOwner(response.job_id, userId, durationSeconds)
    return response
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

    let estimatedDuration: number | undefined

    if (!skipCreditCheck) {
      await this.checkCreditsAvailable(userId)
      const info = await this.repository.getYoutubeInfo(url)
      estimatedDuration = info.duration_seconds
      await this.checkCreditsAvailable(userId, estimatedDuration)
    }

    const response = await this.repository.uploadFromYoutubeUrl(url, config)
    await this.repository.saveJobOwner(
      response.job_id,
      userId,
      estimatedDuration,
    )
    return response
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

    if (!skipCreditCheck) await this.checkCreditsAvailable(userId)

    const response = await this.repository.uploadFromSpotifyUrl(url, config)
    await this.repository.saveJobOwner(response.job_id, userId)
    return response
  }

  async getJob(jobId: string, userId: string): Promise<JobDetails> {
    const isOwner = await this.repository.verifyJobOwner(jobId, userId)
    if (!isOwner) {
      throw new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, 'Access denied')
    }
    try {
      const job = await this.repository.getJobStatus(jobId)

      if (
        job.status === 'completed' &&
        job.results != null &&
        job.results.duration_seconds > 0
      ) {
        await this.repository.atomicDeductCredits(
          jobId,
          userId,
          job.results.duration_seconds,
          `Transcription (${Math.ceil(job.results.duration_seconds)}s)`,
        )
      } else if (job.status === 'failed' && job.progress > 0) {
        await this.deductPartialCredits(jobId, userId, job.progress)
      }

      return job
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Job not found or expired',
      )
    }
  }

  private async deductPartialCredits(
    jobId: string,
    userId: string,
    progressPercent: number,
  ): Promise<void> {
    try {
      const dbJob = await db.transcriptionJob.findUnique({
        where: { backendJobId: jobId },
        select: { estimatedDurationSeconds: true, creditsDeducted: true },
      })
      if (!dbJob || dbJob.creditsDeducted || !dbJob.estimatedDurationSeconds)
        return

      const partial = Math.ceil(
        (progressPercent / 100) * dbJob.estimatedDurationSeconds,
      )
      if (partial <= 0) return

      await this.repository.atomicDeductCredits(
        jobId,
        userId,
        partial,
        `Transcription interrompue à ${progressPercent}% (${partial}s)`,
      )
    } catch {}
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
    const isOwner = await this.repository.verifyJobOwner(jobId, userId)
    if (!isOwner) {
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

  private async checkCreditsAvailable(
    userId: string,
    durationSeconds?: number,
  ): Promise<void> {
    const balance = await this.creditService.getUserCreditsBalance(userId)
    if (balance.remainingCredits <= 0) {
      throw new ApiError(
        'INSUFFICIENT_CREDITS',
        HTTP_STATUS.PAYMENT_REQUIRED,
        'Crédits insuffisants pour lancer une transcription',
      )
    }
    if (
      durationSeconds &&
      durationSeconds > 0 &&
      balance.remainingCredits < durationSeconds
    ) {
      const remainingMinutes = Math.floor(balance.remainingCredits / 60)
      const neededMinutes = Math.ceil(durationSeconds / 60)
      throw new ApiError(
        'INSUFFICIENT_CREDITS',
        HTTP_STATUS.PAYMENT_REQUIRED,
        `Crédits insuffisants : ${neededMinutes} min nécessaires, ${remainingMinutes} min disponibles`,
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
