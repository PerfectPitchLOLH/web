# Skill: Deep Domain Testing

Ce skill analyse un domaine existant et génère des tests exhaustifs couvrant tous les cas possibles, edge cases et effets de bord.

## Philosophie

**Test Coverage is not enough - Test Quality matters**

1. **BOUNDARY**: Tester les limites et valeurs extrêmes
2. **SIDE EFFECTS**: Identifier les effets de bord cachés
3. **EDGE CASES**: Couvrir tous les cas limites possibles
4. **SECURITY**: Tester les vulnérabilités potentielles
5. **PERFORMANCE**: Vérifier les cas de charge
6. **DATA INTEGRITY**: Assurer la cohérence des données

## Instructions

Tu vas créer des tests **approfondis** pour un domaine existant. Suis cet ordre exact :

### Étape 1: Identifier le Domaine

Demander à l'utilisateur :

1. **Nom du domaine** à tester (ex: "user", "notification", "subscription")
2. **Niveau de profondeur** :
   - **Standard**: Tests de base + edge cases principaux
   - **Deep**: Tous les edge cases + effets de bord
   - **Exhaustive**: Tout + performance + sécurité + race conditions

### Étape 2: Analyser le Code Existant

Lire et analyser ces fichiers du domaine :

```
src/server/domains/{domain}/
├── {domain}.types.ts
├── {domain}.schemas.ts
├── {domain}.repository.ts
├── {domain}.service.ts
├── {domain}.controller.ts
└── __tests__/
```

**Questions à se poser pendant l'analyse :**

- Quelles sont toutes les méthodes exposées ?
- Quels sont les types de données utilisés ?
- Quelles validations existent dans les schémas Zod ?
- Quelles sont les dépendances externes (DB, APIs, services) ?
- Y a-t-il des relations entre entités ?
- Quels sont les effets de bord possibles ?

### Étape 3: Identifier les Gaps

Comparer les tests existants avec les tests nécessaires :

**Checklist d'analyse :**

#### Repository Layer

- [ ] Tests de connexion DB (échecs, timeouts)
- [ ] Tests de transactions
- [ ] Tests de contraintes uniques
- [ ] Tests de cascade delete
- [ ] Tests de relations (many-to-many, one-to-many)
- [ ] Tests de pagination (limites, offsets négatifs)
- [ ] Tests de tri (champs invalides)
- [ ] Tests de filtres (injection SQL, caractères spéciaux)

#### Service Layer

- [ ] Validation exhaustive (tous les champs Zod)
- [ ] Tests de logique métier complexe
- [ ] Tests de permissions (RBAC)
- [ ] Tests d'états invalides
- [ ] Tests de cohérence des données
- [ ] Tests de race conditions
- [ ] Tests de retry logic
- [ ] Tests d'idempotence

#### Controller Layer

- [ ] Tests d'authentification (token invalide, expiré)
- [ ] Tests d'autorisation (accès non autorisé)
- [ ] Tests de rate limiting
- [ ] Tests de CORS
- [ ] Tests de payload trop large
- [ ] Tests de content-type invalide
- [ ] Tests de XSS/injection
- [ ] Tests de concurrency

### Étape 4: Générer les Tests par Couche

#### A. Repository Tests Approfondis

**Fichier**: `src/server/domains/{domain}/__tests__/{domain}.repository.deep.test.ts`

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRepository } from '../user.repository'

