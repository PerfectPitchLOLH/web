import { describe, expect, it } from 'vitest'

import {
  hashPassword,
  isStrongPassword,
  verifyPassword,
} from '../password.utils'

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'Test123!@#'
      const hash = await hashPassword(password)
      expect(hash).not.toBe(password)
      expect(hash).toHaveLength(60)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'Test123!@#'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'Test123!@#'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'Test123!@#'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword('WrongPass123!', hash)
      expect(isValid).toBe(false)
    })
  })

  describe('isStrongPassword', () => {
    it('should accept strong password', () => {
      expect(isStrongPassword('Test123!@#')).toBe(true)
    })

    it('should reject password without uppercase', () => {
      expect(isStrongPassword('test123!@#')).toBe(false)
    })

    it('should reject password without lowercase', () => {
      expect(isStrongPassword('TEST123!@#')).toBe(false)
    })

    it('should reject password without numbers', () => {
      expect(isStrongPassword('TestABC!@#')).toBe(false)
    })

    it('should reject password without special characters', () => {
      expect(isStrongPassword('TestABC123')).toBe(false)
    })

    it('should reject short password', () => {
      expect(isStrongPassword('Test1!')).toBe(false)
    })
  })
})
