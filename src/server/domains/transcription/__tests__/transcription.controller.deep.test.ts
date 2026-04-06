// @ts-nocheck
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { TranscriptionController } from '../transcription.controller'
import { TranscriptionService } from '../transcription.service'
import type { TranscribeConfig } from '../transcription.types'

const makeConfig = (
  overrides: Partial<TranscribeConfig> = {},
): TranscribeConfig => ({
  instrument_mode: 'single',
  instrument_type: 'guitar',
  polyphonic: false,
  partition_type: 'tab_guitare',
  ...overrides,
})

const makeTranscribeResponse = () => ({
  job_id: 'job-abc-123',
  status: 'queued',
})

const makeJobDetails = (overrides = {}) => ({
  job_id: 'job-1',
  status: 'processing',
  progress: 50,
  current_step: 'transcription',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const makeFormDataRequest = (
  file: File | null,
  config: string | null,
): NextRequest => {
  const form = new FormData()
  if (file) form.append('file', file)
  if (config !== null) form.append('config', config)
  return new NextRequest('http://localhost/api/transcription/upload', {
    method: 'POST',
    body: form,
  })
}

const makeAudioFile = (name = 'test.mp3', type = 'audio/mpeg') =>
  new File([new Uint8Array(1024)], name, { type })

describe('TranscriptionController - Deep Tests', () => {
  let controller: TranscriptionController
  let mockService: TranscriptionService

  beforeEach(() => {
    mockService = {
      transcribe: vi.fn(),
      transcribeFromYoutube: vi.fn(),
      getJob: vi.fn(),
      downloadPartition: vi.fn(),
      validateConfiguration: vi.fn(),
      cancelJob: vi.fn(),
      checkHealth: vi.fn(),
      validateAudioFile: vi.fn(),
    } as any

    controller = new TranscriptionController(mockService)
    vi.clearAllMocks()
  })

  describe('uploadAudio', () => {
    it('should return 201 on successful upload', async () => {
      vi.mocked(mockService.transcribe).mockResolvedValue(
        makeTranscribeResponse() as any,
      )

      const req = makeFormDataRequest(
        makeAudioFile(),
        JSON.stringify(makeConfig()),
      )
      const res = await controller.uploadAudio('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      expect(body.success).toBe(true)
      expect(body.data.job_id).toBe('job-abc-123')
    })

    it('should return 400 when file is missing from FormData', async () => {
      const req = makeFormDataRequest(null, JSON.stringify(makeConfig()))
      const res = await controller.uploadAudio('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(body.success).toBe(false)
      expect(mockService.transcribe).not.toHaveBeenCalled()
    })

    it('should return 400 when config is missing from FormData', async () => {
      const req = makeFormDataRequest(makeAudioFile(), null)
      const res = await controller.uploadAudio('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(body.success).toBe(false)
      expect(mockService.transcribe).not.toHaveBeenCalled()
    })

    it('should return 500 when config JSON is malformed', async () => {
      const req = makeFormDataRequest(makeAudioFile(), '{invalid json}')
      const res = await controller.uploadAudio('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should return 413 when service throws PAYLOAD_TOO_LARGE', async () => {
      vi.mocked(mockService.transcribe).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.PAYLOAD_TOO_LARGE,
          'File too large',
        ),
      )

      const req = makeFormDataRequest(
        makeAudioFile(),
        JSON.stringify(makeConfig()),
      )
      const res = await controller.uploadAudio('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE)
    })

    it('should return 400 when service throws BAD_REQUEST for unsupported format', async () => {
      vi.mocked(mockService.transcribe).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          'Format non supporté',
        ),
      )

      const req = makeFormDataRequest(
        makeAudioFile(),
        JSON.stringify(makeConfig()),
      )
      const res = await controller.uploadAudio('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(body.error.message).toContain('Format non supporté')
    })

    it('should return 500 when service throws unexpected error', async () => {
      vi.mocked(mockService.transcribe).mockRejectedValue(
        new Error('Unexpected crash'),
      )

      const req = makeFormDataRequest(
        makeAudioFile(),
        JSON.stringify(makeConfig()),
      )
      const res = await controller.uploadAudio('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should pass userId to service', async () => {
      vi.mocked(mockService.transcribe).mockResolvedValue(
        makeTranscribeResponse() as any,
      )

      const req = makeFormDataRequest(
        makeAudioFile(),
        JSON.stringify(makeConfig()),
      )
      await controller.uploadAudio('specific-user-99', req)

      expect(mockService.transcribe).toHaveBeenCalledWith(
        expect.any(File),
        expect.any(Object),
        'specific-user-99',
      )
    })
  })

  describe('uploadYoutubeUrl', () => {
    const makeYoutubeRequest = (body: object) =>
      new NextRequest('http://localhost/api/transcription/youtube', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })

    it('should return 201 on valid YouTube URL and config', async () => {
      vi.mocked(mockService.transcribeFromYoutube).mockResolvedValue(
        makeTranscribeResponse() as any,
      )

      const req = makeYoutubeRequest({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        config: makeConfig(),
      })
      const res = await controller.uploadYoutubeUrl('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      expect(body.success).toBe(true)
      expect(body.data.job_id).toBe('job-abc-123')
    })

    it('should return 400 when url is missing from body', async () => {
      const req = makeYoutubeRequest({ config: makeConfig() })
      const res = await controller.uploadYoutubeUrl('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(body.success).toBe(false)
      expect(mockService.transcribeFromYoutube).not.toHaveBeenCalled()
    })

    it('should return 400 when URL is not a YouTube URL', async () => {
      const req = makeYoutubeRequest({
        url: 'https://vimeo.com/123456789',
        config: makeConfig(),
      })
      const res = await controller.uploadYoutubeUrl('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(body.success).toBe(false)
    })

    it('should return 400 when URL is empty string', async () => {
      const req = makeYoutubeRequest({ url: '', config: makeConfig() })
      const res = await controller.uploadYoutubeUrl('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return 400 when config is missing from body', async () => {
      const req = makeYoutubeRequest({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      const res = await controller.uploadYoutubeUrl('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(body.success).toBe(false)
    })

    it('should return 500 when request body is not valid JSON', async () => {
      const req = new NextRequest(
        'http://localhost/api/transcription/youtube',
        {
          method: 'POST',
          body: 'not-json',
          headers: { 'Content-Type': 'application/json' },
        },
      )
      const res = await controller.uploadYoutubeUrl('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should accept youtu.be short URL', async () => {
      vi.mocked(mockService.transcribeFromYoutube).mockResolvedValue(
        makeTranscribeResponse() as any,
      )

      const req = makeYoutubeRequest({
        url: 'https://youtu.be/dQw4w9WgXcQ',
        config: makeConfig(),
      })
      const res = await controller.uploadYoutubeUrl('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.CREATED)
    })

    it('should accept youtube.com/shorts URL', async () => {
      vi.mocked(mockService.transcribeFromYoutube).mockResolvedValue(
        makeTranscribeResponse() as any,
      )

      const req = makeYoutubeRequest({
        url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        config: makeConfig(),
      })
      const res = await controller.uploadYoutubeUrl('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.CREATED)
    })

    it('should return 500 when service throws unexpected error', async () => {
      vi.mocked(mockService.transcribeFromYoutube).mockRejectedValue(
        new Error('Backend crash'),
      )

      const req = makeYoutubeRequest({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        config: makeConfig(),
      })
      const res = await controller.uploadYoutubeUrl('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should return ApiError HTTP status when service throws ApiError', async () => {
      vi.mocked(mockService.transcribeFromYoutube).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          'URL YouTube invalide',
        ),
      )

      const req = makeYoutubeRequest({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        config: makeConfig(),
      })
      const res = await controller.uploadYoutubeUrl('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should pass userId to service', async () => {
      vi.mocked(mockService.transcribeFromYoutube).mockResolvedValue(
        makeTranscribeResponse() as any,
      )

      const req = makeYoutubeRequest({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        config: makeConfig(),
      })
      await controller.uploadYoutubeUrl('youtube-user-7', req)

      expect(mockService.transcribeFromYoutube).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        expect.any(Object),
        'youtube-user-7',
      )
    })
  })

  describe('getJobStatus', () => {
    it('should return 200 with job details when user owns the job', async () => {
      vi.mocked(mockService.getJob).mockResolvedValue(makeJobDetails() as any)

      const res = await controller.getJobStatus('job-1', 'user-1')
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(body.success).toBe(true)
      expect(body.data.job_id).toBe('job-1')
    })

    it('should return 403 when user does not own the job', async () => {
      vi.mocked(mockService.getJob).mockRejectedValue(
        new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, 'Access denied'),
      )

      const res = await controller.getJobStatus('job-1', 'user-other')

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('should return 404 when job does not exist', async () => {
      vi.mocked(mockService.getJob).mockRejectedValue(
        new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Job not found or expired',
        ),
      )

      const res = await controller.getJobStatus('ghost-job', 'user-1')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should return 500 when service throws unexpected error', async () => {
      vi.mocked(mockService.getJob).mockRejectedValue(new Error('DB crash'))

      const res = await controller.getJobStatus('job-1', 'user-1')

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should pass jobId and userId to service correctly', async () => {
      vi.mocked(mockService.getJob).mockResolvedValue(makeJobDetails() as any)

      await controller.getJobStatus('specific-job-id', 'specific-user-id')

      expect(mockService.getJob).toHaveBeenCalledWith(
        'specific-job-id',
        'specific-user-id',
      )
    })
  })

  describe('cancelJob', () => {
    it('should return 200 with cancelled flag when job is cancelled', async () => {
      vi.mocked(mockService.cancelJob).mockResolvedValue(undefined)

      const res = await controller.cancelJob('job-1', 'user-1')
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(body.data.cancelled).toBe(true)
    })

    it('should return 403 when user does not own the job', async () => {
      vi.mocked(mockService.cancelJob).mockRejectedValue(
        new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, 'Access denied'),
      )

      const res = await controller.cancelJob('job-1', 'user-other')

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('should return 404 when job cannot be found or cancelled', async () => {
      vi.mocked(mockService.cancelJob).mockRejectedValue(
        new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Job introuvable'),
      )

      const res = await controller.cancelJob('expired-job', 'user-1')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('downloadPartition', () => {
    it('should return SVG blob with correct headers', async () => {
      const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' })
      vi.mocked(mockService.downloadPartition).mockResolvedValue(blob)

      const res = await controller.downloadPartition('job-1', 'user-1')

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(res.headers.get('Content-Type')).toBe('image/svg+xml')
      expect(res.headers.get('Content-Disposition')).toContain('job-1')
    })

    it('should return 400 when job is not completed', async () => {
      vi.mocked(mockService.downloadPartition).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          'Job is not completed yet',
        ),
      )

      const res = await controller.downloadPartition('job-1', 'user-1')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should return 403 when user does not own the job', async () => {
      vi.mocked(mockService.downloadPartition).mockRejectedValue(
        new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, 'Access denied'),
      )

      const res = await controller.downloadPartition('job-1', 'user-other')

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('should return 404 when partition SVG is not available', async () => {
      vi.mocked(mockService.downloadPartition).mockRejectedValue(
        new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Partition SVG is not available',
        ),
      )

      const res = await controller.downloadPartition('job-1', 'user-1')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('validateConfig', () => {
    it('should return 200 with validation result', async () => {
      vi.mocked(mockService.validateConfiguration).mockResolvedValue({
        valid: true,
      })

      const req = new NextRequest(
        'http://localhost/api/transcription/config/validate',
        {
          method: 'POST',
          body: JSON.stringify(makeConfig()),
          headers: { 'Content-Type': 'application/json' },
        },
      )
      const res = await controller.validateConfig(req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(body.data.valid).toBe(true)
    })

    it('should return 200 with invalid result when backend rejects config', async () => {
      vi.mocked(mockService.validateConfiguration).mockResolvedValue({
        valid: false,
        errors: ['incompatible partition type'],
      })

      const req = new NextRequest(
        'http://localhost/api/transcription/config/validate',
        {
          method: 'POST',
          body: JSON.stringify(
            makeConfig({
              partition_type: 'tab_basse',
              instrument_type: 'guitar',
            }),
          ),
          headers: { 'Content-Type': 'application/json' },
        },
      )
      const res = await controller.validateConfig(req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(body.data.valid).toBe(false)
    })

    it('should return 500 when request body is malformed JSON', async () => {
      const req = new NextRequest(
        'http://localhost/api/transcription/config/validate',
        {
          method: 'POST',
          body: 'bad-json',
          headers: { 'Content-Type': 'application/json' },
        },
      )
      const res = await controller.validateConfig(req)

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('healthCheck', () => {
    it('should return 200 with health status', async () => {
      vi.mocked(mockService.checkHealth).mockResolvedValue({
        status: 'healthy',
        demucs_available: true,
        disk_space_gb: 100,
      })

      const res = await controller.healthCheck()
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(body.data.status).toBe('healthy')
    })

    it('should return 500 when health check throws', async () => {
      vi.mocked(mockService.checkHealth).mockRejectedValue(
        new Error('Backend down'),
      )

      const res = await controller.healthCheck()

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })
})
