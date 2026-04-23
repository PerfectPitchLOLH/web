import { describe, expect, it } from 'vitest'

import {
  partitionListQuerySchema,
  savePartitionSchema,
  updatePartitionSchema,
} from '../partition.schemas'

describe('savePartitionSchema', () => {
  it('should accept valid input', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-123',
      title: 'Ma partition',
    })
    expect(result.success).toBe(true)
  })

  it('should accept full optional fields', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-abc',
      title: 'Titre',
      tags: ['piano', 'jazz'],
      notes: 'Quelques notes',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual(['piano', 'jazz'])
    }
  })

  it('should default tags to empty array when omitted', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-1',
      title: 'Titre',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual([])
    }
  })

  it('should reject empty jobId', () => {
    const result = savePartitionSchema.safeParse({ jobId: '', title: 'Titre' })
    expect(result.success).toBe(false)
  })

  it('should reject empty title', () => {
    const result = savePartitionSchema.safeParse({ jobId: 'job-1', title: '' })
    expect(result.success).toBe(false)
  })

  it('should reject title longer than 120 chars', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-1',
      title: 'a'.repeat(121),
    })
    expect(result.success).toBe(false)
  })

  it('should accept title exactly 120 chars', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-1',
      title: 'a'.repeat(120),
    })
    expect(result.success).toBe(true)
  })

  it('should reject more than 10 tags', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-1',
      title: 'Titre',
      tags: Array(11).fill('tag'),
    })
    expect(result.success).toBe(false)
  })

  it('should accept exactly 10 tags', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-1',
      title: 'Titre',
      tags: Array(10).fill('tag'),
    })
    expect(result.success).toBe(true)
  })

  it('should reject a tag longer than 30 chars', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-1',
      title: 'Titre',
      tags: ['a'.repeat(31)],
    })
    expect(result.success).toBe(false)
  })

  it('should reject notes longer than 500 chars', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-1',
      title: 'Titre',
      notes: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('should accept notes exactly 500 chars', () => {
    const result = savePartitionSchema.safeParse({
      jobId: 'job-1',
      title: 'Titre',
      notes: 'a'.repeat(500),
    })
    expect(result.success).toBe(true)
  })
})

describe('updatePartitionSchema', () => {
  it('should accept empty object (all fields optional)', () => {
    const result = updatePartitionSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should accept partial update with title only', () => {
    const result = updatePartitionSchema.safeParse({ title: 'Nouveau titre' })
    expect(result.success).toBe(true)
  })

  it('should accept partial update with tags only', () => {
    const result = updatePartitionSchema.safeParse({ tags: ['rock'] })
    expect(result.success).toBe(true)
  })

  it('should accept partial update with notes only', () => {
    const result = updatePartitionSchema.safeParse({ notes: 'Mes notes' })
    expect(result.success).toBe(true)
  })

  it('should reject empty title', () => {
    const result = updatePartitionSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('should reject title over 120 chars', () => {
    const result = updatePartitionSchema.safeParse({ title: 'a'.repeat(121) })
    expect(result.success).toBe(false)
  })

  it('should reject more than 10 tags', () => {
    const result = updatePartitionSchema.safeParse({
      tags: Array(11).fill('x'),
    })
    expect(result.success).toBe(false)
  })

  it('should reject notes over 500 chars', () => {
    const result = updatePartitionSchema.safeParse({
      notes: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

describe('partitionListQuerySchema', () => {
  it('should apply defaults when no params provided', () => {
    const result = partitionListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it('should coerce string page to number', () => {
    const result = partitionListQuerySchema.safeParse({ page: '3' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(3)
    }
  })

  it('should coerce string limit to number', () => {
    const result = partitionListQuerySchema.safeParse({ limit: '10' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(10)
    }
  })

  it('should reject limit over 50', () => {
    const result = partitionListQuerySchema.safeParse({ limit: 51 })
    expect(result.success).toBe(false)
  })

  it('should accept limit exactly 50', () => {
    const result = partitionListQuerySchema.safeParse({ limit: 50 })
    expect(result.success).toBe(true)
  })

  it('should reject page zero', () => {
    const result = partitionListQuerySchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it('should reject negative page', () => {
    const result = partitionListQuerySchema.safeParse({ page: -1 })
    expect(result.success).toBe(false)
  })

  it('should accept instrument filter', () => {
    const result = partitionListQuerySchema.safeParse({ instrument: 'piano' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.instrument).toBe('piano')
    }
  })

  it('should accept search filter', () => {
    const result = partitionListQuerySchema.safeParse({ search: 'Mozart' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBe('Mozart')
    }
  })

  it('should accept all filters combined', () => {
    const result = partitionListQuerySchema.safeParse({
      page: '2',
      limit: '10',
      instrument: 'guitar',
      search: 'blues',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(10)
      expect(result.data.instrument).toBe('guitar')
      expect(result.data.search).toBe('blues')
    }
  })
})
