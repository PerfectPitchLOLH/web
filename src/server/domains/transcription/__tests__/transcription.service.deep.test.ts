import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/lib/database', () => ({ db: {} }))

vi.mock('@/server/domains/permission', () => ({
  permissionService: {
    getUserPermissionContext: vi.fn(),
    checkFeatureAccessForUser: vi.fn(),
  },
}))

import { permissionService } from '@/server/domains/permission'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { LOCAL_JOB_STATUS } from '../transcription.constants'
import {
  BackendApiError,
  TranscriptionRepository,
} from '../transcription.repository'
import { TranscriptionService } from '../transcription.service'
import type {
  JobDetails,
  LocalJob,
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

const makeJob = (overrides: Partial<JobDetails> = {}): JobDetails => ({
  job_id: 'job-1',
  status: 'processing',
  progress: 50,
  current_step: 'transcription',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const makeLocalJob = (overrides: Partial<LocalJob> = {}): LocalJob => ({
  id: 'local-1',
  backendJobId: 'job-1',
  userId: 'user-1',
  status: LOCAL_JOB_STATUS.ACTIVE,
  creditsDeducted: false,
  chargedMonthlySeconds: 0,
  chargedBonusSeconds: 0,
  durationSeconds: null,
  estimatedDurationSeconds: null,
  createdAt: new Date(),
  ...overrides,
})

describe('TranscriptionService - Deep Tests', () => {
  let service: TranscriptionService
  let repo: Record<keyof TranscriptionRepository, ReturnType<typeof vi.fn>>
  let creditService: { getUserCreditsBalance: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()

    repo = {
      uploadAudio: vi.fn(),
      uploadFromYoutubeUrl: vi.fn(),
      uploadFromSpotifyUrl: vi.fn(),
      getJobStatus: vi.fn(),
      downloadPartition: vi.fn(),
      validateConfig: vi.fn().mockResolvedValue({ valid: true }),
      cancelJob: vi.fn().mockResolvedValue(undefined),
      healthCheck: vi.fn(),
      getYoutubeInfo: vi.fn(),
      acquireJobSlot: vi.fn().mockResolvedValue('slot-1'),
      attachBackendJob: vi.fn().mockResolvedValue(undefined),
      releaseJobSlot: vi.fn().mockResolvedValue(undefined),
      deleteStalePendingJobs: vi.fn().mockResolvedValue(0),
      recordExemptJob: vi.fn().mockResolvedValue(undefined),
      findJobForUser: vi.fn(),
      findOpenJobsForUser: vi.fn().mockResolvedValue([]),
      findOpenJobs: vi.fn().mockResolvedValue([]),
      reserveCredits: vi.fn().mockResolvedValue('reserved'),
      settleCompletedJob: vi.fn().mockResolvedValue(undefined),
      settleUnsuccessfulJob: vi.fn().mockResolvedValue(undefined),
      verifyJobOwner: vi.fn(),
      findUserAccess: vi.fn().mockResolvedValue({
        isAdmin: false,
        emailVerified: new Date(),
      }),
      hasPastDueSubscription: vi.fn().mockResolvedValue(false),
    } as any

    creditService = {
      getUserCreditsBalance: vi.fn().mockResolvedValue({
        remainingCredits: 600,
      }),
    }

    vi.mocked(permissionService.getUserPermissionContext).mockResolvedValue({
      userId: 'user-1',
      planTier: 'free',
      subscriptionStatus: null,
      isTrialing: false,
      isCanceled: false,
    })
    vi.mocked(permissionService.checkFeatureAccessForUser).mockResolvedValue({
      hasAccess: true,
    })

    service = new TranscriptionService(
      repo as unknown as TranscriptionRepository,
      creditService as any,
    )
  })

  describe('transcribe', () => {
    it('acquires a slot, uploads with the remaining balance as max duration and records the job', async () => {
      repo.uploadAudio.mockResolvedValue(
        makeTranscribeResponse({ duration_seconds: 120.4 }),
      )

      const result = await service.transcribe(
        makeFile(),
        makeConfig(),
        'user-1',
      )

      expect(result.job_id).toBe('job-abc-123')
      expect(repo.acquireJobSlot).toHaveBeenCalledWith('user-1', 1, undefined)
      expect(repo.uploadAudio).toHaveBeenCalledWith(
        expect.any(File),
        makeConfig(),
        600,
      )
      expect(repo.attachBackendJob).toHaveBeenCalledWith(
        'slot-1',
        'job-abc-123',
        120.4,
      )
    })

    it('reserves the measured duration as soon as the backend returns it', async () => {
      repo.uploadAudio.mockResolvedValue(
        makeTranscribeResponse({ duration_seconds: 120.4 }),
      )

      await service.transcribe(makeFile(), makeConfig(), 'user-1')

      expect(repo.reserveCredits).toHaveBeenCalledWith(
        'job-abc-123',
        'user-1',
        120.4,
        'Transcription (121s)',
      )
    })

    it('does not reserve when the backend does not return a duration (legacy backend)', async () => {
      repo.uploadAudio.mockResolvedValue(makeTranscribeResponse())

      await service.transcribe(makeFile(), makeConfig(), 'user-1')

      expect(repo.reserveCredits).not.toHaveBeenCalled()
      expect(repo.attachBackendJob).toHaveBeenCalledWith(
        'slot-1',
        'job-abc-123',
        0,
      )
    })

    it('cancels the backend job and frees the slot when the reservation is insufficient', async () => {
      repo.uploadAudio.mockResolvedValue(
        makeTranscribeResponse({ duration_seconds: 500 }),
      )
      repo.reserveCredits.mockResolvedValue('insufficient')

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'INSUFFICIENT_CREDITS',
        statusCode: HTTP_STATUS.PAYMENT_REQUIRED,
      })

      expect(repo.cancelJob).toHaveBeenCalledWith('job-abc-123')
      expect(repo.releaseJobSlot).toHaveBeenCalledWith('slot-1')
    })

    it('cancels the backend job and frees the slot when attaching fails', async () => {
      repo.uploadAudio.mockResolvedValue(makeTranscribeResponse())
      repo.attachBackendJob.mockRejectedValue(new Error('db down'))

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toThrow('db down')

      expect(repo.cancelJob).toHaveBeenCalledWith('job-abc-123')
      expect(repo.releaseJobSlot).toHaveBeenCalledWith('slot-1')
    })

    it('frees the slot and rethrows when the upload fails', async () => {
      repo.uploadAudio.mockRejectedValue(new Error('Audio upload failed'))

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toThrow('Audio upload failed')

      expect(repo.releaseJobSlot).toHaveBeenCalledWith('slot-1')
      expect(repo.attachBackendJob).not.toHaveBeenCalled()
    })

    it('maps a backend AUDIO_TOO_LONG refusal to a 422 user error and frees the slot', async () => {
      repo.uploadAudio.mockRejectedValue(
        new BackendApiError(422, 'too long', 'AUDIO_TOO_LONG', 900),
      )

      const error = await service
        .transcribe(makeFile(), makeConfig(), 'user-1')
        .catch((e) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error.code).toBe('AUDIO_TOO_LONG')
      expect(error.statusCode).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
      expect(error.message).toContain('15 min 00 s')
      expect(repo.releaseJobSlot).toHaveBeenCalledWith('slot-1')
    })

    it('maps a backend AUDIO_UNREADABLE refusal to a 422 user error', async () => {
      repo.uploadAudio.mockRejectedValue(
        new BackendApiError(422, 'bad', 'AUDIO_UNREADABLE'),
      )

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'AUDIO_UNREADABLE',
        statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      })
    })

    it('does not map a generic 422 validation error', async () => {
      const validationError = new BackendApiError(422, 'invalid form')
      repo.uploadAudio.mockRejectedValue(validationError)

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toBe(validationError)
    })

    it('proceeds when backend config validation fails (non-blocking)', async () => {
      repo.validateConfig.mockRejectedValue(new Error('down'))
      repo.uploadAudio.mockResolvedValue(makeTranscribeResponse())
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).resolves.toMatchObject({ job_id: 'job-abc-123' })
    })

    it('rejects files above the max size before touching the database', async () => {
      const big = makeFile('big.mp3', 'audio/mpeg', 101 * 1024 * 1024)

      await expect(
        service.transcribe(big, makeConfig(), 'user-1'),
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE })

      expect(repo.acquireJobSlot).not.toHaveBeenCalled()
    })

    it('rejects unsupported MIME types', async () => {
      await expect(
        service.transcribe(
          makeFile('a.txt', 'text/plain'),
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.BAD_REQUEST })
    })

    it('rejects a faked MIME type with an unsupported extension', async () => {
      await expect(
        service.transcribe(
          makeFile('evil.exe', 'audio/mpeg'),
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.BAD_REQUEST })
    })

    it('blocks polyphony for plans without access', async () => {
      vi.mocked(permissionService.checkFeatureAccessForUser).mockResolvedValue({
        hasAccess: false,
        upgradeRequired: 'pro',
      })

      await expect(
        service.transcribe(
          makeFile(),
          makeConfig({ polyphonic: true }),
          'user-1',
        ),
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.FORBIDDEN })

      expect(repo.acquireJobSlot).not.toHaveBeenCalled()
    })
  })

  describe('launch guards', () => {
    it('blocks a free account whose email is not verified', async () => {
      repo.findUserAccess.mockResolvedValue({
        isAdmin: false,
        emailVerified: null,
      })

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'EMAIL_NOT_VERIFIED',
        statusCode: HTTP_STATUS.FORBIDDEN,
      })

      expect(repo.acquireJobSlot).not.toHaveBeenCalled()
      expect(repo.uploadAudio).not.toHaveBeenCalled()
    })

    it('lets a paid account through even if its email is not verified', async () => {
      repo.findUserAccess.mockResolvedValue({
        isAdmin: false,
        emailVerified: null,
      })
      vi.mocked(permissionService.getUserPermissionContext).mockResolvedValue({
        userId: 'user-1',
        planTier: 'basic',
        subscriptionStatus: 'active',
        isTrialing: false,
        isCanceled: false,
      })
      repo.uploadAudio.mockResolvedValue(makeTranscribeResponse())

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).resolves.toBeDefined()
    })

    it('blocks accounts with a past due subscription', async () => {
      repo.hasPastDueSubscription.mockResolvedValue(true)

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'SUBSCRIPTION_PAST_DUE',
        statusCode: HTTP_STATUS.PAYMENT_REQUIRED,
      })
    })

    it('blocks when no credits remain', async () => {
      creditService.getUserCreditsBalance.mockResolvedValue({
        remainingCredits: 0,
      })

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'INSUFFICIENT_CREDITS',
        statusCode: HTTP_STATUS.PAYMENT_REQUIRED,
      })

      expect(repo.acquireJobSlot).not.toHaveBeenCalled()
    })

    it('allows 1 active job for a free account and 2 for a paid one', async () => {
      repo.uploadAudio.mockResolvedValue(makeTranscribeResponse())

      await service.transcribe(makeFile(), makeConfig(), 'user-1')
      expect(repo.acquireJobSlot).toHaveBeenLastCalledWith(
        'user-1',
        1,
        undefined,
      )

      vi.mocked(permissionService.getUserPermissionContext).mockResolvedValue({
        userId: 'user-1',
        planTier: 'pro',
        subscriptionStatus: 'active',
        isTrialing: false,
        isCanceled: false,
      })
      await service.transcribe(makeFile(), makeConfig(), 'user-1')
      expect(repo.acquireJobSlot).toHaveBeenLastCalledWith(
        'user-1',
        2,
        undefined,
      )
    })

    it('refuses with ACTIVE_JOBS_LIMIT_REACHED (429) when no slot is free', async () => {
      repo.acquireJobSlot.mockResolvedValue(null)

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toMatchObject({
        code: 'ACTIVE_JOBS_LIMIT_REACHED',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      })

      expect(repo.uploadAudio).not.toHaveBeenCalled()
    })

    it('reconciles the open jobs of the user and retries when the limit is hit', async () => {
      repo.acquireJobSlot
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('slot-2')
      repo.findOpenJobsForUser.mockResolvedValue([makeLocalJob()])
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'completed', duration_seconds: 60 }),
      )
      repo.uploadAudio.mockResolvedValue(makeTranscribeResponse())

      await service.transcribe(makeFile(), makeConfig(), 'user-1')

      expect(repo.settleCompletedJob).toHaveBeenCalledWith('job-1')
      expect(repo.attachBackendJob).toHaveBeenCalledWith(
        'slot-2',
        'job-abc-123',
        0,
      )
    })

    it('ignores backend errors while reconciling before refusing', async () => {
      repo.acquireJobSlot.mockResolvedValue(null)
      repo.findOpenJobsForUser.mockResolvedValue([makeLocalJob()])
      repo.getJobStatus.mockRejectedValue(new Error('backend down'))

      await expect(
        service.transcribe(makeFile(), makeConfig(), 'user-1'),
      ).rejects.toMatchObject({ code: 'ACTIVE_JOBS_LIMIT_REACHED' })
    })

    it('skips every guard and billing for admins', async () => {
      repo.findUserAccess.mockResolvedValue({
        isAdmin: true,
        emailVerified: null,
      })
      repo.uploadAudio.mockResolvedValue(makeTranscribeResponse())

      await service.transcribe(makeFile(), makeConfig(), 'admin-1')

      expect(repo.acquireJobSlot).not.toHaveBeenCalled()
      expect(repo.uploadAudio).toHaveBeenCalledWith(
        expect.any(File),
        makeConfig(),
        undefined,
      )
      expect(repo.recordExemptJob).toHaveBeenCalledWith(
        'job-abc-123',
        'admin-1',
      )
      expect(repo.reserveCredits).not.toHaveBeenCalled()
    })

    it('skips guards and billing in dev mode', async () => {
      repo.uploadAudio.mockResolvedValue(makeTranscribeResponse())

      await service.transcribe(makeFile(), makeConfig(), 'admin-1', true)

      expect(permissionService.checkFeatureAccessForUser).not.toHaveBeenCalled()
      expect(repo.acquireJobSlot).not.toHaveBeenCalled()
      expect(repo.recordExemptJob).toHaveBeenCalled()
    })
  })

  describe('transcribeFromYoutube', () => {
    it.each([
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    ])('launches for %s', async (url) => {
      repo.getYoutubeInfo.mockResolvedValue({ duration_seconds: 100 })
      repo.uploadFromYoutubeUrl.mockResolvedValue(makeTranscribeResponse())

      await expect(
        service.transcribeFromYoutube(url, makeConfig(), 'user-1'),
      ).resolves.toMatchObject({ job_id: 'job-abc-123' })
    })

    it.each([
      'https://vimeo.com/123456789',
      '',
      'https://www.youtube.com/watch?x=abc',
      'https://youtube.com/watch?v=<script>alert(1)</script>',
    ])('rejects the invalid URL %j', async (url) => {
      await expect(
        service.transcribeFromYoutube(url, makeConfig(), 'user-1'),
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.BAD_REQUEST })
    })

    it('uses the YouTube info duration as estimate and sends the balance as max duration', async () => {
      repo.getYoutubeInfo.mockResolvedValue({ duration_seconds: 300 })
      repo.uploadFromYoutubeUrl.mockResolvedValue(makeTranscribeResponse())

      await service.transcribeFromYoutube(
        'https://youtu.be/dQw4w9WgXcQ',
        makeConfig(),
        'user-1',
      )

      expect(repo.acquireJobSlot).toHaveBeenCalledWith('user-1', 1, 300)
      expect(repo.uploadFromYoutubeUrl).toHaveBeenCalledWith(
        'https://youtu.be/dQw4w9WgXcQ',
        makeConfig(),
        600,
      )
      expect(repo.reserveCredits).not.toHaveBeenCalled()
    })

    it('refuses when the estimated duration exceeds the balance', async () => {
      repo.getYoutubeInfo.mockResolvedValue({ duration_seconds: 700 })

      await expect(
        service.transcribeFromYoutube(
          'https://youtu.be/dQw4w9WgXcQ',
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' })

      expect(repo.acquireJobSlot).not.toHaveBeenCalled()
    })

    it('does not call the info endpoint when no credits remain', async () => {
      creditService.getUserCreditsBalance.mockResolvedValue({
        remainingCredits: 0,
      })

      await expect(
        service.transcribeFromYoutube(
          'https://youtu.be/dQw4w9WgXcQ',
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' })

      expect(repo.getYoutubeInfo).not.toHaveBeenCalled()
    })
  })

  describe('transcribeFromSpotify', () => {
    it('launches with the balance as max duration', async () => {
      repo.uploadFromSpotifyUrl.mockResolvedValue(makeTranscribeResponse())

      await service.transcribeFromSpotify(
        'https://open.spotify.com/track/abc123',
        makeConfig(),
        'user-1',
      )

      expect(repo.uploadFromSpotifyUrl).toHaveBeenCalledWith(
        'https://open.spotify.com/track/abc123',
        makeConfig(),
        600,
      )
    })

    it('rejects a non-Spotify URL', async () => {
      await expect(
        service.transcribeFromSpotify(
          'https://example.com/track/1',
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.BAD_REQUEST })
    })

    it('blocks when no credits remain', async () => {
      creditService.getUserCreditsBalance.mockResolvedValue({
        remainingCredits: 0,
      })

      await expect(
        service.transcribeFromSpotify(
          'https://open.spotify.com/track/abc123',
          makeConfig(),
          'user-1',
        ),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' })
    })
  })

  describe('getJob', () => {
    beforeEach(() => {
      repo.findJobForUser.mockResolvedValue(makeLocalJob())
    })

    it('throws FORBIDDEN when the user does not own the job', async () => {
      repo.findJobForUser.mockResolvedValue(null)

      await expect(service.getJob('job-1', 'other')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.FORBIDDEN,
      })
      expect(repo.getJobStatus).not.toHaveBeenCalled()
    })

    it('returns a running job without billing when no duration is known', async () => {
      repo.getJobStatus.mockResolvedValue(makeJob())

      const job = await service.getJob('job-1', 'user-1')

      expect(job.status).toBe('processing')
      expect(repo.reserveCredits).not.toHaveBeenCalled()
      expect(repo.settleCompletedJob).not.toHaveBeenCalled()
    })

    it('reserves as soon as the backend exposes the measured duration', async () => {
      repo.getJobStatus.mockResolvedValue(makeJob({ duration_seconds: 187.4 }))

      await service.getJob('job-1', 'user-1')

      expect(repo.reserveCredits).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        187.4,
        'Transcription (188s)',
      )
      expect(repo.settleCompletedJob).not.toHaveBeenCalled()
    })

    it('does not reserve again when the job is already charged', async () => {
      repo.findJobForUser.mockResolvedValue(
        makeLocalJob({ creditsDeducted: true }),
      )
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'completed', duration_seconds: 187.4 }),
      )

      await service.getJob('job-1', 'user-1')

      expect(repo.reserveCredits).not.toHaveBeenCalled()
      expect(repo.settleCompletedJob).toHaveBeenCalledWith('job-1')
    })

    it('falls back to results.duration_seconds at completion (legacy backend)', async () => {
      repo.getJobStatus.mockResolvedValue(
        makeJob({
          status: 'completed',
          results: { partition_svg_url: '/x', duration_seconds: 90 },
        }),
      )

      await service.getJob('job-1', 'user-1')

      expect(repo.reserveCredits).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        90,
        'Transcription (90s)',
      )
      expect(repo.settleCompletedJob).toHaveBeenCalledWith('job-1')
    })

    it('does not deliver the result and refuses the job when the reservation is insufficient', async () => {
      repo.reserveCredits.mockResolvedValue('insufficient')
      repo.getJobStatus.mockResolvedValue(
        makeJob({
          status: 'completed',
          results: { partition_svg_url: '/x', duration_seconds: 90 },
        }),
      )

      await expect(service.getJob('job-1', 'user-1')).rejects.toMatchObject({
        code: 'INSUFFICIENT_CREDITS',
        statusCode: HTTP_STATUS.PAYMENT_REQUIRED,
      })

      expect(repo.cancelJob).toHaveBeenCalledWith('job-1')
      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        { status: 'refused', progress: 0 },
      )
      expect(repo.settleCompletedJob).not.toHaveBeenCalled()
    })

    it('never delivers the result of a refused job on later polls', async () => {
      repo.findJobForUser.mockResolvedValue(
        makeLocalJob({ status: LOCAL_JOB_STATUS.REFUSED }),
      )
      repo.getJobStatus.mockResolvedValue(
        makeJob({
          status: 'completed',
          results: { partition_svg_url: '/x', duration_seconds: 90 },
        }),
      )

      await expect(service.getJob('job-1', 'user-1')).rejects.toMatchObject({
        code: 'INSUFFICIENT_CREDITS',
      })
      expect(repo.reserveCredits).not.toHaveBeenCalled()
    })

    it('never delivers a completed backend result for a job settled as failed', async () => {
      repo.findJobForUser.mockResolvedValue(
        makeLocalJob({ status: LOCAL_JOB_STATUS.FAILED }),
      )
      repo.getJobStatus.mockResolvedValue(makeJob({ status: 'completed' }))

      await expect(service.getJob('job-1', 'user-1')).rejects.toMatchObject({
        code: 'INSUFFICIENT_CREDITS',
      })
    })

    it('skips reconciliation for settled jobs', async () => {
      repo.findJobForUser.mockResolvedValue(
        makeLocalJob({ status: LOCAL_JOB_STATUS.COMPLETED }),
      )
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'completed', duration_seconds: 60 }),
      )

      const job = await service.getJob('job-1', 'user-1')

      expect(job.status).toBe('completed')
      expect(repo.reserveCredits).not.toHaveBeenCalled()
      expect(repo.settleCompletedJob).not.toHaveBeenCalled()
    })

    it('does not bill exempt jobs', async () => {
      repo.findJobForUser.mockResolvedValue(
        makeLocalJob({ status: LOCAL_JOB_STATUS.EXEMPT }),
      )
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'completed', duration_seconds: 60 }),
      )

      await service.getJob('job-1', 'admin-1')

      expect(repo.reserveCredits).not.toHaveBeenCalled()
    })

    it('settles a failed job with its progress (partial billing policy)', async () => {
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'failed', progress: 40, duration_seconds: 100 }),
      )

      await service.getJob('job-1', 'user-1')

      expect(repo.reserveCredits).not.toHaveBeenCalled()
      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        { status: 'failed', progress: 40, measuredDurationSeconds: 100 },
      )
    })

    it('settles a failed job that never progressed with progress 0', async () => {
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'failed', progress: 0 }),
      )

      await service.getJob('job-1', 'user-1')

      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        { status: 'failed', progress: 0, measuredDurationSeconds: undefined },
      )
    })

    it('never charges for an audio rejected by the backend and explains why', async () => {
      repo.getJobStatus.mockResolvedValue(
        makeJob({
          status: 'failed',
          progress: 30,
          error: 'Audio too long',
          error_code: 'AUDIO_TOO_LONG',
          duration_seconds: 900,
        }),
      )

      const job = await service.getJob('job-1', 'user-1')

      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        { status: 'failed', progress: 0, measuredDurationSeconds: 900 },
      )
      expect(job.error).toContain('15 min 00 s')
    })

    it('detects a rejection carried only by the error string', async () => {
      repo.getJobStatus.mockResolvedValue(
        makeJob({
          status: 'failed',
          progress: 30,
          error: 'AUDIO_UNREADABLE: cannot read',
        }),
      )

      const job = await service.getJob('job-1', 'user-1')

      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        expect.objectContaining({ progress: 0 }),
      )
      expect(job.error).toContain('illisible')
    })

    it('settles the job as lost and throws NOT_FOUND when the backend forgot it', async () => {
      repo.getJobStatus.mockRejectedValue(new BackendApiError(404, 'gone'))

      await expect(service.getJob('job-1', 'user-1')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.NOT_FOUND,
      })

      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        { status: 'failed', progress: 0 },
      )
    })

    it('throws SERVICE_UNAVAILABLE when the backend is unreachable', async () => {
      repo.getJobStatus.mockRejectedValue(new Error('network'))

      await expect(service.getJob('job-1', 'user-1')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      })
      expect(repo.settleUnsuccessfulJob).not.toHaveBeenCalled()
    })

    it('concurrent polls all go through the idempotent repository operations', async () => {
      repo.reserveCredits
        .mockResolvedValueOnce('reserved')
        .mockResolvedValue('already_reserved')
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'completed', duration_seconds: 60 }),
      )

      const results = await Promise.all([
        service.getJob('job-1', 'user-1'),
        service.getJob('job-1', 'user-1'),
        service.getJob('job-1', 'user-1'),
      ])

      expect(results.every((job) => job.status === 'completed')).toBe(true)
      expect(repo.reserveCredits).toHaveBeenCalledTimes(3)
    })
  })

  describe('cancelJob', () => {
    it('cancels the backend job then reconciles it', async () => {
      repo.findJobForUser.mockResolvedValue(makeLocalJob())
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'failed', progress: 0, duration_seconds: 120 }),
      )

      await service.cancelJob('job-1', 'user-1')

      expect(repo.cancelJob).toHaveBeenCalledWith('job-1')
      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        { status: 'failed', progress: 0, measuredDurationSeconds: 120 },
      )
    })

    it('throws FORBIDDEN when the user does not own the job', async () => {
      repo.findJobForUser.mockResolvedValue(null)

      await expect(service.cancelJob('job-1', 'other')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.FORBIDDEN,
      })
      expect(repo.cancelJob).not.toHaveBeenCalled()
    })

    it('throws NOT_FOUND when the backend cancel fails', async () => {
      repo.findJobForUser.mockResolvedValue(makeLocalJob())
      repo.cancelJob.mockRejectedValue(new Error('nope'))

      await expect(service.cancelJob('job-1', 'user-1')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.NOT_FOUND,
      })
    })

    it('still succeeds when the reconciliation after cancel fails', async () => {
      repo.findJobForUser.mockResolvedValue(makeLocalJob())
      repo.getJobStatus.mockRejectedValue(new Error('backend down'))

      await expect(
        service.cancelJob('job-1', 'user-1'),
      ).resolves.toBeUndefined()
    })
  })

  describe('downloadPartition', () => {
    beforeEach(() => {
      repo.findJobForUser.mockResolvedValue(
        makeLocalJob({ status: LOCAL_JOB_STATUS.COMPLETED }),
      )
    })

    it('returns the blob when the job is completed and billed', async () => {
      const blob = new Blob(['<svg/>'])
      repo.getJobStatus.mockResolvedValue(
        makeJob({
          status: 'completed',
          results: { partition_svg_url: '/x', duration_seconds: 60 },
        }),
      )
      repo.downloadPartition.mockResolvedValue(blob)

      await expect(service.downloadPartition('job-1', 'user-1')).resolves.toBe(
        blob,
      )
    })

    it('refuses to deliver when the credit reservation is insufficient', async () => {
      repo.findJobForUser.mockResolvedValue(makeLocalJob())
      repo.reserveCredits.mockResolvedValue('insufficient')
      repo.getJobStatus.mockResolvedValue(
        makeJob({
          status: 'completed',
          results: { partition_svg_url: '/x', duration_seconds: 60 },
        }),
      )

      await expect(
        service.downloadPartition('job-1', 'user-1'),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' })
      expect(repo.downloadPartition).not.toHaveBeenCalled()
    })

    it('throws VALIDATION_ERROR when the job is not completed yet', async () => {
      repo.getJobStatus.mockResolvedValue(makeJob())

      await expect(
        service.downloadPartition('job-1', 'user-1'),
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.BAD_REQUEST })
    })

    it('throws NOT_FOUND when the completed job has no SVG url', async () => {
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'completed', results: undefined }),
      )

      await expect(
        service.downloadPartition('job-1', 'user-1'),
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.NOT_FOUND })
    })
  })

  describe('reconcileOpenJobs', () => {
    it('removes stale pending jobs and scans the open ones', async () => {
      repo.findOpenJobs.mockResolvedValue([])

      const result = await service.reconcileOpenJobs()

      expect(repo.deleteStalePendingJobs).toHaveBeenCalledWith(expect.any(Date))
      expect(result).toEqual({ scanned: 0, failed: 0 })
    })

    it('reserves and settles a completed job nobody polled', async () => {
      repo.findOpenJobs.mockResolvedValue([makeLocalJob()])
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'completed', duration_seconds: 60 }),
      )

      const result = await service.reconcileOpenJobs()

      expect(repo.reserveCredits).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        60,
        'Transcription (60s)',
      )
      expect(repo.settleCompletedJob).toHaveBeenCalledWith('job-1')
      expect(result).toEqual({ scanned: 1, failed: 0 })
    })

    it('settles a failed job according to its progress', async () => {
      repo.findOpenJobs.mockResolvedValue([makeLocalJob()])
      repo.getJobStatus.mockResolvedValue(
        makeJob({ status: 'failed', progress: 0 }),
      )

      await service.reconcileOpenJobs()

      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        expect.objectContaining({ status: 'failed', progress: 0 }),
      )
    })

    it('fully refunds a job the backend lost', async () => {
      repo.findOpenJobs.mockResolvedValue([makeLocalJob()])
      repo.getJobStatus.mockRejectedValue(new BackendApiError(404, 'gone'))

      await service.reconcileOpenJobs()

      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        { status: 'failed', progress: 0 },
      )
    })

    it('cancels and fully refunds a job stuck for too long', async () => {
      repo.findOpenJobs.mockResolvedValue([
        makeLocalJob({ createdAt: new Date(Date.now() - 3 * 3600 * 1000) }),
      ])
      repo.getJobStatus.mockResolvedValue(makeJob({ status: 'processing' }))

      await service.reconcileOpenJobs()

      expect(repo.cancelJob).toHaveBeenCalledWith('job-1')
      expect(repo.settleUnsuccessfulJob).toHaveBeenCalledWith(
        'job-1',
        'user-1',
        { status: 'failed', progress: 0 },
      )
    })

    it('leaves a recent running job alone', async () => {
      repo.findOpenJobs.mockResolvedValue([makeLocalJob()])
      repo.getJobStatus.mockResolvedValue(makeJob({ status: 'processing' }))

      await service.reconcileOpenJobs()

      expect(repo.cancelJob).not.toHaveBeenCalled()
      expect(repo.settleUnsuccessfulJob).not.toHaveBeenCalled()
    })

    it('skips jobs that never reached the backend', async () => {
      repo.findOpenJobs.mockResolvedValue([
        makeLocalJob({ backendJobId: null }),
      ])

      const result = await service.reconcileOpenJobs()

      expect(repo.getJobStatus).not.toHaveBeenCalled()
      expect(result).toEqual({ scanned: 1, failed: 0 })
    })

    it('keeps going when one job fails and reports it', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      repo.findOpenJobs.mockResolvedValue([
        makeLocalJob({ backendJobId: 'job-a' }),
        makeLocalJob({ backendJobId: 'job-b' }),
      ])
      repo.getJobStatus
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(makeJob({ status: 'completed' }))

      const result = await service.reconcileOpenJobs()

      expect(result).toEqual({ scanned: 2, failed: 1 })
      expect(repo.settleCompletedJob).toHaveBeenCalledWith('job-b')
    })
  })

  describe('validateConfiguration', () => {
    it('returns the backend validation', async () => {
      repo.validateConfig.mockResolvedValue({ valid: true })

      await expect(
        service.validateConfiguration(makeConfig()),
      ).resolves.toEqual({ valid: true })
    })

    it('returns an invalid result when the backend is unreachable', async () => {
      repo.validateConfig.mockRejectedValue(new Error('down'))

      const result = await service.validateConfiguration(makeConfig())

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('validateAudioFile', () => {
    it.each([
      ['a.mp3', 'audio/mpeg'],
      ['a.wav', 'audio/wav'],
      ['a.flac', 'audio/flac'],
      ['a.m4a', 'audio/mp4'],
      ['a.ogg', 'audio/ogg'],
    ])('accepts %s', (name, type) => {
      expect(() =>
        service.validateAudioFile(makeFile(name, type)),
      ).not.toThrow()
    })

    it('rejects a file with no extension', () => {
      expect(() => service.validateAudioFile(makeFile('noext'))).toThrow()
    })

    it('rejects a file exactly above the size boundary', () => {
      const file = makeFile('a.mp3', 'audio/mpeg', 100 * 1024 * 1024 + 1)
      expect(() => service.validateAudioFile(file)).toThrow()
    })
  })

  describe('checkHealth', () => {
    it('returns the backend health', async () => {
      repo.healthCheck.mockResolvedValue({ status: 'healthy' })

      await expect(service.checkHealth()).resolves.toEqual({
        status: 'healthy',
      })
    })

    it('propagates backend failures', async () => {
      repo.healthCheck.mockRejectedValue(new Error('down'))

      await expect(service.checkHealth()).rejects.toThrow('down')
    })
  })
})
