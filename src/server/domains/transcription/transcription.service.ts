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
  constructor(private repository: TranscriptionRepository) {}

  async transcribe(
    file: File,
    config: TranscribeConfig,
    userId: string,
  ): Promise<TranscribeResponse> {
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
    await this.repository.saveJobOwner(response.job_id, userId)
    return response
  }

  async transcribeFromYoutube(
    url: string,
    config: TranscribeConfig,
    userId: string,
  ): Promise<TranscribeResponse> {
    if (!YOUTUBE_URL_REGEX.test(url)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'URL YouTube invalide',
      )
    }

    const response = await this.repository.uploadFromYoutubeUrl(url, config)
    await this.repository.saveJobOwner(response.job_id, userId)
    return response
  }

  async transcribeFromSpotify(
    url: string,
    config: TranscribeConfig,
    userId: string,
  ): Promise<TranscribeResponse> {
    if (!SPOTIFY_URL_REGEX.test(url)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'URL Spotify invalide',
      )
    }

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
      return await this.repository.getJobStatus(jobId)
    } catch (error) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Job not found or expired',
      )
    }
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
    } catch (error) {
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
    } catch (error) {
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
