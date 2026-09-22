import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const job = {
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  }
  const tx = {
    user: { update: vi.fn() },
    transcriptionJob: job,
    userCredits: { findUnique: vi.fn() },
  }
  return {
    job,
    tx,
    db: {
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      transcriptionJob: job,
      user: { findUnique: vi.fn() },
      subscription: { findFirst: vi.fn() },
    },
  }
})

vi.mock('@/server/lib/database', () => ({ db: mocks.db }))

import { InsufficientCreditsError } from '@/server/domains/credit/credit.repository'

import { LOCAL_JOB_STATUS } from '../transcription.constants'
import {
  BackendApiError,
  TranscriptionRepository,
} from '../transcription.repository'
import type { TranscribeConfig } from '../transcription.types'

const OPEN = [LOCAL_JOB_STATUS.PENDING, LOCAL_JOB_STATUS.ACTIVE]

const config: TranscribeConfig = {
  instrument_mode: 'single',
  instrument_type: 'guitar',
  polyphonic: false,
  partition_type: 'tab_guitare',
}

const makeStoredJob = (overrides = {}) => ({
  id: 'local-1',
  backendJobId: 'job-1',
  userId: 'user-1',
  status: LOCAL_JOB_STATUS.FAILED,
  creditsDeducted: true,
  chargedMonthlySeconds: 0,
  chargedBonusSeconds: 0,
  durationSeconds: null,
  estimatedDurationSeconds: null,
  createdAt: new Date(),
  ...overrides,
})

