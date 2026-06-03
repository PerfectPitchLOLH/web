// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { NotificationRepository } from '../notification.repository'
import type {
  CreateNotificationDTO,
  NotificationFilters,
} from '../notification.types'

vi.mock('@/server/lib/database', () => ({
  db: {
    notification: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('NotificationRepository - Deep Tests', () => {
  let repository: NotificationRepository

  beforeEach(() => {
    repository = new NotificationRepository()
    vi.clearAllMocks()
  })

  describe('findById', () => {
    it('should find notification by ID', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Test',
        description: 'Test description',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.findUnique).mockResolvedValue(mockNotification)

      const result = await repository.findById('notif-1')

      expect(result).toEqual(mockNotification)
      expect(db.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      })
    })

    it('should return null when notification not found', async () => {
      vi.mocked(db.notification.findUnique).mockResolvedValue(null)

      const result = await repository.findById('non-existent')

      expect(result).toBeNull()
    })

    it('should handle empty string ID', async () => {
      vi.mocked(db.notification.findUnique).mockResolvedValue(null)

      const result = await repository.findById('')

      expect(result).toBeNull()
      expect(db.notification.findUnique).toHaveBeenCalledWith({
        where: { id: '' },
      })
    })

    it('should handle very long ID (boundary test)', async () => {
      const longId = 'a'.repeat(10000)
      vi.mocked(db.notification.findUnique).mockResolvedValue(null)

      const result = await repository.findById(longId)

      expect(result).toBeNull()
      expect(db.notification.findUnique).toHaveBeenCalledWith({
        where: { id: longId },
      })
    })

    it('should handle ID with special characters', async () => {
      const specialId = "'; DROP TABLE notifications; --"
      vi.mocked(db.notification.findUnique).mockResolvedValue(null)

      const result = await repository.findById(specialId)

      expect(result).toBeNull()
    })

    it('should handle ID with Unicode characters', async () => {
      const unicodeId = '通知-123-🔔'
      const mockNotif = {
        id: unicodeId,
        userId: 'user-1',
        type: 'system',
        title: 'Test',
        description: 'Test',
        icon: 'Bell',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(db.notification.findUnique).mockResolvedValue(mockNotif)

      const result = await repository.findById(unicodeId)

      expect(result).toEqual(mockNotif)
    })

    it('should handle database connection error', async () => {
      vi.mocked(db.notification.findUnique).mockRejectedValue(
        new Error('Database connection lost'),
      )

      await expect(repository.findById('notif-1')).rejects.toThrow(
        'Database connection lost',
      )
    })

    it('should handle database timeout', async () => {
      vi.mocked(db.notification.findUnique).mockRejectedValue(
        new Error('Query timeout'),
      )

      await expect(repository.findById('notif-1')).rejects.toThrow(
        'Query timeout',
      )
    })
  })

  describe('findByUserId', () => {
    it('should apply default limit when not specified', async () => {
      const filters: NotificationFilters = { userId: 'user-1' }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })
    })

    it('should enforce MAX_LIMIT cap (100)', async () => {
      const filters: NotificationFilters = { userId: 'user-1', limit: 500 }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      )
    })

    it('should handle limit = 0 (boundary)', async () => {
      const filters: NotificationFilters = { userId: 'user-1', limit: 0 }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 0,
        }),
      )
    })

    it('should handle negative limit (boundary)', async () => {
      const filters: NotificationFilters = { userId: 'user-1', limit: -10 }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: -10,
        }),
      )
    })

    it('should apply offset correctly', async () => {
      const filters: NotificationFilters = { userId: 'user-1', offset: 50 }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
        }),
      )
    })

    it('should filter by read status (true)', async () => {
      const filters: NotificationFilters = { userId: 'user-1', read: true }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', read: true },
        }),
      )
    })

    it('should filter by read status (false)', async () => {
      const filters: NotificationFilters = { userId: 'user-1', read: false }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', read: false },
        }),
      )
    })

    it('should filter by type', async () => {
      const filters: NotificationFilters = {
        userId: 'user-1',
        type: 'security',
      }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', type: 'security' },
        }),
      )
    })

    it('should combine all filters', async () => {
      const filters: NotificationFilters = {
        userId: 'user-1',
        read: true,
        type: 'marketing',
        limit: 10,
        offset: 20,
      }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: true, type: 'marketing' },
        orderBy: { createdAt: 'desc' },
        skip: 20,
        take: 10,
      })
    })

    it('should handle empty userId', async () => {
      const filters: NotificationFilters = { userId: '' }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: '' }),
        }),
      )
    })

    it('should handle userId with SQL injection attempt', async () => {
      const filters: NotificationFilters = { userId: "' OR '1'='1" }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "' OR '1'='1" }),
        }),
      )
    })

    it('should handle very large offset (boundary)', async () => {
      const filters: NotificationFilters = {
        userId: 'user-1',
        offset: 999999999,
      }
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findByUserId(filters)

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 999999999,
        }),
      )
    })
  })

  describe('count', () => {
    it('should count all notifications for user', async () => {
      const filters: NotificationFilters = { userId: 'user-1' }
      vi.mocked(db.notification.count).mockResolvedValue(42)

      const result = await repository.count(filters)

      expect(result).toBe(42)
      expect(db.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
    })

    it('should count with read filter', async () => {
      const filters: NotificationFilters = { userId: 'user-1', read: true }
      vi.mocked(db.notification.count).mockResolvedValue(10)

      const result = await repository.count(filters)

      expect(result).toBe(10)
      expect(db.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: true },
      })
    })

    it('should count with type filter', async () => {
      const filters: NotificationFilters = {
        userId: 'user-1',
        type: 'security',
      }
      vi.mocked(db.notification.count).mockResolvedValue(5)

      const result = await repository.count(filters)

      expect(result).toBe(5)
    })

    it('should return 0 when no notifications exist', async () => {
      const filters: NotificationFilters = { userId: 'user-1' }
      vi.mocked(db.notification.count).mockResolvedValue(0)

      const result = await repository.count(filters)

      expect(result).toBe(0)
    })

    it('should handle database error during count', async () => {
      const filters: NotificationFilters = { userId: 'user-1' }
      vi.mocked(db.notification.count).mockRejectedValue(
        new Error('Count failed'),
      )

      await expect(repository.count(filters)).rejects.toThrow('Count failed')
    })
  })

  describe('create', () => {
    it('should create notification with all fields', async () => {
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'security',
        title: 'Security Alert',
        description: 'Your password was changed',
        icon: 'Shield',
        read: false,
      }

      const mockCreated = {
        id: 'notif-new',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result).toEqual(mockCreated)
      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'security',
          title: 'Security Alert',
          description: 'Your password was changed',
          icon: 'Shield',
          read: false,
        },
      })
    })

    it('should default read to false when undefined', async () => {
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'system',
        title: 'Title',
        description: 'Desc',
        icon: 'Bell',
      }

      const mockCreated = {
        id: 'notif-new',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      await repository.create(data)

      expect(db.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          read: false,
        }),
      })
    })

    it('should handle empty title (boundary)', async () => {
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'system',
        title: '',
        description: 'Desc',
        icon: 'Bell',
      }

      const mockCreated = {
        id: 'notif-new',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe('')
    })

    it('should handle very long title (boundary)', async () => {
      const longTitle = 'a'.repeat(10000)
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'system',
        title: longTitle,
        description: 'Desc',
        icon: 'Bell',
      }

      const mockCreated = {
        id: 'notif-new',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(longTitle)
    })

    it('should handle title with XSS payload', async () => {
      const xssTitle = '<script>alert("XSS")</script>'
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'system',
        title: xssTitle,
        description: 'Desc',
        icon: 'Bell',
      }

      const mockCreated = {
        id: 'notif-new',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(xssTitle)
    })

    it('should handle Unicode and emoji in title', async () => {
      const unicodeTitle = '通知 🔔 Notification ñ'
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'system',
        title: unicodeTitle,
        description: 'Desc',
        icon: 'Bell',
      }

      const mockCreated = {
        id: 'notif-new',
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.create).mockResolvedValue(mockCreated)

      const result = await repository.create(data)

      expect(result.title).toBe(unicodeTitle)
    })

    it('should handle database constraint violation (e.g., invalid userId FK)', async () => {
      const data: CreateNotificationDTO = {
        userId: 'non-existent-user',
        type: 'system',
        title: 'Title',
        description: 'Desc',
        icon: 'Bell',
      }

      vi.mocked(db.notification.create).mockRejectedValue(
        new Error('Foreign key constraint failed'),
      )

      await expect(repository.create(data)).rejects.toThrow(
        'Foreign key constraint failed',
      )
    })

    it('should handle database deadlock', async () => {
      const data: CreateNotificationDTO = {
        userId: 'user-1',
        type: 'system',
        title: 'Title',
        description: 'Desc',
        icon: 'Bell',
      }

      vi.mocked(db.notification.create).mockRejectedValue(
        new Error('Deadlock detected'),
      )

      await expect(repository.create(data)).rejects.toThrow('Deadlock detected')
    })
  })

  describe('update', () => {
    it('should update notification successfully', async () => {
      const updatedData = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security' as const,
        title: 'Updated Title',
        description: 'Updated Desc',
        icon: 'Shield',
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.update).mockResolvedValue(updatedData)

      const result = await repository.update('notif-1', {
        title: 'Updated Title',
      })

      expect(result).toEqual(updatedData)
    })

    it('should return null when notification not found', async () => {
      vi.mocked(db.notification.update).mockRejectedValue(
        new Error('Record not found'),
      )

      const result = await repository.update('non-existent', {
        title: 'Updated',
      })

      expect(result).toBeNull()
    })

    it('should catch any database error and return null', async () => {
      vi.mocked(db.notification.update).mockRejectedValue(new Error('DB error'))

      const result = await repository.update('notif-1', { title: 'Updated' })

      expect(result).toBeNull()
    })

    it('should handle partial update (only title)', async () => {
      const updatedData = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security' as const,
        title: 'Only Title Updated',
        description: 'Original Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.update).mockResolvedValue(updatedData)

      const result = await repository.update('notif-1', {
        title: 'Only Title Updated',
      })

      expect(result?.title).toBe('Only Title Updated')
    })

    it('should handle empty update object', async () => {
      const originalData = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security' as const,
        title: 'Original',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.update).mockResolvedValue(originalData)

      const result = await repository.update('notif-1', {})

      expect(result).toEqual(originalData)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const markedData = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security' as const,
        title: 'Title',
        description: 'Desc',
        icon: 'Shield',
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.update).mockResolvedValue(markedData)

      const result = await repository.markAsRead('notif-1')

      expect(result?.read).toBe(true)
      expect(db.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { read: true },
      })
    })

    it('should return null if notification not found', async () => {
      vi.mocked(db.notification.update).mockRejectedValue(
        new Error('Record not found'),
      )

      const result = await repository.markAsRead('non-existent')

      expect(result).toBeNull()
    })

    it('should be idempotent (marking already read notification)', async () => {
      const alreadyRead = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security' as const,
        title: 'Title',
        description: 'Desc',
        icon: 'Shield',
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.update).mockResolvedValue(alreadyRead)

      const result = await repository.markAsRead('notif-1')

      expect(result?.read).toBe(true)
    })
  })

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 3 })

      const result = await repository.markMultipleAsRead([
        'notif-1',
        'notif-2',
        'notif-3',
      ])

      expect(result.count).toBe(3)
      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['notif-1', 'notif-2', 'notif-3'] } },
        data: { read: true },
      })
    })

    it('should handle empty array', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 0 })

      const result = await repository.markMultipleAsRead([])

      expect(result.count).toBe(0)
    })

    it('should handle single ID', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 1 })

      const result = await repository.markMultipleAsRead(['notif-1'])

      expect(result.count).toBe(1)
    })

    it('should handle very large array (stress test)', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => `notif-${i}`)
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 10000 })

      const result = await repository.markMultipleAsRead(largeArray)

      expect(result.count).toBe(10000)
    })

    it('should handle IDs with special characters', async () => {
      const specialIds = ["'; DROP TABLE notifications; --", 'notif-2']
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 2 })

      const result = await repository.markMultipleAsRead(specialIds)

      expect(result.count).toBe(2)
    })

    it('should return 0 when no matching notifications', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 0 })

      const result = await repository.markMultipleAsRead(['non-existent'])

      expect(result.count).toBe(0)
    })
  })

  describe('markAllAsReadForUser', () => {
    it('should mark all unread notifications as read for user', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 15 })

      const result = await repository.markAllAsReadForUser('user-1')

      expect(result.count).toBe(15)
      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true },
      })
    })

    it('should return 0 when user has no unread notifications', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 0 })

      const result = await repository.markAllAsReadForUser('user-1')

      expect(result.count).toBe(0)
    })

    it('should handle empty userId', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 0 })

      const result = await repository.markAllAsReadForUser('')

      expect(result.count).toBe(0)
    })

    it('should be idempotent', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValueOnce({ count: 5 })
      vi.mocked(db.notification.updateMany).mockResolvedValueOnce({ count: 0 })

      const result1 = await repository.markAllAsReadForUser('user-1')
      const result2 = await repository.markAllAsReadForUser('user-1')

      expect(result1.count).toBe(5)
      expect(result2.count).toBe(0)
    })
  })

  describe('delete', () => {
    it('should delete notification successfully', async () => {
      vi.mocked(db.notification.delete).mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        type: 'security',
        title: 'Title',
        description: 'Desc',
        icon: 'Shield',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await repository.delete('notif-1')

      expect(result).toBe(true)
      expect(db.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      })
    })

    it('should return false when notification not found', async () => {
      vi.mocked(db.notification.delete).mockRejectedValue(
        new Error('Record not found'),
      )

      const result = await repository.delete('non-existent')

      expect(result).toBe(false)
    })

    it('should return false on any database error', async () => {
      vi.mocked(db.notification.delete).mockRejectedValue(
        new Error('Foreign key constraint'),
      )

      const result = await repository.delete('notif-1')

      expect(result).toBe(false)
    })

    it('should handle empty ID', async () => {
      vi.mocked(db.notification.delete).mockRejectedValue(
        new Error('Invalid ID'),
      )

      const result = await repository.delete('')

      expect(result).toBe(false)
    })
  })

  describe('deleteMultiple', () => {
    it('should delete multiple notifications', async () => {
      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 3 })

      const result = await repository.deleteMultiple([
        'notif-1',
        'notif-2',
        'notif-3',
      ])

      expect(result.count).toBe(3)
      expect(db.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['notif-1', 'notif-2', 'notif-3'] } },
      })
    })

    it('should handle empty array', async () => {
      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 0 })

      const result = await repository.deleteMultiple([])

      expect(result.count).toBe(0)
    })

    it('should handle very large array', async () => {
      const largeArray = Array.from({ length: 5000 }, (_, i) => `notif-${i}`)
      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 5000 })

      const result = await repository.deleteMultiple(largeArray)

      expect(result.count).toBe(5000)
    })

    it('should return 0 when no matching notifications', async () => {
      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 0 })

      const result = await repository.deleteMultiple(['non-existent'])

      expect(result.count).toBe(0)
    })
  })

  describe('deleteAllForUser', () => {
    it('should delete all notifications for user', async () => {
      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 42 })

      const result = await repository.deleteAllForUser('user-1')

      expect(result.count).toBe(42)
      expect(db.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
    })

    it('should return 0 when user has no notifications', async () => {
      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 0 })

      const result = await repository.deleteAllForUser('user-without-notifs')

      expect(result.count).toBe(0)
    })

    it('should handle empty userId', async () => {
      vi.mocked(db.notification.deleteMany).mockResolvedValue({ count: 0 })

      const result = await repository.deleteAllForUser('')

      expect(result.count).toBe(0)
    })
  })

  describe('bulkCreate', () => {
    it('should create multiple notifications in transaction', async () => {
      const notifications: CreateNotificationDTO[] = [
        {
          userId: 'user-1',
          type: 'security',
          title: 'Notif 1',
          description: 'Desc 1',
          icon: 'Shield',
        },
        {
          userId: 'user-2',
          type: 'activity',
          title: 'Notif 2',
          description: 'Desc 2',
          icon: 'Activity',
        },
      ]

      const mockCreated = notifications.map((n, i) => ({
        id: `notif-${i}`,
        ...n,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      vi.mocked(db.$transaction).mockResolvedValue(mockCreated)

      const result = await repository.bulkCreate(notifications)

      expect(result).toEqual(mockCreated)
      expect(db.$transaction).toHaveBeenCalled()
    })

    it('should handle empty array', async () => {
      vi.mocked(db.$transaction).mockResolvedValue([])

      const result = await repository.bulkCreate([])

      expect(result).toEqual([])
    })

    it('should handle very large bulk create (stress test)', async () => {
      const largeArray: CreateNotificationDTO[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          userId: `user-${i}`,
          type: 'system',
          title: `Notif ${i}`,
          description: `Desc ${i}`,
          icon: 'Bell',
        }),
      )

      const mockCreated = largeArray.map((n, i) => ({
        id: `notif-${i}`,
        ...n,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      vi.mocked(db.$transaction).mockResolvedValue(mockCreated)

      const result = await repository.bulkCreate(largeArray)

      expect(result).toHaveLength(1000)
    })

    it('should rollback on transaction failure', async () => {
      const notifications: CreateNotificationDTO[] = [
        {
          userId: 'user-1',
          type: 'security',
          title: 'Notif 1',
          description: 'Desc 1',
          icon: 'Shield',
        },
      ]

      vi.mocked(db.$transaction).mockRejectedValue(
        new Error('Transaction failed'),
      )

      await expect(repository.bulkCreate(notifications)).rejects.toThrow(
        'Transaction failed',
      )
    })

    it('should handle constraint violation during bulk create', async () => {
      const notifications: CreateNotificationDTO[] = [
        {
          userId: 'non-existent-user',
          type: 'security',
          title: 'Notif',
          description: 'Desc',
          icon: 'Shield',
        },
      ]

      vi.mocked(db.$transaction).mockRejectedValue(
        new Error('Foreign key constraint failed'),
      )

      await expect(repository.bulkCreate(notifications)).rejects.toThrow(
        'Foreign key constraint failed',
      )
    })
  })

  describe('findAllAdmin', () => {
    it('should return all notifications without filters', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'security',
          title: 'Title 1',
          description: 'Desc 1',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(db.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await repository.findAllAdmin({})

      expect(result).toEqual(mockNotifications)
    })

    it('should filter by type', async () => {
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findAllAdmin({ type: 'security' })

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'security' },
        }),
      )
    })

    it('should filter by date range', async () => {
      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-12-31')

      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findAllAdmin({ dateFrom, dateTo })

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
        }),
      )
    })

    it('should not apply date filter if only dateFrom is provided', async () => {
      const dateFrom = new Date('2024-01-01')

      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findAllAdmin({ dateFrom })

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      )
    })

    it('should enforce MAX_LIMIT', async () => {
      vi.mocked(db.notification.findMany).mockResolvedValue([])

      await repository.findAllAdmin({ limit: 500 })

      expect(db.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      )
    })
  })

  describe('getStats', () => {
    it('should return comprehensive stats', async () => {
      vi.mocked(db.notification.count).mockResolvedValueOnce(100)
      vi.mocked(db.notification.count).mockResolvedValueOnce(70)
      vi.mocked(db.notification.count).mockResolvedValueOnce(30)
      vi.mocked(db.notification.groupBy).mockResolvedValue([
        { type: 'security', _count: { type: 20 } },
        { type: 'activity', _count: { type: 30 } },
        { type: 'system', _count: { type: 50 } },
      ])

      const result = await repository.getStats()

      expect(result).toEqual({
        totalSent: 100,
        totalRead: 70,
        totalUnread: 30,
        byType: {
          security: 20,
          activity: 30,
          system: 50,
        },
      })
    })

    it('should handle empty database', async () => {
      vi.mocked(db.notification.count).mockResolvedValue(0)
      vi.mocked(db.notification.groupBy).mockResolvedValue([])

      const result = await repository.getStats()

      expect(result).toEqual({
        totalSent: 0,
        totalRead: 0,
        totalUnread: 0,
        byType: {},
      })
    })

    it('should handle database error gracefully', async () => {
      vi.mocked(db.notification.count).mockRejectedValue(
        new Error('DB connection lost'),
      )

      await expect(repository.getStats()).rejects.toThrow('DB connection lost')
    })
  })

  describe('Race Conditions & Concurrency', () => {
    it('should handle concurrent markAsRead calls', async () => {
      const mockData = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'security' as const,
        title: 'Title',
        description: 'Desc',
        icon: 'Shield',
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.notification.update).mockResolvedValue(mockData)

      const [result1, result2] = await Promise.all([
        repository.markAsRead('notif-1'),
        repository.markAsRead('notif-1'),
      ])

      expect(result1?.read).toBe(true)
      expect(result2?.read).toBe(true)
    })

    it('should handle concurrent delete calls', async () => {
      vi.mocked(db.notification.delete)
        .mockResolvedValueOnce({
          id: 'notif-1',
          userId: 'user-1',
          type: 'security',
          title: 'Title',
          description: 'Desc',
          icon: 'Shield',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockRejectedValueOnce(new Error('Record not found'))

      const [result1, result2] = await Promise.all([
        repository.delete('notif-1'),
        repository.delete('notif-1'),
      ])

      expect(result1 || result2).toBe(true)
      expect(result1 && result2).toBe(false)
    })

    it('should handle concurrent bulkCreate calls', async () => {
      const notifications: CreateNotificationDTO[] = [
        {
          userId: 'user-1',
          type: 'system',
          title: 'Bulk 1',
          description: 'Desc',
          icon: 'Bell',
        },
      ]

      const mockCreated = [
        {
          id: 'notif-1',
          ...notifications[0],
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(db.$transaction).mockResolvedValue(mockCreated)

      const [result1, result2] = await Promise.all([
        repository.bulkCreate(notifications),
        repository.bulkCreate(notifications),
      ])

      expect(result1).toHaveLength(1)
      expect(result2).toHaveLength(1)
    })
  })
})