describe('UserRepository - Deep Tests', () => {
  let repository: UserRepository

  beforeEach(() => {
    repository = new UserRepository()
    vi.clearAllMocks()
  })

  describe('Edge Cases - Boundary Values', () => {
    it('should handle empty string in search', async () => {
      const result = await repository.findAll({ search: '' })
      expect(result).toBeDefined()
    })

    it('should handle very long search strings (>1000 chars)', async () => {
      const longString = 'a'.repeat(1001)
      await expect(repository.findAll({ search: longString })).rejects.toThrow()
    })

    it('should handle special characters in search', async () => {
      const specialChars = `'; DROP TABLE users; --`
      const result = await repository.findAll({ search: specialChars })
      expect(result).toBeDefined()
    })

    it('should handle unicode and emojis in search', async () => {
      const unicode = '测试 🚀 Ñoño'
      const result = await repository.findAll({ search: unicode })
      expect(result).toBeDefined()
    })

    it('should handle negative pagination offset', async () => {
      await expect(
        repository.findAll({ page: -1, limit: 10 }),
      ).rejects.toThrow()
    })

    it('should handle zero limit', async () => {
      await expect(repository.findAll({ page: 1, limit: 0 })).rejects.toThrow()
    })

    it('should handle excessively large limit (>1000)', async () => {
      await expect(
        repository.findAll({ page: 1, limit: 10000 }),
      ).rejects.toThrow()
    })

    it('should handle page overflow (page * limit > MAX_INT)', async () => {
      await expect(
        repository.findAll({ page: 999999, limit: 999999 }),
      ).rejects.toThrow()
    })
  })

  describe('Database Constraints', () => {
    it('should throw on duplicate email', async () => {
      await repository.create({ email: 'test@test.com', name: 'Test' })

      await expect(
        repository.create({ email: 'test@test.com', name: 'Test2' }),
      ).rejects.toThrow()
    })

    it('should handle case-insensitive email uniqueness', async () => {
      await repository.create({ email: 'test@test.com', name: 'Test' })

      await expect(
        repository.create({ email: 'TEST@TEST.COM', name: 'Test2' }),
      ).rejects.toThrow()
    })

    it('should reject NULL in required fields', async () => {
      await expect(
        repository.create({ email: null as any, name: 'Test' }),
      ).rejects.toThrow()
    })

    it('should trim whitespace in emails', async () => {
      const result = await repository.create({
        email: '  test@test.com  ',
        name: 'Test',
      })

      expect(result.email).toBe('test@test.com')
    })
  })

  describe('Database Errors', () => {
    it('should handle database connection timeout', async () => {
      vi.mocked(db.user.findMany).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 100),
          ),
      )

      await expect(repository.findAll()).rejects.toThrow('Connection timeout')
    })

    it('should handle database deadlock', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Deadlock detected'),
      )

      await expect(
        repository.update('1', { name: 'Updated' }),
      ).rejects.toThrow()
    })

    it('should handle foreign key constraint violation', async () => {
      vi.mocked(db.user.delete).mockRejectedValue(
        new Error('Foreign key constraint'),
      )

      await expect(repository.delete('1')).rejects.toThrow()
    })
  })

  describe('Cascade Operations', () => {
    it('should cascade delete related entities', async () => {
      const user = await repository.create({
        email: 'test@test.com',
        name: 'Test',
      })

      await repository.delete(user.id)

      const relatedPosts = await db.post.findMany({
        where: { userId: user.id },
      })

      expect(relatedPosts).toHaveLength(0)
    })
  })

  describe('Transactions', () => {
    it('should rollback on transaction failure', async () => {
      await expect(async () => {
        await db.$transaction(async (tx) => {
          await repository.create({ email: 'test@test.com', name: 'Test' })
          throw new Error('Simulated error')
        })
      }).rejects.toThrow()

      const users = await repository.findAll()
      expect(users).toHaveLength(0)
    })

    it('should handle concurrent updates with optimistic locking', async () => {
      const user = await repository.create({
        email: 'test@test.com',
        name: 'Test',
      })

      const update1 = repository.update(user.id, { name: 'Update1' })
      const update2 = repository.update(user.id, { name: 'Update2' })

      await Promise.all([update1, update2])

      const updated = await repository.findById(user.id)
      expect(['Update1', 'Update2']).toContain(updated?.name)
    })
  })

  describe('Performance', () => {
    it('should handle bulk inserts efficiently', async () => {
      const users = Array.from({ length: 1000 }, (_, i) => ({
        email: `user${i}@test.com`,
        name: `User ${i}`,
      }))

      const start = Date.now()
      await repository.createMany(users)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5000)
    })

    it('should paginate large datasets efficiently', async () => {
      const start = Date.now()
      const result = await repository.findAll({ page: 1, limit: 100 })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000)
      expect(result.length).toBeLessThanOrEqual(100)
    })
  })
})
```

#### B. Service Tests Approfondis

**Fichier**: `src/server/domains/{domain}/__tests__/{domain}.service.deep.test.ts`

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'
import { UserRepository } from '../user.repository'
import { UserService } from '../user.service'

describe('UserService - Deep Tests', () => {
  let service: UserService
  let mockRepository: UserRepository

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any

    service = new UserService(mockRepository)
    vi.clearAllMocks()
  })

  describe('Validation Edge Cases', () => {
    it('should reject email with no domain', async () => {
      await expect(
        service.createUser({ email: 'invalid', name: 'Test' }),
      ).rejects.toThrow(ApiError)
    })

    it('should reject email with multiple @', async () => {
      await expect(
        service.createUser({ email: 'test@@test.com', name: 'Test' }),
      ).rejects.toThrow(ApiError)
    })

    it('should reject disposable email domains', async () => {
      await expect(
        service.createUser({ email: 'test@tempmail.com', name: 'Test' }),
      ).rejects.toThrow('Disposable email not allowed')
    })

    it('should reject name with only numbers', async () => {
      await expect(
        service.createUser({ email: 'test@test.com', name: '123456' }),
      ).rejects.toThrow(ApiError)
    })

    it('should reject name with special characters', async () => {
      await expect(
        service.createUser({
          email: 'test@test.com',
          name: '<script>alert()</script>',
        }),
      ).rejects.toThrow(ApiError)
    })

    it('should accept name with accents and unicode', async () => {
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'José María Ñoño',
      } as any)

      const result = await service.createUser({
        email: 'test@test.com',
        name: 'José María Ñoño',
      })

      expect(result.name).toBe('José María Ñoño')
    })

    it('should truncate very long names', async () => {
      const longName = 'a'.repeat(500)

      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: longName.slice(0, 100),
      } as any)

      const result = await service.createUser({
        email: 'test@test.com',
        name: longName,
      })

      expect(result.name.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Business Logic Edge Cases', () => {
    it('should prevent self-deletion', async () => {
      await expect(
        service.deleteUser('user-123', { requesterId: 'user-123' }),
      ).rejects.toThrow('Cannot delete own account')
    })

    it('should prevent deletion of last admin', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue({
        id: '1',
        role: 'admin',
      } as any)

      vi.mocked(mockRepository.findAll).mockResolvedValue([
        { id: '1', role: 'admin' },
      ] as any)

      await expect(
        service.deleteUser('1', { requesterId: 'other' }),
      ).rejects.toThrow('Cannot delete last admin')
    })

    it('should handle circular references in data', async () => {
      const circular: any = { name: 'Test' }
      circular.self = circular

      await expect(
        service.createUser({ email: 'test@test.com', ...circular }),
      ).rejects.toThrow()
    })

    it('should sanitize HTML in user inputs', async () => {
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
      } as any)

      const result = await service.createUser({
        email: 'test@test.com',
        name: '<img src=x onerror=alert(1)>Test',
      })

      expect(result.name).not.toContain('<img')
      expect(result.name).not.toContain('onerror')
    })
  })

  describe('State Management', () => {
    it('should prevent transition from deleted to active', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue({
        id: '1',
        status: 'deleted',
      } as any)

      await expect(
        service.updateUser('1', { status: 'active' }),
      ).rejects.toThrow('Invalid status transition')
    })

    it('should allow valid status transitions only', async () => {
      const validTransitions = {
        pending: ['active', 'suspended'],
        active: ['suspended', 'deleted'],
        suspended: ['active', 'deleted'],
        deleted: [],
      }

      for (const [from, toList] of Object.entries(validTransitions)) {
        vi.mocked(mockRepository.findById).mockResolvedValue({
          id: '1',
          status: from,
        } as any)

        for (const to of toList) {
          vi.mocked(mockRepository.update).mockResolvedValue({
            id: '1',
            status: to,
          } as any)

          await expect(
            service.updateUser('1', { status: to }),
          ).resolves.not.toThrow()
        }
      }
    })
  })

  describe('Race Conditions', () => {
    it('should handle concurrent user creation with same email', async () => {
      vi.mocked(mockRepository.findByEmail)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      vi.mocked(mockRepository.create)
        .mockResolvedValueOnce({ id: '1', email: 'test@test.com' } as any)
        .mockRejectedValueOnce(new Error('Unique constraint violation'))

      const promise1 = service.createUser({
        email: 'test@test.com',
        name: 'User1',
      })

      const promise2 = service.createUser({
        email: 'test@test.com',
        name: 'User2',
      })

      const results = await Promise.allSettled([promise1, promise2])

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    })

    it('should handle concurrent updates to same user', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue({
        id: '1',
        name: 'Original',
        version: 1,
      } as any)

      const update1 = service.updateUser('1', { name: 'Update1' })
      const update2 = service.updateUser('1', { name: 'Update2' })

      await Promise.all([update1, update2])

      expect(mockRepository.update).toHaveBeenCalledTimes(2)
    })
  })

  describe('Side Effects', () => {
    it('should send welcome email on user creation', async () => {
      const sendEmailSpy = vi.fn()

      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test',
      } as any)

      await service.createUser({ email: 'test@test.com', name: 'Test' })

      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: 'test@test.com',
        template: 'welcome',
      })
    })

    it('should rollback on email send failure', async () => {
      const sendEmailSpy = vi.fn().mockRejectedValue(new Error('Email failed'))

      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      } as any)
      vi.mocked(mockRepository.delete).mockResolvedValue(true)

      await expect(
        service.createUser({ email: 'test@test.com', name: 'Test' }),
      ).rejects.toThrow('Email failed')

      expect(mockRepository.delete).toHaveBeenCalledWith('1')
    })

    it('should invalidate cache on user update', async () => {
      const cacheSpy = vi.fn()

      vi.mocked(mockRepository.findById).mockResolvedValue({
        id: '1',
        name: 'Original',
      } as any)

      vi.mocked(mockRepository.update).mockResolvedValue({
        id: '1',
        name: 'Updated',
      } as any)

      await service.updateUser('1', { name: 'Updated' })

      expect(cacheSpy).toHaveBeenCalledWith('user:1')
    })
  })

  describe('Idempotence', () => {
    it('should be idempotent for user deletion', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue({
        id: '1',
        deletedAt: null,
      } as any)

      vi.mocked(mockRepository.delete).mockResolvedValue(true)

      await service.deleteUser('1')
      await service.deleteUser('1')

      expect(mockRepository.delete).toHaveBeenCalledTimes(1)
    })

    it('should handle duplicate requests with idempotency key', async () => {
      const idempotencyKey = 'unique-key-123'

      const result1 = await service.createUser(
        { email: 'test@test.com', name: 'Test' },
        { idempotencyKey },
      )

      const result2 = await service.createUser(
        { email: 'test@test.com', name: 'Test' },
        { idempotencyKey },
      )

      expect(result1.id).toBe(result2.id)
      expect(mockRepository.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Recovery', () => {
    it('should retry on transient errors', async () => {
      vi.mocked(mockRepository.findById)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ id: '1', name: 'Test' } as any)

      const result = await service.getUserById('1')

      expect(result).toBeDefined()
      expect(mockRepository.findById).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      vi.mocked(mockRepository.findById).mockRejectedValue(
        new Error('Persistent failure'),
      )

      await expect(service.getUserById('1')).rejects.toThrow()
      expect(mockRepository.findById).toHaveBeenCalledTimes(3)
    })
  })
})
```