describe('TranscriptionRepository', () => {
  let credits: {
    debitCredits: ReturnType<typeof vi.fn>
    restoreCredits: ReturnType<typeof vi.fn>
    createTransaction: ReturnType<typeof vi.fn>
  }
  let repository: TranscriptionRepository

  beforeEach(() => {
    vi.clearAllMocks()
    credits = {
      debitCredits: vi.fn(),
      restoreCredits: vi.fn(),
      createTransaction: vi.fn().mockResolvedValue({}),
    }
    repository = new TranscriptionRepository(credits as any)
  })

  describe('acquireJobSlot', () => {
    it('locks the user row, counts open jobs and creates a pending job', async () => {
      mocks.job.count.mockResolvedValue(0)
      mocks.job.create.mockResolvedValue({ id: 'slot-1' })

      const slotId = await repository.acquireJobSlot('user-1', 1, 120)

      expect(slotId).toBe('slot-1')
      expect(mocks.tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      )
      expect(mocks.job.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: { in: OPEN } },
      })
      expect(mocks.job.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          status: LOCAL_JOB_STATUS.PENDING,
          estimatedDurationSeconds: 120,
        },
        select: { id: true },
      })
    })

    it('returns null without creating anything when the limit is reached', async () => {
      mocks.job.count.mockResolvedValue(1)

      await expect(repository.acquireJobSlot('user-1', 1)).resolves.toBeNull()
      expect(mocks.job.create).not.toHaveBeenCalled()
    })

    it('allows a second job when the limit is 2', async () => {
      mocks.job.count.mockResolvedValue(1)
      mocks.job.create.mockResolvedValue({ id: 'slot-2' })

      await expect(repository.acquireJobSlot('user-1', 2)).resolves.toBe(
        'slot-2',
      )
    })

    it('refuses the third job when the limit is 2', async () => {
      mocks.job.count.mockResolvedValue(2)

      await expect(repository.acquireJobSlot('user-1', 2)).resolves.toBeNull()
    })
  })

  describe('job lifecycle helpers', () => {
    it('attaches the backend id, activates the job and stores the measured duration', async () => {
      await repository.attachBackendJob('slot-1', 'job-1', 187.4)

      expect(mocks.job.update).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
        data: {
          backendJobId: 'job-1',
          status: LOCAL_JOB_STATUS.ACTIVE,
          durationSeconds: 187.4,
        },
      })
    })

    it('does not store an unknown duration', async () => {
      await repository.attachBackendJob('slot-1', 'job-1', null)

      expect(mocks.job.update).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
        data: { backendJobId: 'job-1', status: LOCAL_JOB_STATUS.ACTIVE },
      })
    })

    it('releases a slot by deleting the placeholder', async () => {
      await repository.releaseJobSlot('slot-1')

      expect(mocks.job.deleteMany).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
      })
    })

    it('deletes only stale pending jobs, optionally for one user', async () => {
      mocks.job.deleteMany.mockResolvedValue({ count: 2 })
      const limit = new Date()

      await expect(
        repository.deleteStalePendingJobs(limit, 'user-1'),
      ).resolves.toBe(2)

      expect(mocks.job.deleteMany).toHaveBeenCalledWith({
        where: {
          status: LOCAL_JOB_STATUS.PENDING,
          createdAt: { lt: limit },
          userId: 'user-1',
        },
      })
    })

    it('records exempt jobs as already billed', async () => {
      await repository.recordExemptJob('job-1', 'admin-1', 60)

      expect(mocks.job.upsert).toHaveBeenCalledWith({
        where: { backendJobId: 'job-1' },
        create: {
          backendJobId: 'job-1',
          userId: 'admin-1',
          estimatedDurationSeconds: 60,
          creditsDeducted: true,
          status: LOCAL_JOB_STATUS.EXEMPT,
        },
        update: {},
      })
    })

    it('finds a job only for its owner', async () => {
      mocks.job.findUnique.mockResolvedValue(makeStoredJob())

      await expect(
        repository.findJobForUser('job-1', 'user-1'),
      ).resolves.toMatchObject({ backendJobId: 'job-1' })
      await expect(
        repository.findJobForUser('job-1', 'intruder'),
      ).resolves.toBeNull()
    })

    it('returns null for an unknown job', async () => {
      mocks.job.findUnique.mockResolvedValue(null)

      await expect(
        repository.findJobForUser('nope', 'user-1'),
      ).resolves.toBeNull()
    })

    it('lists open jobs, oldest first', async () => {
      mocks.job.findMany.mockResolvedValue([])

      await repository.findOpenJobs(50)
      await repository.findOpenJobsForUser('user-1')

      expect(mocks.job.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { status: { in: OPEN } },
          orderBy: { createdAt: 'asc' },
          take: 50,
        }),
      )
      expect(mocks.job.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { userId: 'user-1', status: { in: OPEN } },
        }),
      )
    })

    it('closes an open job as completed', async () => {
      await repository.settleCompletedJob('job-1')

      expect(mocks.job.updateMany).toHaveBeenCalledWith({
        where: { backendJobId: 'job-1', status: { in: OPEN } },
        data: { status: LOCAL_JOB_STATUS.COMPLETED },
      })
    })

    it('verifies the owner of a job', async () => {
      mocks.job.findUnique.mockResolvedValue({ userId: 'user-1' })

      await expect(repository.verifyJobOwner('job-1', 'user-1')).resolves.toBe(
        true,
      )
      await expect(repository.verifyJobOwner('job-1', 'other')).resolves.toBe(
        false,
      )
    })

    it('flags admins and root admins in the user access profile', async () => {
      mocks.db.user.findUnique.mockResolvedValueOnce({
        role: 'user',
        isRootAdmin: true,
        emailVerified: null,
      })
      mocks.db.user.findUnique.mockResolvedValueOnce({
        role: 'user',
        isRootAdmin: false,
        emailVerified: new Date(),
      })
      mocks.db.user.findUnique.mockResolvedValueOnce(null)

      await expect(repository.findUserAccess('a')).resolves.toEqual({
        isAdmin: true,
        emailVerified: null,
      })
      await expect(repository.findUserAccess('b')).resolves.toMatchObject({
        isAdmin: false,
      })
      await expect(repository.findUserAccess('c')).resolves.toBeNull()
    })

    it('detects past due subscriptions', async () => {
      mocks.db.subscription.findFirst.mockResolvedValueOnce({ id: 'sub' })
      mocks.db.subscription.findFirst.mockResolvedValueOnce(null)

      await expect(repository.hasPastDueSubscription('u')).resolves.toBe(true)
      await expect(repository.hasPastDueSubscription('u')).resolves.toBe(false)
    })
  })

  describe('reserveCredits', () => {
    beforeEach(() => {
      mocks.job.updateMany.mockResolvedValue({ count: 1 })
      credits.debitCredits.mockResolvedValue({
        fromMonthly: 100,
        fromBonus: 21,
        monthlyCredits: 0,
        bonusCredits: 180,
      })
    })

    it('flags the job, debits atomically, records the split and the transaction', async () => {
      const result = await repository.reserveCredits(
        'job-1',
        'user-1',
        120.4,
        'Transcription (121s)',
      )

      expect(result).toBe('reserved')
      expect(mocks.job.updateMany).toHaveBeenNthCalledWith(1, {
        where: {
          backendJobId: 'job-1',
          creditsDeducted: false,
          status: { in: OPEN },
        },
        data: { creditsDeducted: true, durationSeconds: 120.4 },
      })
      expect(credits.debitCredits).toHaveBeenCalledWith('user-1', 121, mocks.tx)
      expect(mocks.job.updateMany).toHaveBeenNthCalledWith(2, {
        where: { backendJobId: 'job-1' },
        data: { chargedMonthlySeconds: 100, chargedBonusSeconds: 21 },
      })
      expect(credits.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'usage',
          amount: -3,
          balanceAfter: 3,
          description: 'Transcription (121s)',
        }),
        mocks.tx,
      )
    })

    it('does not debit twice when the job is already billed', async () => {
      mocks.job.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        repository.reserveCredits('job-1', 'user-1', 60, 'x'),
      ).resolves.toBe('already_reserved')

      expect(credits.debitCredits).not.toHaveBeenCalled()
      expect(credits.createTransaction).not.toHaveBeenCalled()
    })

    it('reports insufficient credits and records nothing', async () => {
      credits.debitCredits.mockRejectedValue(new InsufficientCreditsError())

      await expect(
        repository.reserveCredits('job-1', 'user-1', 600, 'x'),
      ).resolves.toBe('insufficient')

      expect(credits.createTransaction).not.toHaveBeenCalled()
    })

    it('propagates unexpected errors', async () => {
      credits.debitCredits.mockRejectedValue(new Error('db down'))

      await expect(
        repository.reserveCredits('job-1', 'user-1', 60, 'x'),
      ).rejects.toThrow('db down')
    })

    it('runs the whole reservation in one transaction', async () => {
      await repository.reserveCredits('job-1', 'user-1', 60, 'x')

      expect(mocks.db.$transaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('settleUnsuccessfulJob', () => {
    beforeEach(() => {
      mocks.job.updateMany.mockResolvedValue({ count: 1 })
      credits.restoreCredits.mockResolvedValue({
        monthlyCredits: 100,
        bonusCredits: 20,
      })
    })

    it('does nothing when the job is already settled (idempotence)', async () => {
      mocks.job.updateMany.mockResolvedValue({ count: 0 })

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 0,
      })

      expect(mocks.job.findUnique).not.toHaveBeenCalled()
      expect(credits.restoreCredits).not.toHaveBeenCalled()
    })

    it('closes only open jobs', async () => {
      mocks.job.findUnique.mockResolvedValue(makeStoredJob())

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 0,
      })

      expect(mocks.job.updateMany).toHaveBeenCalledWith({
        where: { backendJobId: 'job-1', status: { in: OPEN } },
        data: { status: LOCAL_JOB_STATUS.FAILED },
      })
    })

    it('fully refunds a job that never progressed, monthly and bonus separately', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({ chargedMonthlySeconds: 100, chargedBonusSeconds: 20 }),
      )

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 0,
      })

      expect(credits.restoreCredits).toHaveBeenCalledWith(
        'user-1',
        { monthly: 100, bonus: 20 },
        mocks.tx,
      )
      expect(mocks.job.update).toHaveBeenCalledWith({
        where: { backendJobId: 'job-1' },
        data: { chargedMonthlySeconds: 0, chargedBonusSeconds: 0 },
      })
      expect(credits.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refund',
          amount: 2,
          balanceAfter: 2,
        }),
        mocks.tx,
      )
    })

    it('keeps the progress share of a failed job and refunds the rest, bonus first', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({ chargedMonthlySeconds: 150, chargedBonusSeconds: 50 }),
      )

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 50,
      })

      expect(credits.restoreCredits).toHaveBeenCalledWith(
        'user-1',
        { monthly: 50, bonus: 50 },
        mocks.tx,
      )
      expect(mocks.job.update).toHaveBeenCalledWith({
        where: { backendJobId: 'job-1' },
        data: { chargedMonthlySeconds: 100, chargedBonusSeconds: 0 },
      })
    })

    it('keeps monthly credits first when the kept share exceeds them', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({ chargedMonthlySeconds: 30, chargedBonusSeconds: 170 }),
      )

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 50,
      })

      expect(credits.restoreCredits).toHaveBeenCalledWith(
        'user-1',
        { monthly: 0, bonus: 100 },
        mocks.tx,
      )
      expect(mocks.job.update).toHaveBeenCalledWith({
        where: { backendJobId: 'job-1' },
        data: { chargedMonthlySeconds: 30, chargedBonusSeconds: 70 },
      })
    })

    it('does not touch credits when the progress share equals the charge', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({ chargedMonthlySeconds: 100 }),
      )

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 100,
      })

      expect(credits.restoreCredits).not.toHaveBeenCalled()
      expect(credits.debitCredits).not.toHaveBeenCalled()
    })

    it('refunds everything for a refused job whatever its progress', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({ chargedMonthlySeconds: 100 }),
      )

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'refused',
        progress: 80,
      })

      expect(credits.restoreCredits).toHaveBeenCalledWith(
        'user-1',
        { monthly: 100, bonus: 0 },
        mocks.tx,
      )
    })

    it('clamps out-of-range progress', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({ chargedMonthlySeconds: 100 }),
      )

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 250,
      })

      expect(credits.restoreCredits).not.toHaveBeenCalled()
    })

    it('charges the progress share of an unbilled failed job, capped by the balance', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({
          creditsDeducted: false,
          estimatedDurationSeconds: 200,
        }),
      )
      mocks.tx.userCredits.findUnique.mockResolvedValue({
        monthlyCredits: 30,
        bonusCredits: 10,
      })
      credits.debitCredits.mockResolvedValue({
        fromMonthly: 30,
        fromBonus: 10,
        monthlyCredits: 0,
        bonusCredits: 0,
      })

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 50,
      })

      expect(credits.debitCredits).toHaveBeenCalledWith('user-1', 40, mocks.tx)
      expect(mocks.job.update).toHaveBeenCalledWith({
        where: { backendJobId: 'job-1' },
        data: {
          creditsDeducted: true,
          chargedMonthlySeconds: 30,
          chargedBonusSeconds: 10,
        },
      })
      expect(credits.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'usage',
          description: 'Transcription interrompue à 50% (40s)',
        }),
        mocks.tx,
      )
    })

    it('prefers the measured duration over the estimate for an unbilled failed job', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({
          creditsDeducted: false,
          estimatedDurationSeconds: 999,
        }),
      )
      mocks.tx.userCredits.findUnique.mockResolvedValue({
        monthlyCredits: 500,
        bonusCredits: 0,
      })
      credits.debitCredits.mockResolvedValue({
        fromMonthly: 50,
        fromBonus: 0,
        monthlyCredits: 450,
        bonusCredits: 0,
      })

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 50,
        measuredDurationSeconds: 100,
      })

      expect(credits.debitCredits).toHaveBeenCalledWith('user-1', 50, mocks.tx)
    })

    it('charges nothing when the balance is empty', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({
          creditsDeducted: false,
          estimatedDurationSeconds: 200,
        }),
      )
      mocks.tx.userCredits.findUnique.mockResolvedValue({
        monthlyCredits: 0,
        bonusCredits: 0,
      })

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 50,
      })

      expect(credits.debitCredits).not.toHaveBeenCalled()
    })

    it('ignores a concurrent debit that emptied the balance meanwhile', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({
          creditsDeducted: false,
          estimatedDurationSeconds: 200,
        }),
      )
      mocks.tx.userCredits.findUnique.mockResolvedValue({
        monthlyCredits: 100,
        bonusCredits: 0,
      })
      credits.debitCredits.mockRejectedValue(new InsufficientCreditsError())

      await expect(
        repository.settleUnsuccessfulJob('job-1', 'user-1', {
          status: 'failed',
          progress: 50,
        }),
      ).resolves.toBeUndefined()

      expect(credits.createTransaction).not.toHaveBeenCalled()
    })

    it('charges nothing when there is no duration to base the progress share on', async () => {
      mocks.job.findUnique.mockResolvedValue(
        makeStoredJob({ creditsDeducted: false }),
      )

      await repository.settleUnsuccessfulJob('job-1', 'user-1', {
        status: 'failed',
        progress: 80,
      })

      expect(credits.debitCredits).not.toHaveBeenCalled()
      expect(credits.restoreCredits).not.toHaveBeenCalled()
    })
  })

  describe('backend calls', () => {
    const fetchMock = vi.fn()

    beforeEach(() => {
      fetchMock.mockReset()
      vi.stubGlobal('fetch', fetchMock)
    })

    const file = new File([new Uint8Array(8)], 'a.mp3', { type: 'audio/mpeg' })

    it('sends max_duration_seconds with the upload', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ job_id: 'j', status: 'queued' }),
      })

      await repository.uploadAudio(file, config, 180)

      const body = fetchMock.mock.calls[0][1].body as FormData
      expect(body.get('max_duration_seconds')).toBe('180')
      expect(body.get('config')).toBe(JSON.stringify(config))
    })

    it('omits max_duration_seconds when not provided', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ job_id: 'j', status: 'queued' }),
      })

      await repository.uploadAudio(file, config)

      const body = fetchMock.mock.calls[0][1].body as FormData
      expect(body.has('max_duration_seconds')).toBe(false)
    })

    it.each([
      ['uploadFromYoutubeUrl', '/transcribe/youtube'],
      ['uploadFromSpotifyUrl', '/transcribe/spotify'],
    ] as const)(
      'sends max_duration_seconds next to url and config in %s',
      async (method, path) => {
        fetchMock.mockResolvedValue({
          ok: true,
          json: async () => ({ job_id: 'j', status: 'queued' }),
        })

        await repository[method]('https://x', config, 90)

        expect(fetchMock.mock.calls[0][0]).toContain(path)
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
          url: 'https://x',
          config,
          max_duration_seconds: 90,
        })
      },
    )

    it('leaves max_duration_seconds out of the JSON body when not provided', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ job_id: 'j', status: 'queued' }),
      })

      await repository.uploadFromYoutubeUrl('https://x', config)

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        url: 'https://x',
        config,
      })
    })

    it('exposes the AUDIO_TOO_LONG code and measured duration of a 422', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          detail: {
            code: 'AUDIO_TOO_LONG',
            message: 'too long',
            duration_seconds: 900,
          },
        }),
      })

      const error = await repository
        .uploadAudio(file, config, 180)
        .catch((e) => e)

      expect(error).toBeInstanceOf(BackendApiError)
      expect(error.status).toBe(422)
      expect(error.code).toBe('AUDIO_TOO_LONG')
      expect(error.durationSeconds).toBe(900)
    })

    it('keeps FastAPI validation lists free of any code', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({ detail: [{ msg: 'bad' }] }),
      })

      const error = await repository
        .uploadFromSpotifyUrl('https://x', config, 0)
        .catch((e) => e)

      expect(error).toBeInstanceOf(BackendApiError)
      expect(error.code).toBeUndefined()
    })

    it('keeps string details in the message', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ detail: 'Invalid audio format' }),
      })

      await expect(repository.uploadAudio(file, config)).rejects.toThrow(
        'Audio upload failed: Invalid audio format',
      )
    })

    it('wraps network errors', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'))

      await expect(
        repository.uploadFromYoutubeUrl('https://x', config),
      ).rejects.toThrow('YouTube upload failed: ECONNRESET')
    })
  })
})
