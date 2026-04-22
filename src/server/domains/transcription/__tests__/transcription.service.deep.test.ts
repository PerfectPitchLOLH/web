import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { TranscriptionRepository } from '../transcription.repository'
import { TranscriptionService } from '../transcription.service'
import type {
  TranscribeConfig,
  TranscribeResponse,
} from '../transcription.types'

const makeConfig = (
  overrides: Partial<TranscribeConfig> = {},
): TranscribeConfig => ({
  instrument_mode: 'single',
  instrument_type: 'guitar',
  polyphonic: false,
  partition_type: 'tab_guitare',
  ...overrides,
})

const makeFile = (
  name = 'test.mp3',
  type = 'audio/mpeg',
  sizeBytes = 1024,
): File => {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type })
  return new File([blob], name, { type })
}

const makeTranscribeResponse = (overrides = {}): TranscribeResponse => ({
  job_id: 'job-abc-123',
  status: 'queued',
  ...overrides,
})

describe('TranscriptionService - Deep Tests', () => {
  let service: TranscriptionService
  let mockRepo: TranscriptionRepository
  let mockCreditService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockRepo = {
      uploadAudio: vi.fn(),
      uploadFromYoutubeUrl: vi.fn(),
      getJobStatus: vi.fn(),
      downloadPartition: vi.fn(),
      validateConfig: vi.fn(),
      cancelJob: vi.fn(),
      healthCheck: vi.fn(),
      saveJobOwner: vi.fn(),
      verifyJobOwner: vi.fn(),
      atomicDeductCredits: vi.fn().mockResolvedValue('already_deducted'),
    } as any

    mockCreditService = {
      getUserCreditsBalance: vi
        .fn()
        .mockResolvedValue({ remainingCredits: 3600 }),
      deductCreditsInSeconds: vi.fn().mockResolvedValue(undefined),
    }

    service = new TranscriptionService(mockRepo, mockCreditService)
  })

  describe('transcribe', () => {
    it('should return job response on valid file and config', async () => {
      vi.mocked(mockRepo.validateConfig).mockResolvedValue({ valid: true })
      vi.mocked(mockRepo.uploadAudio).mockResolvedValue(
        makeTranscribeResponse(),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      const result = await service.transcribe(
        makeFile(),
        makeConfig(),
        'user-1',
      )

      expect(result.job_id).toBe('job-abc-123')
      expect(result.status).toBe('queued')
      expect(mockRepo.saveJobOwner).toHaveBeenCalledWith(
        'job-abc-123',
        'user-1',
      )
    })

    it('should throw PAYLOAD_TOO_LARGE when file exceeds max size', async () => {
      const maxSizeMb = parseInt(
        process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '100',
        10,
      )
      const oversizedFile = makeFile(
        'big.mp3',
        'audio/mpeg',
        (maxSizeMb + 1) * 1024 * 1024,
      )

      await expect(
        service.transcribe(oversizedFile, makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      })
    })

    it('should throw BAD_REQUEST when MIME type is not supported', async () => {
      const pdfFile = makeFile('doc.pdf', 'application/pdf')

      await expect(
        service.transcribe(pdfFile, makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('should throw BAD_REQUEST when extension is not supported even if MIME is faked', async () => {
      const fakeFile = makeFile('malware.exe', 'audio/mpeg')

      await expect(
        service.transcribe(fakeFile, makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('should accept all valid audio MIME types', async () => {
      const validFiles = [
        makeFile('a.wav', 'audio/wav'),
        makeFile('b.wav', 'audio/x-wav'),
        makeFile('c.flac', 'audio/flac'),
        makeFile('d.flac', 'audio/x-flac'),
        makeFile('e.m4a', 'audio/mp4'),
        makeFile('f.m4a', 'audio/x-m4a'),
        makeFile('g.ogg', 'audio/ogg'),
        makeFile('h.ogg', 'audio/x-ogg'),
      ]

      vi.mocked(mockRepo.validateConfig).mockResolvedValue({ valid: true })
      vi.mocked(mockRepo.uploadAudio).mockResolvedValue(
        makeTranscribeResponse(),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      for (const file of validFiles) {
        await expect(
          service.transcribe(file, makeConfig(), 'user-1'),
        ).resolves.toBeDefined()
      }
    })

    it('should proceed even when backend config validation fails (non-blocking)', async () => {
      vi.mocked(mockRepo.validateConfig).mockRejectedValue(
        new Error('Backend down'),
      )
      vi.mocked(mockRepo.uploadAudio).mockResolvedValue(
        makeTranscribeResponse(),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      const result = await service.transcribe(
        makeFile(),
        makeConfig(),
        'user-1',
      )

      expect(result.job_id).toBe('job-abc-123')
    })

    it('should propagate error when uploadAudio throws', async () => {
      vi.mocked(mockRepo.validateConfig).mockResolvedValue({ valid: true })
      vi.mocked(mockRepo.uploadAudio).mockRejectedValue(
        new Error('Audio upload failed: Connection refused'),
      )

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toThrow('Audio upload failed')
    })

    it('should call saveJobOwner with correct userId after successful upload', async () => {
      vi.mocked(mockRepo.validateConfig).mockResolvedValue({ valid: true })
      vi.mocked(mockRepo.uploadAudio).mockResolvedValue(
        makeTranscribeResponse({ job_id: 'unique-job-id' }),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      await service.transcribe(makeFile(), makeConfig(), 'specific-user-42')

      expect(mockRepo.saveJobOwner).toHaveBeenCalledWith(
        'unique-job-id',
        'specific-user-42',
      )
    })

    it('should still return response even if saveJobOwner fails', async () => {
      vi.mocked(mockRepo.validateConfig).mockResolvedValue({ valid: true })
      vi.mocked(mockRepo.uploadAudio).mockResolvedValue(
        makeTranscribeResponse(),
      )
      vi.mocked(mockRepo.saveJobOwner).mockRejectedValue(new Error('DB error'))

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toThrow()
    })
  })

  describe('transcribeFromYoutube', () => {
    it('should return job response for a valid youtube.com/watch URL', async () => {
      vi.mocked(mockRepo.uploadFromYoutubeUrl).mockResolvedValue(
        makeTranscribeResponse(),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      const result = await service.transcribeFromYoutube(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        makeConfig(),
        'user-1',
      )

      expect(result.job_id).toBe('job-abc-123')
    })

    it('should return job response for a valid youtu.be short URL', async () => {
      vi.mocked(mockRepo.uploadFromYoutubeUrl).mockResolvedValue(
        makeTranscribeResponse(),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      const result = await service.transcribeFromYoutube(
        'https://youtu.be/dQw4w9WgXcQ',
        makeConfig(),
        'user-1',
      )

      expect(result.job_id).toBe('job-abc-123')
    })

    it('should return job response for a valid youtube.com/shorts URL', async () => {
      vi.mocked(mockRepo.uploadFromYoutubeUrl).mockResolvedValue(
        makeTranscribeResponse(),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      const result = await service.transcribeFromYoutube(
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        makeConfig(),
        'user-1',
      )

      expect(result.job_id).toBe('job-abc-123')
    })

    it('should throw BAD_REQUEST for a non-YouTube URL', async () => {
      await expect(
        service.transcribeFromYoutube(
          'https://vimeo.com/123456789',
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })

      expect(mockRepo.uploadFromYoutubeUrl).not.toHaveBeenCalled()
    })

    it('should throw BAD_REQUEST for an empty URL', async () => {
      await expect(
        service.transcribeFromYoutube('', makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('should throw BAD_REQUEST for youtube.com/watch without v= param', async () => {
      await expect(
        service.transcribeFromYoutube(
          'https://youtube.com/watch',
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('should throw BAD_REQUEST for URL with spaces', async () => {
      await expect(
        service.transcribeFromYoutube(
          'https://youtube.com/watch?v=dQw4w9W gXcQ',
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('should throw BAD_REQUEST for URL with XSS payload', async () => {
      await expect(
        service.transcribeFromYoutube(
          'https://youtube.com/watch?v=<script>alert(1)</script>',
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('should propagate error when backend is down', async () => {
      vi.mocked(mockRepo.uploadFromYoutubeUrl).mockRejectedValue(
        new Error('YouTube upload failed: Connection refused'),
      )

      await expect(
        service.transcribeFromYoutube(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          makeConfig(),
          'user-1',
        ),
      ).rejects.toThrow('YouTube upload failed')
    })

    it('should call saveJobOwner with correct args after successful upload', async () => {
      vi.mocked(mockRepo.uploadFromYoutubeUrl).mockResolvedValue(
        makeTranscribeResponse({ job_id: 'yt-job-999' }),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      await service.transcribeFromYoutube(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        makeConfig(),
        'user-42',
      )

      expect(mockRepo.saveJobOwner).toHaveBeenCalledWith(
        'yt-job-999',
        'user-42',
      )
    })
  })

  describe('getJob', () => {
    const makeJobDetails = (overrides = {}) => ({
      job_id: 'job-1',
      status: 'processing' as const,
      progress: 50,
      current_step: 'transcription' as const,
      created_at: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    it('should return job details when user is the owner', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeJobDetails() as any,
      )

      const result = await service.getJob('job-1', 'user-1')

      expect(result.job_id).toBe('job-1')
      expect(mockRepo.verifyJobOwner).toHaveBeenCalledWith('job-1', 'user-1')
    })

    it('should throw FORBIDDEN when user does not own the job', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(false)

      await expect(service.getJob('job-1', 'user-other')).rejects.toMatchObject(
        {
          code: 'FORBIDDEN',
          statusCode: HTTP_STATUS.FORBIDDEN,
        },
      )

      expect(mockRepo.getJobStatus).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when job does not exist in backend', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockRejectedValue(
        new Error('Backend API call failed: HTTP error 404'),
      )

      await expect(service.getJob('ghost-job', 'user-1')).rejects.toMatchObject(
        {
          code: 'NOT_FOUND',
          statusCode: HTTP_STATUS.NOT_FOUND,
        },
      )
    })

    it('should return job with completed status and results', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeJobDetails({
          status: 'completed',
          progress: 100,
          results: {
            partition_svg_url: '/api/transcription/job-1/download',
            duration_seconds: 240,
          },
        }) as any,
      )

      const result = await service.getJob('job-1', 'user-1')

      expect(result.status).toBe('completed')
      expect(result.results?.partition_svg_url).toBeDefined()
    })
  })

  describe('cancelJob', () => {
    it('should cancel job when user owns it', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.cancelJob).mockResolvedValue(undefined)

      await expect(
        service.cancelJob('job-1', 'user-1'),
      ).resolves.toBeUndefined()

      expect(mockRepo.cancelJob).toHaveBeenCalledWith('job-1')
    })

    it('should throw FORBIDDEN when user does not own the job', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(false)

      await expect(
        service.cancelJob('job-1', 'user-other'),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: HTTP_STATUS.FORBIDDEN,
      })

      expect(mockRepo.cancelJob).not.toHaveBeenCalled()
    })

    it('should throw NOT_FOUND when backend cancel fails', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.cancelJob).mockRejectedValue(
        new Error('Job cancellation failed: 404'),
      )

      await expect(
        service.cancelJob('expired-job', 'user-1'),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: HTTP_STATUS.NOT_FOUND,
      })
    })
  })

  describe('downloadPartition', () => {
    const makeJobDetails = (overrides = {}) => ({
      job_id: 'job-1',
      status: 'completed' as const,
      progress: 100,
      current_step: 'svg' as const,
      created_at: '2024-01-01T00:00:00Z',
      results: {
        partition_svg_url: '/api/transcription/job-1/download',
        duration_seconds: 120,
      },
      ...overrides,
    })

    it('should return blob when job is completed and has SVG url', async () => {
      const fakeBlob = new Blob(['<svg/>'], { type: 'image/svg+xml' })
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeJobDetails() as any,
      )
      vi.mocked(mockRepo.downloadPartition).mockResolvedValue(fakeBlob)

      const result = await service.downloadPartition('job-1', 'user-1')

      expect(result).toBe(fakeBlob)
    })

    it('should throw VALIDATION_ERROR when job is not yet completed', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeJobDetails({ status: 'processing', results: undefined }) as any,
      )

      await expect(
        service.downloadPartition('job-1', 'user-1'),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      })
    })

    it('should throw NOT_FOUND when completed job has no SVG url', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeJobDetails({ results: undefined }) as any,
      )

      await expect(
        service.downloadPartition('job-1', 'user-1'),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: HTTP_STATUS.NOT_FOUND,
      })
    })
  })

  describe('validateConfiguration', () => {
    it('should return valid response from backend', async () => {
      vi.mocked(mockRepo.validateConfig).mockResolvedValue({ valid: true })

      const result = await service.validateConfiguration(makeConfig())

      expect(result.valid).toBe(true)
    })

    it('should return invalid when backend reports errors', async () => {
      vi.mocked(mockRepo.validateConfig).mockResolvedValue({
        valid: false,
        errors: ['tab_guitare not compatible with bass instrument'],
      })

      const result = await service.validateConfiguration(
        makeConfig({ instrument_type: 'bass', partition_type: 'tab_guitare' }),
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should return graceful error object when backend is unreachable', async () => {
      vi.mocked(mockRepo.validateConfig).mockRejectedValue(
        new Error('Backend API call failed'),
      )

      const result = await service.validateConfiguration(makeConfig())

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        'Unable to validate configuration with backend',
      )
    })
  })

  describe('validateAudioFile', () => {
    it('should not throw for a valid MP3 file', () => {
      expect(() =>
        service.validateAudioFile(makeFile('a.mp3', 'audio/mpeg')),
      ).not.toThrow()
    })

    it('should not throw for a valid WAV file', () => {
      expect(() =>
        service.validateAudioFile(makeFile('a.wav', 'audio/wav')),
      ).not.toThrow()
    })

    it('should not throw for a valid FLAC file', () => {
      expect(() =>
        service.validateAudioFile(makeFile('a.flac', 'audio/flac')),
      ).not.toThrow()
    })

    it('should not throw for a valid M4A file', () => {
      expect(() =>
        service.validateAudioFile(makeFile('a.m4a', 'audio/mp4')),
      ).not.toThrow()
    })

    it('should not throw for a valid OGG file', () => {
      expect(() =>
        service.validateAudioFile(makeFile('a.ogg', 'audio/ogg')),
      ).not.toThrow()
    })

    it('should throw for a file with no extension', () => {
      const file = makeFile('noextension', 'audio/mpeg')
      expect(() => service.validateAudioFile(file)).toThrow(ApiError)
    })

    it('should throw PAYLOAD_TOO_LARGE at exactly the size boundary', () => {
      const maxSizeMb = parseInt(
        process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '100',
        10,
      )
      const maxBytes = maxSizeMb * 1024 * 1024
      const file = makeFile('edge.mp3', 'audio/mpeg', maxBytes + 1)
      expect(() => service.validateAudioFile(file)).toThrow(ApiError)
    })
  })

  describe('checkHealth', () => {
    it('should return health status from repository', async () => {
      const health = {
        status: 'healthy' as const,
        demucs_available: true,
        disk_space_gb: 50,
      }
      vi.mocked(mockRepo.healthCheck).mockResolvedValue(health)

      const result = await service.checkHealth()

      expect(result.status).toBe('healthy')
      expect(result.demucs_available).toBe(true)
    })

    it('should propagate error when backend health check fails', async () => {
      vi.mocked(mockRepo.healthCheck).mockRejectedValue(
        new Error('Backend unreachable'),
      )

      await expect(service.checkHealth()).rejects.toThrow('Backend unreachable')
    })
  })

  describe('credit pre-check', () => {
    it('should block transcribe() when no credits remain', async () => {
      mockCreditService.getUserCreditsBalance.mockResolvedValue({
        remainingCredits: 0,
      })

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-broke'),
      ).rejects.toMatchObject({
        code: 'INSUFFICIENT_CREDITS',
        statusCode: 402,
      })

      expect(mockRepo.uploadAudio).not.toHaveBeenCalled()
    })

    it('should block transcribeFromYoutube() when no credits remain', async () => {
      mockCreditService.getUserCreditsBalance.mockResolvedValue({
        remainingCredits: 0,
      })

      await expect(
        service.transcribeFromYoutube(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          makeConfig(),
          'user-broke',
        ),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS', statusCode: 402 })

      expect(mockRepo.uploadFromYoutubeUrl).not.toHaveBeenCalled()
    })

    it('should block transcribeFromSpotify() when no credits remain', async () => {
      mockCreditService.getUserCreditsBalance.mockResolvedValue({
        remainingCredits: 0,
      })

      await expect(
        service.transcribeFromSpotify(
          'https://open.spotify.com/track/abc123',
          makeConfig(),
          'user-broke',
        ),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS', statusCode: 402 })
    })

    it('should allow transcription when credits are available', async () => {
      mockCreditService.getUserCreditsBalance.mockResolvedValue({
        remainingCredits: 60,
      })
      vi.mocked(mockRepo.validateConfig).mockResolvedValue({ valid: true })
      vi.mocked(mockRepo.uploadAudio).mockResolvedValue(
        makeTranscribeResponse(),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).resolves.toBeDefined()
    })

    it('should allow transcription when credits are exactly 1 second', async () => {
      mockCreditService.getUserCreditsBalance.mockResolvedValue({
        remainingCredits: 1,
      })
      vi.mocked(mockRepo.validateConfig).mockResolvedValue({ valid: true })
      vi.mocked(mockRepo.uploadAudio).mockResolvedValue(
        makeTranscribeResponse(),
      )
      vi.mocked(mockRepo.saveJobOwner).mockResolvedValue(undefined)

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).resolves.toBeDefined()
    })
  })

  describe('credit post-deduct in getJob()', () => {
    const makeCompletedJob = (durationSeconds = 227) => ({
      job_id: 'job-done',
      status: 'completed' as const,
      progress: 100,
      current_step: 'svg' as const,
      created_at: '2024-01-01T00:00:00Z',
      results: {
        partition_svg_url: '/api/transcription/job-done/download',
        duration_seconds: durationSeconds,
      },
    })

    it('should deduct credits when job completes for first time', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeCompletedJob(180) as any,
      )
      vi.mocked(mockRepo.atomicDeductCredits).mockResolvedValue(
        'deducted' as const,
      )

      await service.getJob('job-done', 'user-1')

      expect(mockRepo.atomicDeductCredits).toHaveBeenCalledWith(
        'job-done',
        'user-1',
        180,
        expect.any(String),
      )
      expect(mockCreditService.deductCreditsInSeconds).toHaveBeenCalledWith(
        'user-1',
        180,
        expect.stringContaining('180'),
      )
    })

    it('should NOT deduct credits when already deducted (idempotence)', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeCompletedJob(180) as any,
      )
      vi.mocked(mockRepo.atomicDeductCredits).mockResolvedValue(
        'already_deducted',
      )

      await service.getJob('job-done', 'user-1')

      expect(mockCreditService.deductCreditsInSeconds).not.toHaveBeenCalled()
    })

    it('should NOT deduct credits when job is still processing', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue({
        job_id: 'job-1',
        status: 'processing' as const,
        progress: 50,
        current_step: 'transcription' as const,
        created_at: '2024-01-01T00:00:00Z',
      } as any)

      await service.getJob('job-1', 'user-1')

      expect(mockRepo.atomicDeductCredits).not.toHaveBeenCalled()
      expect(mockCreditService.deductCreditsInSeconds).not.toHaveBeenCalled()
    })

    it('should NOT deduct credits when duration_seconds is 0', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeCompletedJob(0) as any,
      )

      await service.getJob('job-done', 'user-1')

      expect(mockRepo.atomicDeductCredits).not.toHaveBeenCalled()
      expect(mockCreditService.deductCreditsInSeconds).not.toHaveBeenCalled()
    })

    it('should NOT deduct credits when job failed', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue({
        job_id: 'job-fail',
        status: 'failed' as const,
        progress: 30,
        current_step: 'preprocessing' as const,
        created_at: '2024-01-01T00:00:00Z',
        error: 'Processing failed',
      } as any)

      await service.getJob('job-fail', 'user-1')

      expect(mockCreditService.deductCreditsInSeconds).not.toHaveBeenCalled()
    })

    it('should still return job details even after deducting credits', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeCompletedJob(60) as any,
      )
      vi.mocked(mockRepo.atomicDeductCredits).mockResolvedValue(
        'deducted' as const,
      )

      const result = await service.getJob('job-done', 'user-1')

      expect(result.status).toBe('completed')
      expect(result.results?.duration_seconds).toBe(60)
    })

    it('should pass correct duration to atomicDeductCredits', async () => {
      vi.mocked(mockRepo.verifyJobOwner).mockResolvedValue(true)
      vi.mocked(mockRepo.getJobStatus).mockResolvedValue(
        makeCompletedJob(347) as any,
      )
      vi.mocked(mockRepo.atomicDeductCredits).mockResolvedValue(
        'deducted' as const,
      )

      await service.getJob('job-done', 'user-1')

      expect(mockRepo.atomicDeductCredits).toHaveBeenCalledWith('job-done', 347)
      expect(mockCreditService.deductCreditsInSeconds).toHaveBeenCalledWith(
        'user-1',
        347,
        expect.any(String),
      )
    })
  })
})