#### C. Controller Tests Approfondis

**Fichier**: `src/server/domains/{domain}/__tests__/{domain}.controller.deep.test.ts`

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { UserController } from '../user.controller'
import { UserService } from '../user.service'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'

describe('UserController - Deep Tests', () => {
  let controller: UserController
  let mockService: UserService

  beforeEach(() => {
    mockService = {
      getUsers: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    } as any

    controller = new UserController(mockService)
    vi.clearAllMocks()
  })

  describe('Authentication & Authorization', () => {
    it('should reject request with missing auth token', async () => {
      const request = new NextRequest('http://localhost/api/users')

      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject request with invalid token format', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        headers: { Authorization: 'InvalidFormat' },
      })

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with expired token', async () => {
      const expiredToken = 'Bearer expired.token.here'
      const request = new NextRequest('http://localhost/api/users', {
        headers: { Authorization: expiredToken },
      })

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect((await response.json()).error.message).toContain('expired')
    })

    it('should reject non-admin access to admin endpoints', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        headers: { Authorization: 'Bearer valid.user.token' },
      })

      const response = await controller.deleteUser(request, {
        params: Promise.resolve({ id: '123' }),
      })

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })

  describe('Input Validation', () => {
    it('should reject payload exceeding max size', async () => {
      const largePayload = {
        email: 'test@test.com',
        name: 'a'.repeat(10_000_000),
      }

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(largePayload),
      })

      const response = await controller.createUser(request)

      expect(response.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE)
    })

    it('should reject invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: 'invalid json {',
      })

      const response = await controller.createUser(request)

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject wrong content-type', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ email: 'test@test.com', name: 'Test' }),
      })

      const response = await controller.createUser(request)

      expect(response.status).toBe(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE)
    })

    it('should sanitize XSS attempts in inputs', async () => {
      const xssPayload = {
        email: 'test@test.com',
        name: '<script>alert("XSS")</script>',
      }

      vi.mocked(mockService.createUser).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'alert("XSS")',
      } as any)

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(xssPayload),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(data.data.name).not.toContain('<script>')
    })

    it('should reject SQL injection attempts', async () => {
      const sqlInjection = `'; DROP TABLE users; --`

      const request = new NextRequest(
        `http://localhost/api/users?search=${encodeURIComponent(sqlInjection)}`,
      )

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(mockService.getUsers).toHaveBeenCalled()
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limit on excessive requests', async () => {
      const requests = Array.from(
        { length: 101 },
        () => new NextRequest('http://localhost/api/users'),
      )

      const responses = await Promise.all(
        requests.map((req) => controller.getUsers(req)),
      )

      const rateLimited = responses.filter(
        (r) => r.status === HTTP_STATUS.TOO_MANY_REQUESTS,
      )

      expect(rateLimited.length).toBeGreaterThan(0)
    })

    it('should apply different rate limits per endpoint', async () => {
      const createRequests = Array.from(
        { length: 10 },
        () => new NextRequest('http://localhost/api/users', { method: 'POST' }),
      )

      const getRequests = Array.from(
        { length: 100 },
        () => new NextRequest('http://localhost/api/users'),
      )

      const createResponses = await Promise.all(
        createRequests.map((req) => controller.createUser(req)),
      )

      const getResponses = await Promise.all(
        getRequests.map((req) => controller.getUsers(req)),
      )

      expect(
        createResponses.filter(
          (r) => r.status === HTTP_STATUS.TOO_MANY_REQUESTS,
        ),
      ).toHaveLength(0)
    })
  })

  describe('CORS', () => {
    it('should allow requests from allowed origins', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        headers: { Origin: 'https://app.notavex.com' },
      })

      const response = await controller.getUsers(request)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://app.notavex.com',
      )
    })

    it('should reject requests from disallowed origins', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        headers: { Origin: 'https://malicious.com' },
      })

      const response = await controller.getUsers(request)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })
  })

  describe('Concurrency', () => {
    it('should handle concurrent requests safely', async () => {
      const requests = Array.from(
        { length: 50 },
        (_, i) =>
          new NextRequest('http://localhost/api/users', {
            method: 'POST',
            body: JSON.stringify({
              email: `user${i}@test.com`,
              name: `User ${i}`,
            }),
          }),
      )

      const responses = await Promise.all(
        requests.map((req) => controller.createUser(req)),
      )

      const successful = responses.filter(
        (r) => r.status === HTTP_STATUS.CREATED,
      )

      expect(successful).toHaveLength(50)
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on unexpected errors', async () => {
      vi.mocked(mockService.getUsers).mockRejectedValue(
        new Error('Unexpected error'),
      )

      const request = new NextRequest('http://localhost/api/users')
      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should not expose internal error details', async () => {
      vi.mocked(mockService.getUsers).mockRejectedValue(
        new Error('Database connection failed at 10.0.0.5:5432'),
      )

      const request = new NextRequest('http://localhost/api/users')
      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(data.error.message).not.toContain('10.0.0.5')
      expect(data.error.message).toBe('Internal server error')
    })
  })

  describe('Logging & Monitoring', () => {
    it('should log all requests with metadata', async () => {
      const logSpy = vi.fn()

      const request = new NextRequest('http://localhost/api/users')
      await controller.getUsers(request)

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/api/users',
          timestamp: expect.any(String),
        }),
      )
    })

    it('should track request duration', async () => {
      const metricSpy = vi.fn()

      const request = new NextRequest('http://localhost/api/users')
      await controller.getUsers(request)

      expect(metricSpy).toHaveBeenCalledWith(
        'request.duration',
        expect.any(Number),
      )
    })
  })
})
```

### Étape 5: Tests de Sécurité

**Fichier**: `src/server/domains/{domain}/__tests__/{domain}.security.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { UserService } from '../user.service'
import { UserController } from '../user.controller'

