// @ts-nocheck
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { NotificationController } from '../notification.controller'
import { NotificationService } from '../notification.service'
import type {
  BulkNotificationDTO,
  NotificationEntity,
  UserTargetingFilters,
} from '../notification.types'
import { NotificationAdminController } from '../notification-admin.controller'

describe('NotificationController - Deep Tests', () => {
  let controller: NotificationController
  let mockService: NotificationService

  beforeEach(() => {
    mockService = {
      getNotifications: vi.fn(),
      getNotificationById: vi.fn(),
      createNotification: vi.fn(),
      updateNotification: vi.fn(),
      markAsRead: vi.fn(),
      markMultipleAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      deleteNotificationAdmin: vi.fn(),
      deleteMultiple: vi.fn(),
      getUnreadCount: vi.fn(),
      sendBulkNotification: vi.fn(),
      getTargetedUserCount: vi.fn(),
      getAdminNotifications: vi.fn(),
      getStats: vi.fn(),
    } as any

    controller = new NotificationController(mockService)
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('should return notifications with filters', async () => {
      const mockResponse = {
        notifications: [],
        total: 10,
        unreadCount: 5,
      }

      vi.mocked(mockService.getNotifications).mockResolvedValue(mockResponse)

      const request = new NextRequest(
        'http://localhost/api/notifications?read=true&type=security&limit=20&offset=10',
      )

      const response = await controller.getNotifications('user-1', request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResponse)
    })

    it('should handle boolean read filter correctly', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      })

      const request = new NextRequest(
        'http://localhost/api/notifications?read=false',
      )

      await controller.getNotifications('user-1', request)

      expect(mockService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          read: false,
        }),
      )
    })

    it('should parse limit and offset as integers', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      })

      const request = new NextRequest(
        'http://localhost/api/notifications?limit=50&offset=20',
      )

      await controller.getNotifications('user-1', request)

      expect(mockService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 20,
        }),
      )
    })

    it('should handle invalid integer values gracefully', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      })

      const request = new NextRequest(
        'http://localhost/api/notifications?limit=abc&offset=xyz',
      )

      await controller.getNotifications('user-1', request)

      expect(mockService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: NaN,
          offset: NaN,
        }),
      )
    })

    it('should handle empty userId', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      })

      const request = new NextRequest('http://localhost/api/notifications')

      await controller.getNotifications('', request)

      expect(mockService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '',
        }),
      )
    })

    it('should handle service errors', async () => {
      vi.mocked(mockService.getNotifications).mockRejectedValue(
        new Error('Database error'),
      )

      const request = new NextRequest('http://localhost/api/notifications')

      const response = await controller.getNotifications('user-1', request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle ApiError correctly', async () => {
      vi.mocked(mockService.getNotifications).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          'Invalid filters',
        ),
      )

      const request = new NextRequest('http://localhost/api/notifications')

      const response = await controller.getNotifications('user-1', request)

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should handle SQL injection attempt in userId', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      })

      const request = new NextRequest('http://localhost/api/notifications')

      await controller.getNotifications(
        "'; DROP TABLE notifications; --",
        request,
      )

      expect(mockService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "'; DROP TABLE notifications; --",
        }),
      )
    })

    it('should handle very long query parameters', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      })

      const longType = 'a'.repeat(10000)
      const request = new NextRequest(
        `http://localhost/api/notifications?type=${longType}`,
      )

      await controller.getNotifications('user-1', request)

      expect(mockService.getNotifications).toHaveBeenCalled()
    })
  })

  describe('getNotificationById', () => {
    it('should return notification by ID', async () => {
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

      vi.mocked(mockService.getNotificationById).mockResolvedValue(
        mockNotification,
      )

      const response = await controller.getNotificationById('notif-1', 'user-1')
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data).toMatchObject({
        id: mockNotification.id,
        userId: mockNotification.userId,
        type: mockNotification.type,
        title: mockNotification.title,
        description: mockNotification.description,
        icon: mockNotification.icon,
        read: mockNotification.read,
      })
      expect(data.data.createdAt).toBeDefined()
      expect(data.data.updatedAt).toBeDefined()
    })

    it('should handle NOT_FOUND error', async () => {
      vi.mocked(mockService.getNotificationById).mockRejectedValue(
        new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Notification not found',
        ),
      )

      const response = await controller.getNotificationById('notif-1', 'user-1')

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should handle unauthorized access', async () => {
      vi.mocked(mockService.getNotificationById).mockRejectedValue(
        new ApiError('UNAUTHORIZED', HTTP_STATUS.FORBIDDEN, 'Unauthorized'),
      )

      const response = await controller.getNotificationById('notif-1', 'user-2')

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('should handle empty ID', async () => {
      vi.mocked(mockService.getNotificationById).mockRejectedValue(
        new ApiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, 'Invalid ID'),
      )

      const response = await controller.getNotificationById('', 'user-1')

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
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

      vi.mocked(mockService.createNotification).mockResolvedValue(
        mockNotification,
      )

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          type: 'security',
          title: 'Test',
          description: 'Desc',
        }),
      })

      const response = await controller.createNotification(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.data).toMatchObject({
        id: mockNotification.id,
        userId: mockNotification.userId,
        type: mockNotification.type,
        title: mockNotification.title,
        description: mockNotification.description,
        icon: mockNotification.icon,
        read: mockNotification.read,
      })
      expect(data.data.createdAt).toBeDefined()
      expect(data.data.updatedAt).toBeDefined()
    })

    it('should return BAD_REQUEST when required fields are missing', async () => {
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

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: 'invalid json {',
      })

      const response = await controller.createNotification(request)

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should handle XSS payload in title', async () => {
      const xssTitle = '<script>alert("XSS")</script>'
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: xssTitle,
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockService.createNotification).mockResolvedValue(
        mockNotification,
      )

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          type: 'security',
          title: xssTitle,
          description: 'Desc',
        }),
      })

      await controller.createNotification(request)

      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: xssTitle,
        }),
      )
    })

    it('should handle very large payload', async () => {
      const largeDescription = 'a'.repeat(1000000)

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          type: 'security',
          title: 'Test',
          description: largeDescription,
        }),
      })

      const response = await controller.createNotification(request)

      expect(response.status).toBeLessThanOrEqual(500)
    })

    it('should handle Unicode and emojis', async () => {
      const unicodeTitle = '通知 🔔 Notification ñ'
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: unicodeTitle,
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockService.createNotification).mockResolvedValue(
        mockNotification,
      )

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          type: 'security',
          title: unicodeTitle,
          description: 'Desc',
        }),
      })

      const response = await controller.createNotification(request)
      const data = await response.json()

      expect(data.data.title).toBe(unicodeTitle)
    })
  })

  describe('updateNotification', () => {
    it('should update notification successfully', async () => {
      const mockUpdated: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Updated',
        description: 'Updated Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockService.updateNotification).mockResolvedValue(mockUpdated)

      const request = new NextRequest(
        'http://localhost/api/notifications/notif-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ title: 'Updated' }),
        },
      )

      const response = await controller.updateNotification(
        'notif-1',
        'user-1',
        request,
      )
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data.title).toBe('Updated')
    })

    it('should handle empty update object', async () => {
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

      vi.mocked(mockService.updateNotification).mockResolvedValue(
        mockNotification,
      )

      const request = new NextRequest(
        'http://localhost/api/notifications/notif-1',
        {
          method: 'PATCH',
          body: JSON.stringify({}),
        },
      )

      const response = await controller.updateNotification(
        'notif-1',
        'user-1',
        request,
      )

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle unauthorized update attempt', async () => {
      vi.mocked(mockService.updateNotification).mockRejectedValue(
        new ApiError('UNAUTHORIZED', HTTP_STATUS.FORBIDDEN, 'Unauthorized'),
      )

      const request = new NextRequest(
        'http://localhost/api/notifications/notif-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ title: 'Hacked' }),
        },
      )

      const response = await controller.updateNotification(
        'notif-1',
        'user-2',
        request,
      )

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockMarked: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockService.markAsRead).mockResolvedValue(mockMarked)

      const response = await controller.markAsRead('notif-1', 'user-1')
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data.read).toBe(true)
    })

    it('should handle not found error', async () => {
      vi.mocked(mockService.markAsRead).mockRejectedValue(
        new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Not found'),
      )

      const response = await controller.markAsRead('notif-1', 'user-1')

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should be idempotent', async () => {
      const mockMarked: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockService.markAsRead).mockResolvedValue(mockMarked)

      const response1 = await controller.markAsRead('notif-1', 'user-1')
      const response2 = await controller.markAsRead('notif-1', 'user-1')

      expect(response1.status).toBe(HTTP_STATUS.OK)
      expect(response2.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      vi.mocked(mockService.markMultipleAsRead).mockResolvedValue({ count: 3 })

      const request = new NextRequest(
        'http://localhost/api/notifications/mark-read',
        {
          method: 'POST',
          body: JSON.stringify({
            notificationIds: ['notif-1', 'notif-2', 'notif-3'],
          }),
        },
      )

      const response = await controller.markMultipleAsRead('user-1', request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data.count).toBe(3)
    })

    it('should return BAD_REQUEST when notificationIds is not array', async () => {
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

    it('should return BAD_REQUEST when notificationIds is missing', async () => {
      const request = new NextRequest(
        'http://localhost/api/notifications/mark-read',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      )

      const response = await controller.markMultipleAsRead('user-1', request)

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should handle empty array', async () => {
      vi.mocked(mockService.markMultipleAsRead).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          'Empty array',
        ),
      )

      const request = new NextRequest(
        'http://localhost/api/notifications/mark-read',
        {
          method: 'POST',
          body: JSON.stringify({
            notificationIds: [],
          }),
        },
      )

      const response = await controller.markMultipleAsRead('user-1', request)

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should handle very large array', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => `notif-${i}`)

      vi.mocked(mockService.markMultipleAsRead).mockResolvedValue({
        count: 10000,
      })

      const request = new NextRequest(
        'http://localhost/api/notifications/mark-read',
        {
          method: 'POST',
          body: JSON.stringify({
            notificationIds: largeArray,
          }),
        },
      )

      const response = await controller.markMultipleAsRead('user-1', request)
      const data = await response.json()

      expect(data.data.count).toBe(10000)
    })

    it('should handle IDs with SQL injection attempts', async () => {
      const maliciousIds = ["'; DROP TABLE notifications; --", 'notif-2']

      vi.mocked(mockService.markMultipleAsRead).mockResolvedValue({ count: 2 })

      const request = new NextRequest(
        'http://localhost/api/notifications/mark-read',
        {
          method: 'POST',
          body: JSON.stringify({
            notificationIds: maliciousIds,
          }),
        },
      )

      await controller.markMultipleAsRead('user-1', request)

      expect(mockService.markMultipleAsRead).toHaveBeenCalledWith(
        maliciousIds,
        'user-1',
      )
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(mockService.markAllAsRead).mockResolvedValue({ count: 15 })

      const response = await controller.markAllAsRead('user-1')
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data.count).toBe(15)
    })

    it('should return 0 when no unread notifications', async () => {
      vi.mocked(mockService.markAllAsRead).mockResolvedValue({ count: 0 })

      const response = await controller.markAllAsRead('user-1')
      const data = await response.json()

      expect(data.data.count).toBe(0)
    })

    it('should be idempotent', async () => {
      vi.mocked(mockService.markAllAsRead)
        .mockResolvedValueOnce({ count: 15 })
        .mockResolvedValueOnce({ count: 0 })

      const response1 = await controller.markAllAsRead('user-1')
      const response2 = await controller.markAllAsRead('user-1')

      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(data1.data.count).toBe(15)
      expect(data2.data.count).toBe(0)
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      vi.mocked(mockService.deleteNotification).mockResolvedValue()

      const response = await controller.deleteNotification('notif-1', 'user-1')
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data.message).toContain('succès')
    })

    it('should handle not found error', async () => {
      vi.mocked(mockService.deleteNotification).mockRejectedValue(
        new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Not found'),
      )

      const response = await controller.deleteNotification('notif-1', 'user-1')

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should handle unauthorized delete attempt', async () => {
      vi.mocked(mockService.deleteNotification).mockRejectedValue(
        new ApiError('UNAUTHORIZED', HTTP_STATUS.FORBIDDEN, 'Unauthorized'),
      )

      const response = await controller.deleteNotification('notif-1', 'user-2')

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      vi.mocked(mockService.getUnreadCount).mockResolvedValue(5)

      const response = await controller.getUnreadCount('user-1')
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data.count).toBe(5)
    })

    it('should return 0 when no unread notifications', async () => {
      vi.mocked(mockService.getUnreadCount).mockResolvedValue(0)

      const response = await controller.getUnreadCount('user-1')
      const data = await response.json()

      expect(data.data.count).toBe(0)
    })
  })

  describe('Concurrency & Race Conditions', () => {
    it('should handle concurrent markAsRead requests', async () => {
      const mockMarked: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockService.markAsRead).mockResolvedValue(mockMarked)

      const [response1, response2] = await Promise.all([
        controller.markAsRead('notif-1', 'user-1'),
        controller.markAsRead('notif-1', 'user-1'),
      ])

      expect(response1.status).toBe(HTTP_STATUS.OK)
      expect(response2.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle concurrent delete requests', async () => {
      vi.mocked(mockService.deleteNotification)
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(
          new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Not found'),
        )

      const [response1, response2] = await Promise.all([
        controller.deleteNotification('notif-1', 'user-1'),
        controller.deleteNotification('notif-1', 'user-1'),
      ])

      expect(response1.status).toBe(HTTP_STATUS.OK)
      expect(response2.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })
})

describe('NotificationAdminController - Deep Tests', () => {
  let adminController: NotificationAdminController
  let mockService: NotificationService

  beforeEach(() => {
    mockService = {
      sendBulkNotification: vi.fn(),
      getTargetedUserCount: vi.fn(),
      getAdminNotifications: vi.fn(),
      getStats: vi.fn(),
      deleteNotificationAdmin: vi.fn(),
    } as any

    adminController = new NotificationAdminController(mockService)
    vi.clearAllMocks()
  })

  describe('sendBulkNotification', () => {
    it('should send bulk notification successfully', async () => {
      const mockResult = {
        count: 100,
        notifications: [],
      }

      vi.mocked(mockService.sendBulkNotification).mockResolvedValue(mockResult)

      const bulkData: BulkNotificationDTO = {
        type: 'system',
        title: 'System Update',
        description: 'New features available',
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
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.data.count).toBe(100)
    })

    it('should handle XSS payload in bulk notification', async () => {
      const xssTitle = '<script>alert("XSS")</script>'

      const mockResult = {
        count: 1,
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

    it('should handle very large recipient list', async () => {
      const mockResult = {
        count: 50000,
        notifications: [],
      }

      vi.mocked(mockService.sendBulkNotification).mockResolvedValue(mockResult)

      const bulkData: BulkNotificationDTO = {
        type: 'marketing',
        title: 'Mass Campaign',
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

      const response = await adminController.sendBulkNotification(request)
      const data = await response.json()

      expect(data.data.count).toBe(50000)
    })

    it('should handle targeting by subscription status', async () => {
      const mockResult = {
        count: 25,
        notifications: [],
      }

      vi.mocked(mockService.sendBulkNotification).mockResolvedValue(mockResult)

      const bulkData: BulkNotificationDTO = {
        type: 'marketing',
        title: 'Premium Feature',
        description: 'Desc',
        targeting: {
          filters: {
            subscriptionStatus: 'active',
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

    it('should handle specific user IDs targeting', async () => {
      const mockResult = {
        count: 3,
        notifications: [],
      }

      vi.mocked(mockService.sendBulkNotification).mockResolvedValue(mockResult)

      const bulkData: BulkNotificationDTO = {
        type: 'custom',
        title: 'Targeted',
        description: 'Desc',
        targeting: {
          filters: {
            userIds: ['user-1', 'user-2', 'user-3'],
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

    it('should handle invalid JSON', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/notifications/bulk',
        {
          method: 'POST',
          body: 'invalid json {',
        },
      )

      const response = await adminController.sendBulkNotification(request)

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('getTargetedUserCount', () => {
    it('should return targeted user count', async () => {
      vi.mocked(mockService.getTargetedUserCount).mockResolvedValue(150)

      const filters: UserTargetingFilters = {
        subscriptionStatus: 'active',
      }

      const request = new NextRequest(
        'http://localhost/api/admin/notifications/count',
        {
          method: 'POST',
          body: JSON.stringify({ filters }),
        },
      )

      const response = await adminController.getTargetedUserCount(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data.count).toBe(150)
    })

    it('should handle empty filters', async () => {
      vi.mocked(mockService.getTargetedUserCount).mockResolvedValue(1000)

      const request = new NextRequest(
        'http://localhost/api/admin/notifications/count',
        {
          method: 'POST',
          body: JSON.stringify({ filters: {} }),
        },
      )

      const response = await adminController.getTargetedUserCount(request)
      const data = await response.json()

      expect(data.data.count).toBe(1000)
    })
  })

  describe('getAdminNotifications', () => {
    it('should return admin notifications with filters', async () => {
      const mockResult = {
        notifications: [],
        total: 500,
      }

      vi.mocked(mockService.getAdminNotifications).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost/api/admin/notifications?type=security&limit=50&offset=0',
      )

      const response = await adminController.getAdminNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data).toEqual(mockResult)
    })

    it('should parse date filters correctly', async () => {
      const mockResult = {
        notifications: [],
        total: 100,
      }

      vi.mocked(mockService.getAdminNotifications).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost/api/admin/notifications?dateFrom=2024-01-01&dateTo=2024-12-31',
      )

      await adminController.getAdminNotifications(request)

      expect(mockService.getAdminNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: expect.any(Date),
          dateTo: expect.any(Date),
        }),
      )
    })

    it('should handle invalid date format', async () => {
      const mockResult = {
        notifications: [],
        total: 0,
      }

      vi.mocked(mockService.getAdminNotifications).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost/api/admin/notifications?dateFrom=invalid-date',
      )

      await adminController.getAdminNotifications(request)

      expect(mockService.getAdminNotifications).toHaveBeenCalled()
    })
  })

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      const mockStats = {
        totalSent: 1000,
        totalRead: 750,
        totalUnread: 250,
        readRate: 75,
        byType: {
          security: 200,
          activity: 300,
          system: 500,
        },
      }

      vi.mocked(mockService.getStats).mockResolvedValue(mockStats)

      const request = new NextRequest(
        'http://localhost/api/admin/notifications/stats',
      )

      const response = await adminController.getStats(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data).toEqual(mockStats)
    })

    it('should handle empty stats', async () => {
      const mockStats = {
        totalSent: 0,
        totalRead: 0,
        totalUnread: 0,
        readRate: 0,
        byType: {},
      }

      vi.mocked(mockService.getStats).mockResolvedValue(mockStats)

      const request = new NextRequest(
        'http://localhost/api/admin/notifications/stats',
      )

      const response = await adminController.getStats(request)
      const data = await response.json()

      expect(data.data.totalSent).toBe(0)
    })
  })

  describe('deleteNotification (admin)', () => {
    it('should delete notification as admin', async () => {
      vi.mocked(mockService.deleteNotificationAdmin).mockResolvedValue()

      const response = await adminController.deleteNotification('notif-1')
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.data.message).toContain('succès')
    })

    it('should handle not found error', async () => {
      vi.mocked(mockService.deleteNotificationAdmin).mockRejectedValue(
        new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Not found'),
      )

      const response = await adminController.deleteNotification('notif-1')

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })
})
