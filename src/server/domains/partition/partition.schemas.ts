import { z } from 'zod'

export const savePartitionSchema = z.object({
  jobId: z.string().min(1),
  title: z.string().min(1).max(120),
  tags: z.array(z.string().max(30)).max(10).optional().default([]),
  notes: z.string().max(500).optional(),
})

export const updatePartitionSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  notes: z.string().max(500).optional(),
})

export const partitionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
  instrument: z.string().optional(),
  search: z.string().optional(),
})