describe('Security Tests', () => {
  describe('Injection Attacks', () => {
    it('should prevent NoSQL injection', async () => {
      const maliciousPayload = {
        email: { $ne: null },
        password: { $ne: null },
      }

      await expect(
        service.createUser(maliciousPayload as any),
      ).rejects.toThrow()
    })

    it('should prevent LDAP injection', async () => {
      const ldapInjection = 'admin)(&(password=*))'

      await expect(service.getUserByEmail(ldapInjection)).rejects.toThrow()
    })

    it('should prevent command injection', async () => {
      const commandInjection = 'test@test.com; rm -rf /'

      await expect(
        service.createUser({ email: commandInjection, name: 'Test' }),
      ).rejects.toThrow()
    })
  })

  describe('Authentication Bypass', () => {
    it('should not allow token manipulation', async () => {
      const manipulatedToken =
        'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.'

      const request = new NextRequest('http://localhost/api/users', {
        headers: { Authorization: manipulatedToken },
      })

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should validate JWT signature', async () => {
      const invalidSignature = 'Bearer valid.payload.invalidsignature'

      const request = new NextRequest('http://localhost/api/users', {
        headers: { Authorization: invalidSignature },
      })

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('Data Leakage', () => {
    it('should not expose password hashes in responses', async () => {
      const user = await service.getUserById('1')

      expect(user).not.toHaveProperty('passwordHash')
      expect(user).not.toHaveProperty('password')
    })

    it('should not expose internal IDs in error messages', async () => {
      try {
        await service.getUserById('invalid-uuid')
      } catch (error: any) {
        expect(error.message).not.toMatch(
          /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/,
        )
      }
    })
  })

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', name: 'Test' }),
      })

      const response = await controller.createUser(request)

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })

  describe('Permission Escalation', () => {
    it('should prevent regular user from accessing admin functions', async () => {
      const userToken = 'Bearer valid.user.token'

      const request = new NextRequest('http://localhost/api/users/1', {
        method: 'DELETE',
        headers: { Authorization: userToken },
      })

      const response = await controller.deleteUser(request, {
        params: Promise.resolve({ id: '1' }),
      })

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('should prevent user from modifying other users data', async () => {
      const userToken = 'Bearer valid.user.token.userId2'

      const request = new NextRequest('http://localhost/api/users/1', {
        method: 'PATCH',
        headers: { Authorization: userToken },
        body: JSON.stringify({ name: 'Hacked' }),
      })

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: '1' }),
      })

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })
})
```

### Étape 6: Tests de Performance

**Fichier**: `src/server/domains/{domain}/__tests__/{domain}.performance.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { UserService } from '../user.service'

