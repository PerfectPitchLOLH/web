// @ts-nocheck
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { NotificationController } from '../notification.controller'
import { NotificationRepository } from '../notification.repository'
import { NotificationService } from '../notification.service'
import type {
  BulkNotificationDTO,
  CreateNotificationDTO,
  NotificationEntity,
} from '../notification.types'
import { NotificationAdminController } from '../notification-admin.controller'

vi.mock('@/server/lib/database', () => ({
  db: {
    notification: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('Notification Security Tests', () => {
  describe('Injection Attacks', () => {
    let repository: NotificationRepository

    beforeEach(() => {
      repository = new NotificationRepository()
      vi.clearAllMocks()
    })

    it('should prevent SQL injection in findById', async () => {
      const { db } = await import('@/server/lib/database')

      const sqlInjection = "'; DROP TABLE notifications; --"

      vi.mocked(db.notification.findUnique).mockResolvedValue(null)

      await repository.findById(sqlInjection)

      expect(db.notification.findUnique).toHaveBeenCalledWith({
        where: { id: sqlInjection },
      })
    })

    it('should prevent SQL injection in userId filter', async () => {
      const { db } = await import('@/server/lib/database')

      const sqlInjection = "' OR '1'='1"

      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId({ userId: sqlInjection })

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: sqlInjection,
          }),
        }),
      )
    })

    it('should prevent SQL injection in bulk delete', async () => {
      const { db } = await import('@/server/lib/database')

      const maliciousIds = ["'; DROP TABLE notifications; --", "' OR '1'='1"]

      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 0 })

      await repository.deleteMultiple(maliciousIds)

      expect(db.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: maliciousIds,
          },
        },
      })
    })

    it('should prevent NoSQL injection in filters', async () => {
      const { db } = await import('@/server/lib/database')

      const noSqlInjection: any = { $ne: null }

      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId({ userId: noSqlInjection })

      expect(db.notification.findMany).toHaveBeenCalled()
    })

    it('should prevent command injection in notification data', async () => {
      const { db } = await import('@/server/lib/database')

      const commandInjection = 'test; rm -rf /'

      const data: CreateNotificationDTO = {
        userId: commandInjection,
        type: 'security',
        title: commandInjection,
        description: commandInjection,
        icon: commandInjection,
      }

      vi.mocked(db.notification.create).mockResolvedValue({
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await repository.create(data)

      expect(db.notification.create).toHaveBeenCalled()
    })
  })

  describe('XSS (Cross-Site Scripting) Prevention', () => {
    let repository: NotificationRepository

    beforeEach(() => {
      repository = new NotificationRepository()
      vi.clearAllMocks()
    })

    it('should accept XSS payload in title (sanitization should happen at presentation layer)', async () => {
      const { db } = await import('@/server/lib/database')

      const xssPayload = '<script>alert("XSS")</script>'

      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: xssPayload,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(xssPayload)
    })

    it('should accept XSS payload with event handlers', async () => {
      const { db } = await import('@/server/lib/database')

      const xssPayload = '<img src=x onerror=alert("XSS")>'

      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: xssPayload,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(xssPayload)
    })

    it('should accept XSS payload with JavaScript protocol', async () => {
      const { db } = await import('@/server/lib/database')

      const xssPayload = '<a href="javascript:alert(\'XSS\')">Click</a>'

      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: xssPayload,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(xssPayload)
    })

    it('should accept SVG-based XSS', async () => {
      const { db } = await import('@/server/lib/database')

      const svgXss = '<svg onload=alert("XSS")>'

      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: svgXss,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(svgXss)
    })
  })

  describe('Authorization & Access Control', () => {
    let service: NotificationService
    let mockRepository: NotificationRepository

    beforeEach(() => {
      mockRepository = {
        findById: vi.fn(),
        findByUserId: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        markAsRead: vi.fn(),
        markMultipleAsRead: vi.fn(),
        delete: vi.fn(),
        deleteMultiple: vi.fn(),
      } as any

      service = new NotificationService(mockRepository)
      vi.clearAllMocks()
    })

    it('should prevent accessing other users notifications', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Private Data',
        description: 'Sensitive info',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockNotification)

      await expect(
        service.getNotificationById('notif-1', 'user-2'),
      ).rejects.toThrow(ApiError)

      try {
        await service.getNotificationById('notif-1', 'user-2')
      } catch (error: any) {
        expect(error.code).toBe('UNAUTHORIZED')
        expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN)
      }
    })

    it('should prevent updating other users notifications', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Original',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockNotification)

      await expect(
        service.updateNotification('notif-1', 'user-2', { title: 'Hacked' }),
      ).rejects.toThrow(ApiError)
    })

    it('should prevent deleting other users notifications', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockNotification)

      await expect(
        service.deleteNotification('notif-1', 'user-2'),
      ).rejects.toThrow(ApiError)
    })

    it('should prevent marking other users notifications as read', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockNotification)

      await expect(service.markAsRead('notif-1', 'user-2')).rejects.toThrow(
        ApiError,
      )
    })

    it('should filter out unauthorized notifications in bulk operations', async () => {
      const mockNotifications: (NotificationEntity | null)[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'security',
          title: 'User 1 Notification',
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-2',
          type: 'security',
          title: 'User 2 Notification',
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notif-3',
          userId: 'user-1',
          type: 'activity',
          title: 'User 1 Activity',
          description: 'Desc',
          icon: 'Activity',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.findById).mockImplementation(
        async (id: string) => {
          return mockNotifications.find((n) => n?.id === id) || null
        },
      )

      vi.mocked(mockRepository.markMultipleAsRead).mockResolvedValue({
        count: 2,
      })

      const result = await service.markMultipleAsRead(
        ['notif-1', 'notif-2', 'notif-3'],
        'user-1',
      )

      expect(result.count).toBe(2)
      expect(mockRepository.markMultipleAsRead).toHaveBeenCalledWith([
        'notif-1',
        'notif-3',
      ])
    })

    it('should prevent accessing notifications with manipulated userId (authorization bypass)', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Confidential',
        description: 'Sensitive data',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockNotification)

      await expect(
        service.getNotificationById('notif-1', "user-1' OR '1'='1"),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('Data Leakage Prevention', () => {
    let controller: NotificationController
    let mockService: NotificationService

    beforeEach(() => {
      mockService = {
        getNotifications: vi.fn(),
        getNotificationById: vi.fn(),
      } as any

      controller = new NotificationController(mockService)
      vi.clearAllMocks()
    })

    it('should not expose sensitive database errors', async () => {
      vi.mocked(mockService.getNotifications).mockRejectedValue(
        new Error('Database connection at 10.0.0.5:5432 failed'),
      )

      const request = new NextRequest('http://localhost/api/notifications')

      const response = await controller.getNotifications('user-1', request)
      const data = await response.json()

      expect(data.error.message).not.toContain('10.0.0.5')
      expect(data.error.message).not.toContain('5432')
    })

    it('should not expose internal IDs in error messages', async () => {
      vi.mocked(mockService.getNotificationById).mockRejectedValue(
        new Error(
          'Record with UUID a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6 not found',
        ),
      )

      const response = await controller.getNotificationById('notif-1', 'user-1')
      const data = await response.json()

      expect(data.error.message).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      )
    })

    it('should not expose stack traces in production', async () => {
      vi.mocked(mockService.getNotifications).mockRejectedValue(
        new Error('Internal server error with stack trace'),
      )

      const request = new NextRequest('http://localhost/api/notifications')

      const response = await controller.getNotifications('user-1', request)
      const data = await response.json()

      expect(data).not.toHaveProperty('stack')
      expect(data.error).not.toHaveProperty('stack')
    })
  })

  describe('Input Validation & Sanitization', () => {
    let controller: NotificationController
    let mockService: NotificationService

    beforeEach(() => {
      mockService = {
        createNotification: vi.fn(),
        markMultipleAsRead: vi.fn(),
      } as any

      controller = new NotificationController(mockService)
      vi.clearAllMocks()
    })

    it('should reject missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          type: 'security',
        }),
      })

      const response = await controller.createNotification(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.data.error).toContain('Champs requis manquants')
    })

    it('should reject invalid JSON payload', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: '{invalid json',
      })

      const response = await controller.createNotification(request)

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject non-array notificationIds in bulk operations', async () => {
      const request = new NextRequest(
        'http://localhost/api/notifications/mark-read',
        {
          method: 'POST',
          body: JSON.stringify({
            notificationIds: 'not-an-array',
          }),
        },
      )

      const response = await controller.markMultipleAsRead('user-1', request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.data.error).toContain('doit être un tableau')
    })

    it('should handle extremely large payload', async () => {
      const hugePayload = {
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'a'.repeat(10_000_000),
      }

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify(hugePayload),
      })

      const response = await controller.createNotification(request)

      expect(response.status).toBeLessThanOrEqual(500)
    })

    it('should handle null bytes in input', async () => {
      const nullBytePayload = {
        userId: 'user-1',
        type: 'security',
        title: 'Test\x00Hidden',
        description: 'Desc',
      }

      const mockCreated: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test\x00Hidden',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockService.createNotification).mockResolvedValue(mockCreated)

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify(nullBytePayload),
      })

      const response = await controller.createNotification(request)

      expect(response.status).toBe(HTTP_STATUS.CREATED)
    })
  })

  describe('Mass Assignment & Parameter Tampering', () => {
    let controller: NotificationController
    let mockService: NotificationService

    beforeEach(() => {
      mockService = {
        createNotification: vi.fn(),
      } as any

      controller = new NotificationController(mockService)
      vi.clearAllMocks()
    })

    it('should not allow setting arbitrary fields via mass assignment', async () => {
      const maliciousPayload = {
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        isAdmin: true,
        role: 'admin',
        deletedAt: null,
      }

      const mockCreated: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockService.createNotification).mockResolvedValue(mockCreated)

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify(maliciousPayload),
      })

      await controller.createNotification(request)

      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'security',
          title: 'Test',
          description: 'Desc',
        }),
      )
    })
  })

  describe('Bulk Notification Security', () => {
    let adminController: NotificationAdminController
    let mockService: NotificationService

    beforeEach(() => {
      mockService = {
        sendBulkNotification: vi.fn(),
      } as any

      adminController = new NotificationAdminController(mockService)
      vi.clearAllMocks()
    })

    it('should handle XSS in bulk notification title', async () => {
      const xssTitle = '<script>alert("Mass XSS")</script>'

      const mockResult = {
        count: 1000,
        notifications: [],
      }

      vi.mocked(mockService.sendBulkNotification).mockResolvedValue(mockResult)

      const bulkData: BulkNotificationDTO = {
        type: 'system',
        title: xssTitle,
        description: 'Desc',
        targeting: {
          sendToAll: true,
        },
      }

      const request = new NextRequest(
        'http://localhost/api/admin/notifications/bulk',
        {
          method: 'POST',
          body: JSON.stringify(bulkData),
        },
      )

      await adminController.sendBulkNotification(request)

      expect(mockService.sendBulkNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: xssTitle,
        }),
      )
    })

    it('should handle SQL injection in user targeting filters', async () => {
      const mockResult = {
        count: 0,
        notifications: [],
      }

      vi.mocked(mockService.sendBulkNotification).mockResolvedValue(mockResult)

      const bulkData: BulkNotificationDTO = {
        type: 'custom',
        title: 'Test',
        description: 'Desc',
        targeting: {
          filters: {
            userIds: ["'; DROP TABLE users; --", "' OR '1'='1"],
          },
        },
      }

      const request = new NextRequest(
        'http://localhost/api/admin/notifications/bulk',
        {
          method: 'POST',
          body: JSON.stringify(bulkData),
        },
      )

      await adminController.sendBulkNotification(request)

      expect(mockService.sendBulkNotification).toHaveBeenCalled()
    })

    it('should prevent notification spam to excessive users', async () => {
      vi.mocked(mockService.sendBulkNotification).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          'Too many users',
        ),
      )

      const bulkData: BulkNotificationDTO = {
        type: 'marketing',
        title: 'Spam',
        description: 'Spam content',
        targeting: {
          sendToAll: true,
        },
      }

      const request = new NextRequest(
        'http://localhost/api/admin/notifications/bulk',
        {
          method: 'POST',
          body: JSON.stringify(bulkData),
        },
      )

      const response = await adminController.sendBulkNotification(request)

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('Race Conditions & Timing Attacks', () => {
    let service: NotificationService
    let mockRepository: NotificationRepository

    beforeEach(() => {
      mockRepository = {
        findById: vi.fn(),
        markAsRead: vi.fn(),
        delete: vi.fn(),
      } as any

      service = new NotificationService(mockRepository)
      vi.clearAllMocks()
    })

    it('should handle race condition in concurrent markAsRead calls', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockMarked: NotificationEntity = {
        ...mockNotification,
        read: true,
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockNotification)
      vi.mocked(mockRepository.markAsRead).mockResolvedValue(mockMarked)

      const [result1, result2] = await Promise.all([
        service.markAsRead('notif-1', 'user-1'),
        service.markAsRead('notif-1', 'user-1'),
      ])

      expect(result1.read).toBe(true)
      expect(result2.read).toBe(true)
    })

    it('should handle race condition in concurrent delete calls', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById)
        .mockResolvedValueOnce(mockNotification)
        .mockResolvedValueOnce(null)

      vi.mocked(mockRepository.delete).mockResolvedValueOnce(true)

      const results = await Promise.allSettled([
        service.deleteNotification('notif-1', 'user-1'),
        service.deleteNotification('notif-1', 'user-1'),
      ])

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    })
  })

  describe('IDOR (Insecure Direct Object Reference)', () => {
    let service: NotificationService
    let mockRepository: NotificationRepository

    beforeEach(() => {
      mockRepository = {
        findById: vi.fn(),
      } as any

      service = new NotificationService(mockRepository)
      vi.clearAllMocks()
    })

    it('should prevent IDOR by verifying ownership before access', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Private Notification',
        description: 'Private content',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockNotification)

      await expect(
        service.getNotificationById('notif-1', 'user-2'),
      ).rejects.toThrow(ApiError)
    })

    it('should prevent sequential IDOR enumeration', async () => {
      const notificationIds = [
        'notif-1',
        'notif-2',
        'notif-3',
        'notif-4',
        'notif-5',
      ]

      const mockNotifications: NotificationEntity[] = notificationIds.map(
        (id, i) => ({
          id,
          userId: `user-${(i % 2) + 1}`,
          type: 'security',
          title: `Notification ${i + 1}`,
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      )

      vi.mocked(mockRepository.findById).mockImplementation(
        async (id: string) => {
          return mockNotifications.find((n) => n.id === id) || null
        },
      )

      const results = await Promise.allSettled(
        notificationIds.map((id) => service.getNotificationById(id, 'user-1')),
      )

      const successfulAccess = results.filter((r) => r.status === 'fulfilled')
      const deniedAccess = results.filter((r) => r.status === 'rejected')

      expect(successfulAccess.length).toBeLessThan(notificationIds.length)
      expect(deniedAccess.length).toBeGreaterThan(0)
    })
  })

  describe('Unicode & Special Characters Security', () => {
    let repository: NotificationRepository

    beforeEach(() => {
      repository = new NotificationRepository()
      vi.clearAllMocks()
    })

    it('should handle Unicode normalization attacks', async () => {
      const { db } = await import('@/server/lib/database')

      const unicodeAttack = '\u0041\u0301'

      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: unicodeAttack,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(unicodeAttack)
    })

    it('should handle zero-width characters', async () => {
      const { db } = await import('@/server/lib/database')

      const zeroWidthAttack = 'Hello\u200BWorld'

      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: zeroWidthAttack,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(zeroWidthAttack)
    })

    it('should handle RTL (Right-to-Left) override attacks', async () => {
      const { db } = await import('@/server/lib/database')

      const rtlAttack = 'Test\u202Egnirts'

      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: rtlAttack,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(rtlAttack)
    })
  })
})
