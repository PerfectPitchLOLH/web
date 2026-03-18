// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { NotificationRepository } from '../notification.repository'
import { NotificationService } from '../notification.service'
import type {
  BulkNotificationDTO,
  CreateNotificationDTO,
  NotificationEntity,
  NotificationFilters,
  UpdateNotificationDTO,
  UserTargetingFilters,
} from '../notification.types'

vi.mock('@/server/lib/database', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('NotificationService - Deep Tests', () => {
  let service: NotificationService
  let mockRepository: NotificationRepository

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      count: vi.fn(),
      countUnread: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      markAsRead: vi.fn(),
      markMultipleAsRead: vi.fn(),
      markAllAsReadForUser: vi.fn(),
      delete: vi.fn(),
      deleteMultiple: vi.fn(),
      deleteAllForUser: vi.fn(),
      bulkCreate: vi.fn(),
      findAllAdmin: vi.fn(),
      countAdmin: vi.fn(),
      getStats: vi.fn(),
    } as any

    service = new NotificationService(mockRepository)
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('should return notifications with total and unread count', async () => {
      const filters: NotificationFilters = { userId: 'user-1' }
      const mockNotifications: NotificationEntity[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'security',
          title: 'Test',
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.findByUserId).mockResolvedValue(
        mockNotifications,
      )
      vi.mocked(mockRepository.count).mockResolvedValue(10)
      vi.mocked(mockRepository.countUnread).mockResolvedValue(5)

      const result = await service.getNotifications(filters)

      expect(result).toEqual({
        notifications: mockNotifications,
        total: 10,
        unreadCount: 5,
      })
    })

    it('should handle empty result set', async () => {
      const filters: NotificationFilters = { userId: 'user-1' }

      vi.mocked(mockRepository.findByUserId).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)
      vi.mocked(mockRepository.countUnread).mockResolvedValue(0)

      const result = await service.getNotifications(filters)

      expect(result.notifications).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.unreadCount).toBe(0)
    })

    it('should handle repository errors', async () => {
      const filters: NotificationFilters = { userId: 'user-1' }

      vi.mocked(mockRepository.findByUserId).mockRejectedValue(
        new Error('Database error'),
      )

      await expect(service.getNotifications(filters)).rejects.toThrow(
        'Database error',
      )
    })

    it('should pass filters correctly', async () => {
      const filters: NotificationFilters = {
        userId: 'user-1',
        read: true,
        type: 'security',
        limit: 50,
        offset: 10,
      }

      vi.mocked(mockRepository.findByUserId).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)
      vi.mocked(mockRepository.countUnread).mockResolvedValue(0)

      await service.getNotifications(filters)

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(filters)
    })
  })

  describe('getNotificationById', () => {
    it('should return notification when found and authorized', async () => {
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

      const result = await service.getNotificationById('notif-1', 'user-1')

      expect(result).toEqual(mockNotification)
    })

    it('should throw NOT_FOUND when notification does not exist', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.getNotificationById('notif-1', 'user-1'),
      ).rejects.toThrow(ApiError)

      try {
        await service.getNotificationById('notif-1', 'user-1')
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND')
        expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })

    it('should throw FORBIDDEN when userId does not match', async () => {
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
        service.getNotificationById('notif-1', 'user-2'),
      ).rejects.toThrow(ApiError)

      try {
        await service.getNotificationById('notif-1', 'user-2')
      } catch (error: any) {
        expect(error.code).toBe('UNAUTHORIZED')
        expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN)
      }
    })

    it('should handle empty userId', async () => {
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

      await expect(service.getNotificationById('notif-1', '')).rejects.toThrow(
        ApiError,
      )
    })

    it('should handle malicious userId with SQL injection attempt', async () => {
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
        service.getNotificationById('notif-1', "' OR '1'='1"),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('createNotification', () => {
    it('should create notification with default icon', async () => {
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
      }

      const mockCreated: NotificationEntity = {
        id: 'notif-1',
        ...data,
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated)

      const result = await service.createNotification(data)

      expect(result).toEqual(mockCreated)
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...data,
        icon: 'Shield',
        read: false,
      })
    })

    it('should use provided icon when specified', async () => {
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'CustomIcon',
      }

      const mockCreated: NotificationEntity = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated)

      const result = await service.createNotification(data)

      expect(result.icon).toBe('CustomIcon')
    })

    it('should handle empty title (boundary)', async () => {
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: '',
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated: NotificationEntity = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated)

      const result = await service.createNotification(data)

      expect(result.title).toBe('')
    })

    it('should handle very long title (boundary)', async () => {
      const longTitle = 'a'.repeat(10000)
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: longTitle,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated: NotificationEntity = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated)

      const result = await service.createNotification(data)

      expect(result.title).toBe(longTitle)
    })

    it('should handle XSS payload in title', async () => {
      const xssTitle = '<script>alert("XSS")</script>'
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: xssTitle,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated: NotificationEntity = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated)

      const result = await service.createNotification(data)

      expect(result.title).toBe(xssTitle)
    })

    it('should handle Unicode and emojis', async () => {
      const unicodeTitle = '通知 🔔 Notification ñ'
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: unicodeTitle,
        description: 'Desc',
        icon: 'Shield',
      }

      const mockCreated: NotificationEntity = {
        id: 'notif-1',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated)

      const result = await service.createNotification(data)

      expect(result.title).toBe(unicodeTitle)
    })

    it('should preserve read status when provided', async () => {
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: true,
      }

      const mockCreated: NotificationEntity = {
        id: 'notif-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated)

      const result = await service.createNotification(data)

      expect(result.read).toBe(true)
    })
  })

  describe('updateNotification', () => {
    it('should update notification successfully', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Original',
        description: 'Original Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updateData: UpdateNotificationDTO = {
        title: 'Updated',
      }

      const mockUpdated: NotificationEntity = {
        ...mockNotification,
        title: 'Updated',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockNotification)
      vi.mocked(mockRepository.update).mockResolvedValue(mockUpdated)

      const result = await service.updateNotification(
        'notif-1',
        'user-1',
        updateData,
      )

      expect(result.title).toBe('Updated')
    })

    it('should throw when notification not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.updateNotification('notif-1', 'user-1', { title: 'Updated' }),
      ).rejects.toThrow(ApiError)
    })

    it('should throw when user not authorized', async () => {
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
        service.updateNotification('notif-1', 'user-2', { title: 'Updated' }),
      ).rejects.toThrow(ApiError)
    })

    it('should throw INTERNAL_ERROR when update fails', async () => {
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
      vi.mocked(mockRepository.update).mockResolvedValue(null)

      await expect(
        service.updateNotification('notif-1', 'user-1', { title: 'Updated' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.updateNotification('notif-1', 'user-1', {
          title: 'Updated',
        })
      } catch (error: any) {
        expect(error.code).toBe('INTERNAL_ERROR')
        expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
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

      const result = await service.markAsRead('notif-1', 'user-1')

      expect(result.read).toBe(true)
    })

    it('should be idempotent (marking already read notification)', async () => {
      const mockNotification: NotificationEntity = {
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

      vi.mocked(mockRepository.findById).mockResolvedValue(mockNotification)
      vi.mocked(mockRepository.markAsRead).mockResolvedValue(mockNotification)

      const result = await service.markAsRead('notif-1', 'user-1')

      expect(result.read).toBe(true)
    })

    it('should throw when markAsRead fails', async () => {
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
      vi.mocked(mockRepository.markAsRead).mockResolvedValue(null)

      await expect(service.markAsRead('notif-1', 'user-1')).rejects.toThrow(
        ApiError,
      )
    })
  })

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const mockNotifications: NotificationEntity[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'security',
          title: 'Test 1',
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          type: 'activity',
          title: 'Test 2',
          description: 'Desc',
          icon: 'Activity',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.findById).mockImplementation(
        async (id: string) => {
          return mockNotifications.find((n) => n.id === id) || null
        },
      )

      vi.mocked(mockRepository.markMultipleAsRead).mockResolvedValue({
        count: 2,
      })

      const result = await service.markMultipleAsRead(
        ['notif-1', 'notif-2'],
        'user-1',
      )

      expect(result.count).toBe(2)
    })

    it('should filter out notifications not belonging to user', async () => {
      const mockNotifications: (NotificationEntity | null)[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'security',
          title: 'Test 1',
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-2',
          type: 'activity',
          title: 'Test 2',
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
        count: 1,
      })

      const result = await service.markMultipleAsRead(
        ['notif-1', 'notif-2'],
        'user-1',
      )

      expect(result.count).toBe(1)
      expect(mockRepository.markMultipleAsRead).toHaveBeenCalledWith([
        'notif-1',
      ])
    })

    it('should throw VALIDATION_ERROR when no valid notifications found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.markMultipleAsRead(['notif-1', 'notif-2'], 'user-1'),
      ).rejects.toThrow(ApiError)

      try {
        await service.markMultipleAsRead(['notif-1', 'notif-2'], 'user-1')
      } catch (error: any) {
        expect(error.code).toBe('VALIDATION_ERROR')
        expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST)
      }
    })

    it('should handle empty array', async () => {
      await expect(service.markMultipleAsRead([], 'user-1')).rejects.toThrow(
        ApiError,
      )
    })

    it('should handle very large array (stress test)', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `notif-${i}`)

      const mockNotifications: NotificationEntity[] = largeArray.map((id) => ({
        id,
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      vi.mocked(mockRepository.findById).mockImplementation(
        async (id: string) => {
          return mockNotifications.find((n) => n.id === id) || null
        },
      )

      vi.mocked(mockRepository.markMultipleAsRead).mockResolvedValue({
        count: 1000,
      })

      const result = await service.markMultipleAsRead(largeArray, 'user-1')

      expect(result.count).toBe(1000)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      vi.mocked(mockRepository.markAllAsReadForUser).mockResolvedValue({
        count: 10,
      })

      const result = await service.markAllAsRead('user-1')

      expect(result.count).toBe(10)
      expect(mockRepository.markAllAsReadForUser).toHaveBeenCalledWith('user-1')
    })

    it('should return 0 when no unread notifications', async () => {
      vi.mocked(mockRepository.markAllAsReadForUser).mockResolvedValue({
        count: 0,
      })

      const result = await service.markAllAsRead('user-1')

      expect(result.count).toBe(0)
    })

    it('should be idempotent', async () => {
      vi.mocked(mockRepository.markAllAsReadForUser)
        .mockResolvedValueOnce({ count: 10 })
        .mockResolvedValueOnce({ count: 0 })

      const result1 = await service.markAllAsRead('user-1')
      const result2 = await service.markAllAsRead('user-1')

      expect(result1.count).toBe(10)
      expect(result2.count).toBe(0)
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
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
      vi.mocked(mockRepository.delete).mockResolvedValue(true)

      await service.deleteNotification('notif-1', 'user-1')

      expect(mockRepository.delete).toHaveBeenCalledWith('notif-1')
    })

    it('should throw when notification not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.deleteNotification('notif-1', 'user-1'),
      ).rejects.toThrow(ApiError)
    })

    it('should throw when user not authorized', async () => {
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

    it('should throw INTERNAL_ERROR when delete fails', async () => {
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
      vi.mocked(mockRepository.delete).mockResolvedValue(false)

      await expect(
        service.deleteNotification('notif-1', 'user-1'),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('deleteNotificationAdmin', () => {
    it('should delete notification as admin', async () => {
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
      vi.mocked(mockRepository.delete).mockResolvedValue(true)

      await service.deleteNotificationAdmin('notif-1')

      expect(mockRepository.delete).toHaveBeenCalledWith('notif-1')
    })

    it('should throw NOT_FOUND when notification does not exist', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.deleteNotificationAdmin('notif-1')).rejects.toThrow(
        ApiError,
      )

      try {
        await service.deleteNotificationAdmin('notif-1')
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND')
      }
    })

    it('should throw INTERNAL_ERROR when delete fails', async () => {
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
      vi.mocked(mockRepository.delete).mockResolvedValue(false)

      await expect(service.deleteNotificationAdmin('notif-1')).rejects.toThrow(
        ApiError,
      )
    })
  })

  describe('deleteMultiple', () => {
    it('should delete multiple notifications', async () => {
      const mockNotifications: NotificationEntity[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'security',
          title: 'Test 1',
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          type: 'activity',
          title: 'Test 2',
          description: 'Desc',
          icon: 'Activity',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.findById).mockImplementation(
        async (id: string) => {
          return mockNotifications.find((n) => n.id === id) || null
        },
      )

      vi.mocked(mockRepository.deleteMultiple).mockResolvedValue({ count: 2 })

      const result = await service.deleteMultiple(
        ['notif-1', 'notif-2'],
        'user-1',
      )

      expect(result.count).toBe(2)
    })

    it('should filter out notifications not belonging to user', async () => {
      const mockNotifications: (NotificationEntity | null)[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'security',
          title: 'Test 1',
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-2',
          type: 'activity',
          title: 'Test 2',
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

      vi.mocked(mockRepository.deleteMultiple).mockResolvedValue({ count: 1 })

      const result = await service.deleteMultiple(
        ['notif-1', 'notif-2'],
        'user-1',
      )

      expect(result.count).toBe(1)
      expect(mockRepository.deleteMultiple).toHaveBeenCalledWith(['notif-1'])
    })

    it('should throw VALIDATION_ERROR when no valid notifications found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.deleteMultiple(['notif-1', 'notif-2'], 'user-1'),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      vi.mocked(mockRepository.countUnread).mockResolvedValue(5)

      const result = await service.getUnreadCount('user-1')

      expect(result).toBe(5)
    })

    it('should return 0 when no unread notifications', async () => {
      vi.mocked(mockRepository.countUnread).mockResolvedValue(0)

      const result = await service.getUnreadCount('user-1')

      expect(result).toBe(0)
    })
  })

  describe('sendBulkNotification - Edge Cases', () => {
    it('should send notification to all active users', async () => {
      const { db } = await import('@/server/lib/database')

      const data: BulkNotificationDTO = {
        type: 'system',
        title: 'System Update',
        description: 'New features available',
        targeting: {
          sendToAll: true,
        },
      }

      vi.mocked(db.user.findMany).mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ] as any)

      const mockCreated: NotificationEntity[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'system',
          title: 'System Update',
          description: 'New features available',
          icon: 'Bell',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-2',
          type: 'system',
          title: 'System Update',
          description: 'New features available',
          icon: 'Bell',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.bulkCreate).mockResolvedValue(mockCreated)

      const result = await service.sendBulkNotification(data)

      expect(result.count).toBe(2)
      expect(result.notifications).toHaveLength(2)
    })

    it('should throw VALIDATION_ERROR when no users match filters', async () => {
      const { db } = await import('@/server/lib/database')

      const data: BulkNotificationDTO = {
        type: 'system',
        title: 'Test',
        description: 'Test',
        targeting: {
          sendToAll: true,
        },
      }

      vi.mocked(db.user.findMany).mockResolvedValue([])

      await expect(service.sendBulkNotification(data)).rejects.toThrow(ApiError)

      try {
        await service.sendBulkNotification(data)
      } catch (error: any) {
        expect(error.code).toBe('VALIDATION_ERROR')
        expect(error.message).toContain('Aucun utilisateur correspondant')
      }
    })

    it('should handle XSS in bulk notification title', async () => {
      const { db } = await import('@/server/lib/database')

      const xssTitle = '<script>alert("XSS")</script>'
      const data: BulkNotificationDTO = {
        type: 'system',
        title: xssTitle,
        description: 'Desc',
        targeting: {
          sendToAll: true,
        },
      }

      vi.mocked(db.user.findMany).mockResolvedValue([{ id: 'user-1' }] as any)

      const mockCreated: NotificationEntity[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'system',
          title: xssTitle,
          description: 'Desc',
          icon: 'Bell',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.bulkCreate).mockResolvedValue(mockCreated)

      const result = await service.sendBulkNotification(data)

      expect(result.notifications[0].title).toBe(xssTitle)
    })

    it('should handle very large recipient list (stress test)', async () => {
      const { db } = await import('@/server/lib/database')

      const data: BulkNotificationDTO = {
        type: 'system',
        title: 'Mass Update',
        description: 'Desc',
        targeting: {
          sendToAll: true,
        },
      }

      const largeUserList = Array.from({ length: 10000 }, (_, i) => ({
        id: `user-${i}`,
      }))

      vi.mocked(db.user.findMany).mockResolvedValue(largeUserList as any)

      const mockCreated: NotificationEntity[] = largeUserList.map(
        (user, i) => ({
          id: `notif-${i}`,
          userId: user.id,
          type: 'system',
          title: 'Mass Update',
          description: 'Desc',
          icon: 'Bell',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      )

      vi.mocked(mockRepository.bulkCreate).mockResolvedValue(mockCreated)

      const result = await service.sendBulkNotification(data)

      expect(result.count).toBe(10000)
    })

    it('should filter by subscription status', async () => {
      const { db } = await import('@/server/lib/database')

      const data: BulkNotificationDTO = {
        type: 'marketing',
        title: 'Premium Feature',
        description: 'Desc',
        targeting: {
          filters: {
            subscriptionStatus: 'active',
          },
        },
      }

      vi.mocked(db.user.findMany).mockResolvedValue([{ id: 'user-1' }] as any)

      const mockCreated: NotificationEntity[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'marketing',
          title: 'Premium Feature',
          description: 'Desc',
          icon: 'Mail',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.bulkCreate).mockResolvedValue(mockCreated)

      await service.sendBulkNotification(data)

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subscriptions: {
              some: {
                status: 'active',
              },
            },
          }),
        }),
      )
    })

    it('should handle specific user IDs targeting', async () => {
      const { db } = await import('@/server/lib/database')

      const data: BulkNotificationDTO = {
        type: 'custom',
        title: 'Targeted Message',
        description: 'Desc',
        targeting: {
          filters: {
            userIds: ['user-1', 'user-2', 'user-3'],
          },
        },
      }

      const mockCreated: NotificationEntity[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'custom',
          title: 'Targeted Message',
          description: 'Desc',
          icon: 'Info',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.bulkCreate).mockResolvedValue(mockCreated)

      const result = await service.sendBulkNotification(data)

      expect(mockRepository.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1' }),
          expect.objectContaining({ userId: 'user-2' }),
          expect.objectContaining({ userId: 'user-3' }),
        ]),
      )
    })
  })

  describe('getTargetedUserCount', () => {
    it('should return count for sendToAll', async () => {
      const { db } = await import('@/server/lib/database')

      const filters: UserTargetingFilters = {}

      vi.mocked(db.user.count).mockResolvedValue(150)

      const result = await service.getTargetedUserCount(filters)

      expect(result).toBe(150)
    })

    it('should return count for specific userIds', async () => {
      const filters: UserTargetingFilters = {
        userIds: ['user-1', 'user-2', 'user-3'],
      }

      const result = await service.getTargetedUserCount(filters)

      expect(result).toBe(3)
    })

    it('should return count for subscription filters', async () => {
      const { db } = await import('@/server/lib/database')

      const filters: UserTargetingFilters = {
        subscriptionStatus: 'active',
      }

      vi.mocked(db.user.count).mockResolvedValue(75)

      const result = await service.getTargetedUserCount(filters)

      expect(result).toBe(75)
    })
  })

  describe('getAdminNotifications', () => {
    it('should return notifications with total count', async () => {
      const mockNotifications: NotificationEntity[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'security',
          title: 'Test',
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.findAllAdmin).mockResolvedValue(
        mockNotifications,
      )
      vi.mocked(mockRepository.countAdmin).mockResolvedValue(100)

      const result = await service.getAdminNotifications({})

      expect(result).toEqual({
        notifications: mockNotifications,
        total: 100,
      })
    })
  })

  describe('getStats', () => {
    it('should return stats with calculated readRate', async () => {
      const mockStats = {
        totalSent: 100,
        totalRead: 70,
        totalUnread: 30,
        byType: {
          security: 20,
          activity: 30,
          system: 50,
        },
      }

      vi.mocked(mockRepository.getStats).mockResolvedValue(mockStats)

      const result = await service.getStats()

      expect(result.readRate).toBe(70)
      expect(result.totalSent).toBe(100)
      expect(result.totalRead).toBe(70)
    })

    it('should handle zero totalSent (division by zero)', async () => {
      const mockStats = {
        totalSent: 0,
        totalRead: 0,
        totalUnread: 0,
        byType: {},
      }

      vi.mocked(mockRepository.getStats).mockResolvedValue(mockStats)

      const result = await service.getStats()

      expect(result.readRate).toBe(0)
    })

    it('should round readRate to 2 decimals', async () => {
      const mockStats = {
        totalSent: 3,
        totalRead: 2,
        totalUnread: 1,
        byType: {},
      }

      vi.mocked(mockRepository.getStats).mockResolvedValue(mockStats)

      const result = await service.getStats()

      expect(result.readRate).toBe(66.67)
    })
  })

  describe('Race Conditions & Concurrency', () => {
    it('should handle concurrent markAsRead calls on same notification', async () => {
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

    it('should handle concurrent delete calls', async () => {
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

      vi.mocked(mockRepository.delete)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      const results = await Promise.allSettled([
        service.deleteNotification('notif-1', 'user-1'),
        service.deleteNotification('notif-1', 'user-1'),
      ])

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    })
  })

  describe('Security - Authorization Bypass Attempts', () => {
    it('should prevent accessing notification with manipulated userId', async () => {
      const mockNotification: NotificationEntity = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Sensitive Data',
        description: 'Private information',
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

    it('should prevent marking other users notifications as read', async () => {
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
      ]

      vi.mocked(mockRepository.findById).mockImplementation(
        async (id: string) => {
          return mockNotifications.find((n) => n?.id === id) || null
        },
      )

      vi.mocked(mockRepository.markMultipleAsRead).mockResolvedValue({
        count: 1,
      })

      const result = await service.markMultipleAsRead(
        ['notif-1', 'notif-2'],
        'user-1',
      )

      expect(result.count).toBe(1)
      expect(mockRepository.markMultipleAsRead).toHaveBeenCalledWith([
        'notif-1',
      ])
    })
  })
})