describe('Performance Tests', () => {
  describe('Query Performance', () => {
    it('should fetch 10000 users in under 2s', async () => {
      const start = Date.now()
      const users = await service.getUsers({ limit: 10000 })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(2000)
      expect(users.length).toBe(10000)
    })

    it('should handle complex filters efficiently', async () => {
      const start = Date.now()
      const users = await service.getUsers({
        search: 'test',
        role: 'user',
        status: 'active',
        createdAfter: '2024-01-01',
        sortBy: 'name',
        page: 10,
        limit: 100,
      })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(500)
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory on repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      for (let i = 0; i < 1000; i++) {
        await service.createUser({
          email: `user${i}@test.com`,
          name: `User ${i}`,
        })
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024

      expect(memoryIncrease).toBeLessThan(100)
    })
  })

  describe('Database Connection Pool', () => {
    it('should handle connection pool exhaustion', async () => {
      const promises = Array.from({ length: 1000 }, () =>
        service.getUserById('1'),
      )

      await expect(Promise.all(promises)).resolves.toBeDefined()
    })
  })
})
```

## Checklist Finale

Après génération, vérifier :

- [ ] Tests Repository : boundary, contraintes, transactions, cascade
- [ ] Tests Service : validation, logique métier, états, race conditions
- [ ] Tests Controller : auth, validation, rate limit, CORS, concurrency
- [ ] Tests Sécurité : injections, bypass, leakage, CSRF, escalation
- [ ] Tests Performance : queries, memory, connection pool
- [ ] Tous les edge cases identifiés sont couverts
- [ ] Les effets de bord sont testés
- [ ] Coverage > 95%
- [ ] Tous les tests passent

## Commandes

```bash
npm run test                              # Tous les tests
npm run test user.repository.deep.test   # Tests deep repository
npm run test user.service.deep.test      # Tests deep service
npm run test user.controller.deep.test   # Tests deep controller
npm run test user.security.test          # Tests sécurité
npm run test user.performance.test       # Tests performance
npm run test -- --coverage               # Coverage report
```

Prêt à créer des tests exhaustifs ?
