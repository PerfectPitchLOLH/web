import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { PartitionRepository } from '../partition.repository'
import { PartitionService } from '../partition.service'

vi.mock('@/server/lib/database', () => ({
  db: {
    transcriptionJob: {
      findUnique: vi.fn(),
    },
  },
}))

const { db } = await import('@/server/lib/database')

const makeSummary = (overrides = {}) => ({
  id: 'part-1',
  userId: 'user-1',
  title: 'Test',
  originalFileName: null,
  instrument: 'piano',
  partitionType: 'classique',
  tags: [],
  notes: null,
  sourceJobId: 'job-1',
  durationSeconds: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

const makeEntity = (overrides = {}) => ({
  ...makeSummary(),
  musicXmlContent: '<score/>',
  svgContent: null,
  transcribeConfig: {},
  ...overrides,
})

const makeJob = (overrides = {}) => ({
  status: 'completed',
  config: { instrument_type: 'piano', partition_type: 'classique' },
  results: { duration_seconds: 120 },
  ...overrides,
})

describe('PartitionService - Deep Tests', () => {
  let service: PartitionService
  let mockRepo: PartitionRepository

  beforeEach(() => {
    mockRepo = {
      findAllByUserId: vi.fn(),
      findByIdAndUserId: vi.fn(),
      findSvgByIdAndUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateSvg: vi.fn(),
      delete: vi.fn(),
      findByJobIdAndUserId: vi.fn(),
    } as any

    service = new PartitionService(mockRepo)
    vi.clearAllMocks()
  })

  describe('saveFromJob', () => {
    const setupFetch = (jobData: object, svgContent = '<svg/>') => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({ ok: true, json: async () => jobData })
          .mockResolvedValueOnce({ ok: true, text: async () => svgContent }),
      )
    }

    it('should throw PARTITION_ALREADY_SAVED when job already saved', async () => {
      vi.mocked(mockRepo.findByJobIdAndUserId).mockResolvedValue(
        makeEntity() as any,
      )

      await expect(
        service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' })
      } catch (e) {
        expect((e as ApiError).code).toBe('PARTITION_ALREADY_SAVED')
        expect((e as ApiError).statusCode).toBe(HTTP_STATUS.CONFLICT)
      }
    })

    it('should throw FORBIDDEN when job does not belong to user', async () => {
      vi.mocked(mockRepo.findByJobIdAndUserId).mockResolvedValue(null)
      vi.mocked(db.transcriptionJob.findUnique).mockResolvedValue({
        backendJobId: 'job-1',
        userId: 'user-other',
        musicXmlContent: null,
        svgContent: null,
      } as any)

      await expect(
        service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' })
      } catch (e) {
        expect((e as ApiError).code).toBe('FORBIDDEN')
        expect((e as ApiError).statusCode).toBe(HTTP_STATUS.FORBIDDEN)
      }
    })

    it('should throw FORBIDDEN when job record not found in DB', async () => {
      vi.mocked(mockRepo.findByJobIdAndUserId).mockResolvedValue(null)
      vi.mocked(db.transcriptionJob.findUnique).mockResolvedValue(null)

      await expect(
        service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' }),
      ).rejects.toThrow(ApiError)
    })

    it('should throw NOT_FOUND when backend job API returns non-ok', async () => {
      vi.mocked(mockRepo.findByJobIdAndUserId).mockResolvedValue(null)
      vi.mocked(db.transcriptionJob.findUnique).mockResolvedValue({
        backendJobId: 'job-1',
        userId: 'user-1',
        musicXmlContent: null,
        svgContent: null,
      } as any)
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

      await expect(
        service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' })
      } catch (e) {
        expect((e as ApiError).code).toBe('NOT_FOUND')
      }
    })

    it('should throw JOB_NOT_COMPLETED when job status is not completed', async () => {
      vi.mocked(mockRepo.findByJobIdAndUserId).mockResolvedValue(null)
      vi.mocked(db.transcriptionJob.findUnique).mockResolvedValue({
        backendJobId: 'job-1',
        userId: 'user-1',
        musicXmlContent: null,
        svgContent: null,
      } as any)
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => makeJob({ status: 'processing' }),
        }),
      )

      await expect(
        service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' })
      } catch (e) {
        expect((e as ApiError).code).toBe('JOB_NOT_COMPLETED')
        expect((e as ApiError).statusCode).toBe(HTTP_STATUS.BAD_REQUEST)
      }
    })

    it('should throw SERVICE_UNAVAILABLE when svg download fails', async () => {
      vi.mocked(mockRepo.findByJobIdAndUserId).mockResolvedValue(null)
      vi.mocked(db.transcriptionJob.findUnique).mockResolvedValue({
        backendJobId: 'job-1',
        userId: 'user-1',
        musicXmlContent: '<score/>',
        svgContent: null,
      } as any)
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({ ok: true, json: async () => makeJob() })
          .mockResolvedValueOnce({ ok: false }),
      )

      await expect(
        service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' }),
      ).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      })
    })

    it('should save partition successfully with all fields', async () => {
      vi.mocked(mockRepo.findByJobIdAndUserId).mockResolvedValue(null)
      vi.mocked(db.transcriptionJob.findUnique).mockResolvedValue({
        backendJobId: 'job-1',
        userId: 'user-1',
        musicXmlContent: '<score/>',
        svgContent: null,
      } as any)
      setupFetch(makeJob())
      vi.mocked(mockRepo.create).mockResolvedValue(makeEntity() as any)

      const result = await service.saveFromJob('user-1', {
        jobId: 'job-1',
        title: 'Ma partition',
        tags: ['jazz'],
        notes: 'Good one',
        originalFileName: 'file.mp3',
      })

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          title: 'Ma partition',
          tags: ['jazz'],
          notes: 'Good one',
          instrument: 'piano',
          partitionType: 'classique',
          musicXmlContent: '<score/>',
        }),
      )
      expect(result).not.toHaveProperty('musicXmlContent')
      expect(result).not.toHaveProperty('svgContent')
      expect(result).not.toHaveProperty('transcribeConfig')
    })

    it('should throw SERVICE_UNAVAILABLE when svg fetch throws', async () => {
      vi.mocked(mockRepo.findByJobIdAndUserId).mockResolvedValue(null)
      vi.mocked(db.transcriptionJob.findUnique).mockResolvedValue({
        backendJobId: 'job-1',
        userId: 'user-1',
        musicXmlContent: '<score/>',
        svgContent: null,
      } as any)
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({ ok: true, json: async () => makeJob() })
          .mockRejectedValueOnce(new Error('SVG fetch failed')),
      )

      await expect(
        service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' }),
      ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
    })

    it('should use fallback instrument and partitionType when config is empty', async () => {
      vi.mocked(mockRepo.findByJobIdAndUserId).mockResolvedValue(null)
      vi.mocked(db.transcriptionJob.findUnique).mockResolvedValue({
        backendJobId: 'job-1',
        userId: 'user-1',
        musicXmlContent: '<score/>',
        svgContent: null,
      } as any)
      setupFetch(makeJob({ config: {} }))
      vi.mocked(mockRepo.create).mockResolvedValue(makeEntity() as any)

      await service.saveFromJob('user-1', { jobId: 'job-1', title: 'T' })

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          instrument: 'other',
          partitionType: 'classique',
        }),
      )
    })
  })

  describe('getList', () => {
    it('should delegate to repository with filters', async () => {
      vi.mocked(mockRepo.findAllByUserId).mockResolvedValue([
        makeSummary(),
      ] as any)

      const result = await service.getList('user-1', {
        instrument: 'piano',
        page: 1,
        limit: 10,
      })

      expect(mockRepo.findAllByUserId).toHaveBeenCalledWith('user-1', {
        instrument: 'piano',
        page: 1,
        limit: 10,
      })
      expect(result).toHaveLength(1)
    })

    it('should return empty array when no partitions', async () => {
      vi.mocked(mockRepo.findAllByUserId).mockResolvedValue([])

      const result = await service.getList('user-1', {})

      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('should return partition when found', async () => {
      const entity = makeEntity()
      vi.mocked(mockRepo.findByIdAndUserId).mockResolvedValue(entity as any)

      const result = await service.getById('part-1', 'user-1')

      expect(result).toEqual(entity)
    })

    it('should throw PARTITION_NOT_FOUND when not found', async () => {
      vi.mocked(mockRepo.findByIdAndUserId).mockResolvedValue(null)

      await expect(service.getById('nope', 'user-1')).rejects.toThrow(ApiError)

      try {
        await service.getById('nope', 'user-1')
      } catch (e) {
        expect((e as ApiError).code).toBe('PARTITION_NOT_FOUND')
        expect((e as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })
  })

  describe('getSvg', () => {
    it('should return cached svgContent when available', async () => {
      vi.mocked(mockRepo.findSvgByIdAndUserId).mockResolvedValue({
        svgContent: '<svg>cached</svg>',
        musicXmlContent: '<score/>',
      })

      const result = await service.getSvg('part-1', 'user-1')

      expect(result).toBe('<svg>cached</svg>')
      expect(mockRepo.updateSvg).not.toHaveBeenCalled()
    })

    it('should throw PARTITION_NOT_FOUND when partition does not exist', async () => {
      vi.mocked(mockRepo.findSvgByIdAndUserId).mockResolvedValue(null)

      await expect(service.getSvg('nope', 'user-1')).rejects.toThrow(ApiError)

      try {
        await service.getSvg('nope', 'user-1')
      } catch (e) {
        expect((e as ApiError).code).toBe('PARTITION_NOT_FOUND')
      }
    })

    it('should render from musicXml and cache when svgContent is null', async () => {
      vi.mocked(mockRepo.findSvgByIdAndUserId).mockResolvedValue({
        svgContent: null,
        musicXmlContent: '<score/>',
      })
      vi.mocked(mockRepo.updateSvg).mockResolvedValue(undefined)
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          text: async () => '<svg>rendered</svg>',
        }),
      )

      const result = await service.getSvg('part-1', 'user-1')

      expect(result).toBe('<svg>rendered</svg>')
      await vi.waitFor(() => {
        expect(mockRepo.updateSvg).toHaveBeenCalledWith(
          'part-1',
          '<svg>rendered</svg>',
        )
      })
    })

    it('should throw SERVICE_UNAVAILABLE when render endpoint fails', async () => {
      vi.mocked(mockRepo.findSvgByIdAndUserId).mockResolvedValue({
        svgContent: null,
        musicXmlContent: '<score/>',
      })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

      await expect(service.getSvg('part-1', 'user-1')).rejects.toThrow(ApiError)

      try {
        await service.getSvg('part-1', 'user-1')
      } catch (e) {
        expect((e as ApiError).code).toBe('SERVICE_UNAVAILABLE')
        expect((e as ApiError).statusCode).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE)
      }
    })
  })

  describe('getMusicXml', () => {
    it('should return musicXmlContent when found', async () => {
      vi.mocked(mockRepo.findByIdAndUserId).mockResolvedValue(
        makeEntity({ musicXmlContent: '<score>content</score>' }) as any,
      )

      const result = await service.getMusicXml('part-1', 'user-1')

      expect(result).toBe('<score>content</score>')
    })

    it('should throw PARTITION_NOT_FOUND when not found', async () => {
      vi.mocked(mockRepo.findByIdAndUserId).mockResolvedValue(null)

      await expect(service.getMusicXml('nope', 'user-1')).rejects.toThrow(
        ApiError,
      )

      try {
        await service.getMusicXml('nope', 'user-1')
      } catch (e) {
        expect((e as ApiError).code).toBe('PARTITION_NOT_FOUND')
      }
    })
  })

  describe('update', () => {
    it('should return updated entity', async () => {
      const updated = makeEntity({ title: 'Nouveau titre' })
      vi.mocked(mockRepo.update).mockResolvedValue(updated as any)

      const result = await service.update('part-1', 'user-1', {
        title: 'Nouveau titre',
      })

      expect(result.title).toBe('Nouveau titre')
    })

    it('should throw PARTITION_NOT_FOUND when update returns null', async () => {
      vi.mocked(mockRepo.update).mockResolvedValue(null)

      await expect(
        service.update('nope', 'user-1', { title: 'X' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.update('nope', 'user-1', { title: 'X' })
      } catch (e) {
        expect((e as ApiError).code).toBe('PARTITION_NOT_FOUND')
        expect((e as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })

    it('should pass all update fields to repository', async () => {
      vi.mocked(mockRepo.update).mockResolvedValue(makeEntity() as any)

      await service.update('part-1', 'user-1', {
        title: 'T',
        tags: ['jazz'],
        notes: 'N',
      })

      expect(mockRepo.update).toHaveBeenCalledWith('part-1', 'user-1', {
        title: 'T',
        tags: ['jazz'],
        notes: 'N',
      })
    })
  })

  describe('delete', () => {
    it('should call repository delete with correct args', async () => {
      vi.mocked(mockRepo.delete).mockResolvedValue(true)

      await service.delete('part-1', 'user-1')

      expect(mockRepo.delete).toHaveBeenCalledWith('part-1', 'user-1')
    })

    it('should throw PARTITION_NOT_FOUND when repository returns false', async () => {
      vi.mocked(mockRepo.delete).mockResolvedValue(false)

      await expect(service.delete('nope', 'user-1')).rejects.toThrow(ApiError)

      try {
        await service.delete('nope', 'user-1')
      } catch (e) {
        expect((e as ApiError).code).toBe('PARTITION_NOT_FOUND')
        expect((e as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })
  })
})
