import { NextRequest } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import type { TranscriptionService } from './transcription.service'
import type {
  TranscribeConfig,
  YoutubeTranscribeRequest,
} from './transcription.types'
import { YOUTUBE_URL_REGEX } from './transcription.types'

export class TranscriptionController {
  constructor(private service: TranscriptionService) {}

  async uploadAudio(userId: string, request: NextRequest) {
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File
      const configStr = formData.get('config') as string

      if (!file) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'File is required',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      if (!configStr) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Config is required',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      const config: TranscribeConfig = JSON.parse(configStr)
      const response = await this.service.transcribe(file, config, userId)
      return createSuccessResponse(response, HTTP_STATUS.CREATED)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async uploadYoutubeUrl(userId: string, request: NextRequest) {
    try {
      const body = (await request.json()) as YoutubeTranscribeRequest

      if (!body.url || !YOUTUBE_URL_REGEX.test(body.url)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'URL YouTube invalide',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      if (!body.config) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Config is required',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      const response = await this.service.transcribeFromYoutube(
        body.url,
        body.config,
        userId,
      )
      return createSuccessResponse(response, HTTP_STATUS.CREATED)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getJobStatus(jobId: string, userId: string) {
    try {
      const job = await this.service.getJob(jobId, userId)

      return createSuccessResponse(job)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async downloadPartition(jobId: string, userId: string) {
    try {
      const blob = await this.service.downloadPartition(jobId, userId)

      return new Response(blob, {
        status: HTTP_STATUS.OK,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="partition_${jobId}.svg"`,
        },
      })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async validateConfig(request: NextRequest) {
    try {
      const config = (await request.json()) as TranscribeConfig

      const validation = await this.service.validateConfiguration(config)

      return createSuccessResponse(validation)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async cancelJob(jobId: string, userId: string) {
    try {
      await this.service.cancelJob(jobId, userId)
      return createSuccessResponse({ cancelled: true })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async healthCheck() {
    try {
      const health = await this.service.checkHealth()

      return createSuccessResponse(health)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
