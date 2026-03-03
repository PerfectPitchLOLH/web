import { describe, expect, it } from 'vitest'

import {
  auditLogFiltersSchema,
  updateUserRoleSchema,
  userManagementFiltersSchema,
} from '../admin.schemas'

describe('Admin Schemas', () => {
  describe('updateUserRoleSchema', () => {
    it('should validate correct user role update data', () => {
      const validData = {
        userId: 'user123',
        role: 'admin',
      }

      const result = updateUserRoleSchema.safeParse(validData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it('should accept user role', () => {
      const validData = {
        userId: 'user123',
        role: 'user',
      }

      const result = updateUserRoleSchema.safeParse(validData)

      expect(result.success).toBe(true)
    })

    it('should reject empty userId', () => {
      const invalidData = {
        userId: '',
        role: 'admin',
      }

      const result = updateUserRoleSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should reject missing userId', () => {
      const invalidData = {
        role: 'admin',
      }

      const result = updateUserRoleSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should reject invalid role', () => {
      const invalidData = {
        userId: 'user123',
        role: 'superadmin',
      }

      const result = updateUserRoleSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should reject missing role', () => {
      const invalidData = {
        userId: 'user123',
      }

      const result = updateUserRoleSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })
  })

  describe('userManagementFiltersSchema', () => {
    it('should validate filters with all fields', () => {
      const validFilters = {
        role: 'admin',
        search: 'test@test.com',
        emailVerified: 'true',
        page: '1',
        limit: '10',
      }

      const result = userManagementFiltersSchema.safeParse(validFilters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          role: 'admin',
          search: 'test@test.com',
          emailVerified: true,
          page: 1,
          limit: 10,
        })
      }
    })

    it('should validate filters with no fields (all optional)', () => {
      const emptyFilters = {}

      const result = userManagementFiltersSchema.safeParse(emptyFilters)

      expect(result.success).toBe(true)
    })

    it('should validate filters with only role', () => {
      const filters = {
        role: 'user',
      }

      const result = userManagementFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe('user')
      }
    })

    it('should validate filters with only search', () => {
      const filters = {
        search: 'john',
      }

      const result = userManagementFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('john')
      }
    })

    it('should transform emailVerified string to boolean', () => {
      const filtersTrue = { emailVerified: 'true' }
      const filtersFalse = { emailVerified: 'false' }

      const resultTrue = userManagementFiltersSchema.safeParse(filtersTrue)
      const resultFalse = userManagementFiltersSchema.safeParse(filtersFalse)

      expect(resultTrue.success).toBe(true)
      if (resultTrue.success) {
        expect(resultTrue.data.emailVerified).toBe(true)
      }

      expect(resultFalse.success).toBe(true)
      if (resultFalse.success) {
        expect(resultFalse.data.emailVerified).toBe(false)
      }
    })

    it('should coerce page to number', () => {
      const filters = { page: '5' }

      const result = userManagementFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
        expect(typeof result.data.page).toBe('number')
      }
    })

    it('should coerce limit to number', () => {
      const filters = { limit: '20' }

      const result = userManagementFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(typeof result.data.limit).toBe('number')
      }
    })

    it('should reject page less than 1', () => {
      const filters = { page: '0' }

      const result = userManagementFiltersSchema.safeParse(filters)

      expect(result.success).toBe(false)
    })

    it('should reject limit less than 1', () => {
      const filters = { limit: '0' }

      const result = userManagementFiltersSchema.safeParse(filters)

      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const filters = { limit: '101' }

      const result = userManagementFiltersSchema.safeParse(filters)

      expect(result.success).toBe(false)
    })

    it('should reject invalid role', () => {
      const filters = { role: 'superadmin' }

      const result = userManagementFiltersSchema.safeParse(filters)

      expect(result.success).toBe(false)
    })
  })

  describe('auditLogFiltersSchema', () => {
    it('should validate filters with all fields', () => {
      const validFilters = {
        userId: 'user123',
        action: 'user_role_updated',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        page: '1',
        limit: '20',
      }

      const result = auditLogFiltersSchema.safeParse(validFilters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe('user123')
        expect(result.data.action).toBe('user_role_updated')
        expect(result.data.startDate).toBeInstanceOf(Date)
        expect(result.data.endDate).toBeInstanceOf(Date)
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should validate filters with no fields (all optional)', () => {
      const emptyFilters = {}

      const result = auditLogFiltersSchema.safeParse(emptyFilters)

      expect(result.success).toBe(true)
    })

    it('should coerce startDate to Date object', () => {
      const filters = { startDate: '2024-01-01' }

      const result = auditLogFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date)
      }
    })

    it('should coerce endDate to Date object', () => {
      const filters = { endDate: '2024-12-31' }

      const result = auditLogFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.endDate).toBeInstanceOf(Date)
      }
    })

    it('should coerce page to number', () => {
      const filters = { page: '3' }

      const result = auditLogFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(typeof result.data.page).toBe('number')
      }
    })

    it('should coerce limit to number', () => {
      const filters = { limit: '50' }

      const result = auditLogFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(typeof result.data.limit).toBe('number')
      }
    })

    it('should reject page less than 1', () => {
      const filters = { page: '0' }

      const result = auditLogFiltersSchema.safeParse(filters)

      expect(result.success).toBe(false)
    })

    it('should reject limit less than 1', () => {
      const filters = { limit: '0' }

      const result = auditLogFiltersSchema.safeParse(filters)

      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const filters = { limit: '101' }

      const result = auditLogFiltersSchema.safeParse(filters)

      expect(result.success).toBe(false)
    })

    it('should accept userId filter only', () => {
      const filters = { userId: 'user123' }

      const result = auditLogFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe('user123')
      }
    })

    it('should accept action filter only', () => {
      const filters = { action: 'user_suspended' }

      const result = auditLogFiltersSchema.safeParse(filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.action).toBe('user_suspended')
      }
    })
  })
})
