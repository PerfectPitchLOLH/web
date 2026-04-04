import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { PartitionRepository } from '../partition.repository'

vi.mock('@/server/lib/database', () => ({
  db: {
    savedPartition: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

const makeEntity = (overrides = {}) => ({
  id: 'part-1',
  userId: 'user-1',
  title: 'Test Partition',
  originalFileName: 'audio.mp3',
  instrument: 'piano',
  partitionType: 'classique',
  tags: [],
  notes: null,
  sourceJobId: 'job-1',
  durationSeconds: 120,
  musicXmlContent: '<score/>',
  svgContent: null,
  transcribeConfig: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

describe('PartitionRepository - Deep Tests', () => {
  let repository: PartitionRepository

  beforeEach(() => {
    repository = new PartitionRepository()
    vi.clearAllMocks()
  })

  describe('findAllByUserId', () => {
    it('should call findMany with correct userId', async () => {
      vi.mocked(db.savedPartition.findMany).mockResolvedValue([])

      await repository.findAllByUserId('user-1')

      expect(db.savedPartition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      )
    })

    it('should apply instrument filter when provided', async () => {
      vi.mocked(db.savedPartition.findMany).mockResolvedValue([])

      await repository.findAllByUserId('user-1', { instrument: 'piano' })

      expect(db.savedPartition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ instrument: 'piano' }),
        }),
      )
    })

    it('should apply case-insensitive search on title when provided', async () => {
      vi.mocked(db.savedPartition.findMany).mockResolvedValue([])

      await repository.findAllByUserId('user-1', { search: 'Mozart' })

      expect(db.savedPartition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'Mozart', mode: 'insensitive' },
          }),
        }),
      )
    })

    it('should use default page=1 and limit=20', async () => {
      vi.mocked(db.savedPartition.findMany).mockResolvedValue([])

      await repository.findAllByUserId('user-1')

      expect(db.savedPartition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      )
    })

    it('should calculate correct skip for page 2', async () => {
      vi.mocked(db.savedPartition.findMany).mockResolvedValue([])

      await repository.findAllByUserId('user-1', { page: 2, limit: 10 })

      expect(db.savedPartition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      )
    })

    it('should order by createdAt desc', async () => {
      vi.mocked(db.savedPartition.findMany).mockResolvedValue([])

      await repository.findAllByUserId('user-1')

      expect(db.savedPartition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      )
    })

    it('should not apply instrument filter when undefined', async () => {
      vi.mocked(db.savedPartition.findMany).mockResolvedValue([])

      await repository.findAllByUserId('user-1', { instrument: undefined })

      const call = vi.mocked(db.savedPartition.findMany).mock.calls[0][0]
      expect((call as any).where.instrument).toBeUndefined()
    })
  })

  describe('findByIdAndUserId', () => {
    it('should return entity when found', async () => {
      const entity = makeEntity()
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(entity as any)

      const result = await repository.findByIdAndUserId('part-1', 'user-1')

      expect(result).toEqual(entity)
      expect(db.savedPartition.findFirst).toHaveBeenCalledWith({
        where: { id: 'part-1', userId: 'user-1' },
      })
    })

    it('should return null when not found', async () => {
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(null)

      const result = await repository.findByIdAndUserId('nope', 'user-1')

      expect(result).toBeNull()
    })

    it('should not return partition belonging to another user', async () => {
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(null)

      const result = await repository.findByIdAndUserId('part-1', 'user-other')

      expect(db.savedPartition.findFirst).toHaveBeenCalledWith({
        where: { id: 'part-1', userId: 'user-other' },
      })
      expect(result).toBeNull()
    })
  })

  describe('findSvgByIdAndUserId', () => {
    it('should select only svgContent and musicXmlContent', async () => {
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue({
        svgContent: '<svg/>',
        musicXmlContent: '<score/>',
      } as any)

      const result = await repository.findSvgByIdAndUserId('part-1', 'user-1')

      expect(db.savedPartition.findFirst).toHaveBeenCalledWith({
        where: { id: 'part-1', userId: 'user-1' },
        select: { svgContent: true, musicXmlContent: true },
      })
      expect(result).toEqual({
        svgContent: '<svg/>',
        musicXmlContent: '<score/>',
      })
    })

    it('should return null when partition not found', async () => {
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(null)

      const result = await repository.findSvgByIdAndUserId('nope', 'user-1')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should pass all fields to db.create', async () => {
      const entity = makeEntity()
      vi.mocked(db.savedPartition.create).mockResolvedValue(entity as any)

      const dto = {
        userId: 'user-1',
        title: 'Test Partition',
        instrument: 'piano',
        partitionType: 'classique',
        musicXmlContent: '<score/>',
        transcribeConfig: {
          instrument_mode: 'single' as const,
          instrument_type: 'piano' as const,
          polyphonic: false,
          partition_type: 'classique' as const,
        },
      }

      const result = await repository.create(dto)

      expect(db.savedPartition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Test Partition',
          instrument: 'piano',
          partitionType: 'classique',
          musicXmlContent: '<score/>',
          tags: [],
        }),
      })
      expect(result).toEqual(entity)
    })

    it('should default tags to empty array when not provided', async () => {
      vi.mocked(db.savedPartition.create).mockResolvedValue(makeEntity() as any)

      await repository.create({
        userId: 'user-1',
        title: 'T',
        instrument: 'guitar',
        partitionType: 'classique',
        musicXmlContent: '<score/>',
        transcribeConfig: {
          instrument_mode: 'single',
          instrument_type: 'guitar',
          polyphonic: false,
          partition_type: 'classique',
        },
      })

      const call = vi.mocked(db.savedPartition.create).mock.calls[0][0]
      expect(call.data.tags).toEqual([])
    })

    it('should pass provided tags', async () => {
      vi.mocked(db.savedPartition.create).mockResolvedValue(
        makeEntity({ tags: ['jazz'] }) as any,
      )

      await repository.create({
        userId: 'user-1',
        title: 'T',
        instrument: 'piano',
        partitionType: 'classique',
        musicXmlContent: '<score/>',
        transcribeConfig: {
          instrument_mode: 'single' as const,
          instrument_type: 'piano' as const,
          polyphonic: false,
          partition_type: 'classique' as const,
        },
        tags: ['jazz'],
      })

      const call = vi.mocked(db.savedPartition.create).mock.calls[0][0]
      expect(call.data.tags).toEqual(['jazz'])
    })
  })

  describe('update', () => {
    it('should return null when partition not found', async () => {
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(null)

      const result = await repository.update('nope', 'user-1', { title: 'X' })

      expect(result).toBeNull()
      expect(db.savedPartition.update).not.toHaveBeenCalled()
    })

    it('should update only title when provided', async () => {
      const entity = makeEntity()
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(entity as any)
      vi.mocked(db.savedPartition.update).mockResolvedValue({
        ...entity,
        title: 'New',
      } as any)

      const result = await repository.update('part-1', 'user-1', {
        title: 'New',
      })

      expect(db.savedPartition.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { title: 'New' },
      })
      expect(result?.title).toBe('New')
    })

    it('should update tags and notes together', async () => {
      const entity = makeEntity()
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(entity as any)
      vi.mocked(db.savedPartition.update).mockResolvedValue(entity as any)

      await repository.update('part-1', 'user-1', {
        tags: ['rock'],
        notes: 'note',
      })

      expect(db.savedPartition.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { tags: ['rock'], notes: 'note' },
      })
    })

    it('should not include undefined fields in update data', async () => {
      const entity = makeEntity()
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(entity as any)
      vi.mocked(db.savedPartition.update).mockResolvedValue(entity as any)

      await repository.update('part-1', 'user-1', {})

      const call = vi.mocked(db.savedPartition.update).mock.calls[0][0]
      expect(Object.keys(call.data)).toHaveLength(0)
    })
  })

  describe('updateSvg', () => {
    it('should update svgContent by id', async () => {
      vi.mocked(db.savedPartition.update).mockResolvedValue(makeEntity() as any)

      await repository.updateSvg('part-1', '<svg>new</svg>')

      expect(db.savedPartition.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { svgContent: '<svg>new</svg>' },
      })
    })
  })

  describe('delete', () => {
    it('should return false when partition not found', async () => {
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(null)

      const result = await repository.delete('nope', 'user-1')

      expect(result).toBe(false)
      expect(db.savedPartition.delete).not.toHaveBeenCalled()
    })

    it('should delete and return true when partition exists', async () => {
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(
        makeEntity() as any,
      )
      vi.mocked(db.savedPartition.delete).mockResolvedValue(makeEntity() as any)

      const result = await repository.delete('part-1', 'user-1')

      expect(result).toBe(true)
      expect(db.savedPartition.delete).toHaveBeenCalledWith({
        where: { id: 'part-1' },
      })
    })

    it('should not delete partition belonging to another user', async () => {
      vi.mocked(db.savedPartition.findFirst).mockResolvedValue(null)

      const result = await repository.delete('part-1', 'user-other')

      expect(result).toBe(false)
      expect(db.savedPartition.delete).not.toHaveBeenCalled()
    })
  })

  describe('existsByJobIdAndUserId', () => {
    it('should return true when count > 0', async () => {
      vi.mocked(db.savedPartition.count).mockResolvedValue(1)

      const result = await repository.existsByJobIdAndUserId('job-1', 'user-1')

      expect(result).toBe(true)
    })

    it('should return false when count is 0', async () => {
      vi.mocked(db.savedPartition.count).mockResolvedValue(0)

      const result = await repository.existsByJobIdAndUserId(
        'job-nope',
        'user-1',
      )

      expect(result).toBe(false)
    })

    it('should query with correct jobId and userId', async () => {
      vi.mocked(db.savedPartition.count).mockResolvedValue(0)

      await repository.existsByJobIdAndUserId('job-xyz', 'user-abc')

      expect(db.savedPartition.count).toHaveBeenCalledWith({
        where: { sourceJobId: 'job-xyz', userId: 'user-abc' },
      })
    })
  })
})
