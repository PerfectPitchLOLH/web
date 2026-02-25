import { describe, expect, it } from 'vitest'

import {
  emailSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '../auth.schemas'

describe('Auth Schemas', () => {
  describe('signUpSchema', () => {
    it('should accept valid signup data', () => {
      const valid = {
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'John Doe',
      }
      expect(() => signUpSchema.parse(valid)).not.toThrow()
    })

    it('should reject weak password (no uppercase)', () => {
      const invalid = {
        email: 'test@example.com',
        password: 'test123!@#',
        name: 'John Doe',
      }
      expect(() => signUpSchema.parse(invalid)).toThrow()
    })

    it('should reject weak password (no lowercase)', () => {
      const invalid = {
        email: 'test@example.com',
        password: 'TEST123!@#',
        name: 'John Doe',
      }
      expect(() => signUpSchema.parse(invalid)).toThrow()
    })

    it('should reject weak password (no number)', () => {
      const invalid = {
        email: 'test@example.com',
        password: 'TestABC!@#',
        name: 'John Doe',
      }
      expect(() => signUpSchema.parse(invalid)).toThrow()
    })

    it('should reject weak password (no special char)', () => {
      const invalid = {
        email: 'test@example.com',
        password: 'TestABC123',
        name: 'John Doe',
      }
      expect(() => signUpSchema.parse(invalid)).toThrow()
    })

    it('should reject short password', () => {
      const invalid = {
        email: 'test@example.com',
        password: 'Test1!',
        name: 'John Doe',
      }
      expect(() => signUpSchema.parse(invalid)).toThrow()
    })

    it('should reject invalid email', () => {
      const invalid = {
        email: 'notanemail',
        password: 'Test123!@#',
        name: 'John Doe',
      }
      expect(() => signUpSchema.parse(invalid)).toThrow()
    })

    it('should reject short name', () => {
      const invalid = {
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'J',
      }
      expect(() => signUpSchema.parse(invalid)).toThrow()
    })

    it('should trim name', () => {
      const data = {
        email: 'test@example.com',
        password: 'Test123!@#',
        name: '  John Doe  ',
      }
      const result = signUpSchema.parse(data)
      expect(result.name).toBe('John Doe')
    })
  })

  describe('signInSchema', () => {
    it('should accept valid signin data', () => {
      const valid = {
        email: 'test@example.com',
        password: 'anypassword',
      }
      expect(() => signInSchema.parse(valid)).not.toThrow()
    })

    it('should reject invalid email', () => {
      const invalid = {
        email: 'notanemail',
        password: 'anypassword',
      }
      expect(() => signInSchema.parse(invalid)).toThrow()
    })

    it('should reject empty password', () => {
      const invalid = {
        email: 'test@example.com',
        password: '',
      }
      expect(() => signInSchema.parse(invalid)).toThrow()
    })
  })

  describe('emailSchema', () => {
    it('should accept valid email', () => {
      const valid = { email: 'test@example.com' }
      expect(() => emailSchema.parse(valid)).not.toThrow()
    })

    it('should reject invalid email', () => {
      const invalid = { email: 'notanemail' }
      expect(() => emailSchema.parse(invalid)).toThrow()
    })
  })

  describe('resetPasswordSchema', () => {
    it('should accept valid reset data', () => {
      const valid = {
        token: 'valid-token-string',
        password: 'NewPass123!@#',
      }
      expect(() => resetPasswordSchema.parse(valid)).not.toThrow()
    })

    it('should reject weak password', () => {
      const invalid = {
        token: 'valid-token-string',
        password: 'weak',
      }
      expect(() => resetPasswordSchema.parse(invalid)).toThrow()
    })

    it('should reject empty token', () => {
      const invalid = {
        token: '',
        password: 'NewPass123!@#',
      }
      expect(() => resetPasswordSchema.parse(invalid)).toThrow()
    })
  })
})
