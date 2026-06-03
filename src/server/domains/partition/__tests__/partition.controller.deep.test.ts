// @ts-nocheck
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { PartitionController } from '../partition.controller'
import { PartitionService } from '../partition.service'

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

describe('PartitionController - Deep Tests', () => {
  let controller: PartitionController
  let mockService: PartitionService

  beforeEach(() => {
    mockService = {
      getList: vi.fn(),
      saveFromJob: vi.fn(),
      getById: vi.fn(),
      getSvg: vi.fn(),
      getMusicXml: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any

    controller = new PartitionController(mockService)
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('should return 200 with partition list', async () => {
      vi.mocked(mockService.getList).mockResolvedValue([makeSummary()])

      const req = new NextRequest('http://localhost/api/partitions')
      const res = await controller.list('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
    })

    it('should parse instrument query param', async () => {
      vi.mocked(mockService.getList).mockResolvedValue([])

      const req = new NextRequest(
        'http://localhost/api/partitions?instrument=guitar',
      )
      await controller.list('user-1', req)

      expect(mockService.getList).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ instrument: 'guitar' }),
      )
    })

    it('should parse search query param', async () => {
      vi.mocked(mockService.getList).mockResolvedValue([])

      const req = new NextRequest(
        'http://localhost/api/partitions?search=Mozart',
      )
      await controller.list('user-1', req)

      expect(mockService.getList).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ search: 'Mozart' }),
      )
    })

    it('should parse page and limit params', async () => {
      vi.mocked(mockService.getList).mockResolvedValue([])

      const req = new NextRequest(
        'http://localhost/api/partitions?page=2&limit=5',
      )
      await controller.list('user-1', req)

      expect(mockService.getList).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ page: 2, limit: 5 }),
      )
    })

    it('should default page=1 and limit=20 when not provided', async () => {
      vi.mocked(mockService.getList).mockResolvedValue([])

      const req = new NextRequest('http://localhost/api/partitions')
      await controller.list('user-1', req)

      expect(mockService.getList).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ page: 1, limit: 20 }),
      )
    })

    it('should return 500 when service throws unexpected error', async () => {
      vi.mocked(mockService.getList).mockRejectedValue(new Error('DB crash'))

      const req = new NextRequest('http://localhost/api/partitions')
      const res = await controller.list('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('save', () => {
    it('should return 201 with created partition summary', async () => {
      vi.mocked(mockService.saveFromJob).mockResolvedValue(makeSummary())

      const req = new NextRequest('http://localhost/api/partitions', {
        method: 'POST',
        body: JSON.stringify({ jobId: 'job-1', title: 'Ma partition' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await controller.save('user-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('part-1')
    })

    it('should return 409 when partition already saved', async () => {
      vi.mocked(mockService.saveFromJob).mockRejectedValue(
        new ApiError(
          'PARTITION_ALREADY_SAVED',
          HTTP_STATUS.CONFLICT,
          'Already saved',
        ),
      )

      const req = new NextRequest('http://localhost/api/partitions', {
        method: 'POST',
        body: JSON.stringify({ jobId: 'job-1', title: 'T' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await controller.save('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    })

    it('should return 403 when user does not own the job', async () => {
      vi.mocked(mockService.saveFromJob).mockRejectedValue(
        new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, 'Access denied'),
      )

      const req = new NextRequest('http://localhost/api/partitions', {
        method: 'POST',
        body: JSON.stringify({ jobId: 'job-1', title: 'T' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await controller.save('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('should return 400 when job is not completed', async () => {
      vi.mocked(mockService.saveFromJob).mockRejectedValue(
        new ApiError(
          'JOB_NOT_COMPLETED',
          HTTP_STATUS.BAD_REQUEST,
          'Not completed',
        ),
      )

      const req = new NextRequest('http://localhost/api/partitions', {
        method: 'POST',
        body: JSON.stringify({ jobId: 'job-1', title: 'T' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await controller.save('user-1', req)

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('getOne', () => {
    it('should return 200 with summary (without heavy fields)', async () => {
      vi.mocked(mockService.getById).mockResolvedValue(makeEntity() as any)

      const res = await controller.getOne('user-1', 'part-1')
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(body.success).toBe(true)
      expect(body.data).not.toHaveProperty('musicXmlContent')
      expect(body.data).not.toHaveProperty('svgContent')
      expect(body.data).not.toHaveProperty('transcribeConfig')
    })

    it('should return 404 when partition not found', async () => {
      vi.mocked(mockService.getById).mockRejectedValue(
        new ApiError('PARTITION_NOT_FOUND', HTTP_STATUS.NOT_FOUND),
      )

      const res = await controller.getOne('user-1', 'nope')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('patch', () => {
    it('should return 200 with updated summary', async () => {
      vi.mocked(mockService.update).mockResolvedValue(
        makeEntity({ title: 'Nouveau titre' }) as any,
      )

      const req = new NextRequest('http://localhost/api/partitions/part-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Nouveau titre' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await controller.patch('user-1', 'part-1', req)
      const body = await res.json()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(body.data).not.toHaveProperty('musicXmlContent')
    })

    it('should return 404 when partition not found', async () => {
      vi.mocked(mockService.update).mockRejectedValue(
        new ApiError('PARTITION_NOT_FOUND', HTTP_STATUS.NOT_FOUND),
      )

      const req = new NextRequest('http://localhost/api/partitions/nope', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'X' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await controller.patch('user-1', 'nope', req)

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('remove', () => {
    it('should return 204 on successful delete', async () => {
      vi.mocked(mockService.delete).mockResolvedValue(undefined)

      const res = await controller.remove('user-1', 'part-1')

      expect(res.status).toBe(HTTP_STATUS.NO_CONTENT)
    })

    it('should return 404 when partition not found', async () => {
      vi.mocked(mockService.delete).mockRejectedValue(
        new ApiError('PARTITION_NOT_FOUND', HTTP_STATUS.NOT_FOUND),
      )

      const res = await controller.remove('user-1', 'nope')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('svg', () => {
    it('should return SVG with correct content-type', async () => {
      vi.mocked(mockService.getSvg).mockResolvedValue('<svg>content</svg>')

      const res = await controller.svg('user-1', 'part-1')
      const text = await res.text()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(res.headers.get('Content-Type')).toBe('image/svg+xml')
      expect(text).toBe('<svg>content</svg>')
    })

    it('should return 404 when partition not found', async () => {
      vi.mocked(mockService.getSvg).mockRejectedValue(
        new ApiError('PARTITION_NOT_FOUND', HTTP_STATUS.NOT_FOUND),
      )

      const res = await controller.svg('user-1', 'nope')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should return 503 when render service is unavailable', async () => {
      vi.mocked(mockService.getSvg).mockRejectedValue(
        new ApiError('SERVICE_UNAVAILABLE', HTTP_STATUS.SERVICE_UNAVAILABLE),
      )

      const res = await controller.svg('user-1', 'part-1')

      expect(res.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE)
    })
  })

  describe('musicXml', () => {
    it('should return XML with correct headers', async () => {
      vi.mocked(mockService.getMusicXml).mockResolvedValue('<score/>')

      const res = await controller.musicXml('user-1', 'part-1')
      const text = await res.text()

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(res.headers.get('Content-Type')).toBe('application/xml')
      expect(res.headers.get('Content-Disposition')).toContain('attachment')
      expect(res.headers.get('Content-Disposition')).toContain('part-1')
      expect(text).toBe('<score/>')
    })

    it('should return 404 when partition not found', async () => {
      vi.mocked(mockService.getMusicXml).mockRejectedValue(
        new ApiError('PARTITION_NOT_FOUND', HTTP_STATUS.NOT_FOUND),
      )

      const res = await controller.musicXml('user-1', 'nope')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })
})
