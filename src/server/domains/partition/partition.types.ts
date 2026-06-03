import type { SavedPartition } from '@prisma/client'

import type { TranscribeConfig } from '@/server/domains/transcription'

export type SavedPartitionEntity = SavedPartition

export type CreatePartitionDTO = {
  userId: string
  title: string
  originalFileName?: string
  instrument: string
  partitionType: string
  tags?: string[]
  notes?: string
  transcribeConfig: TranscribeConfig
  musicXmlContent?: string
  svgContent?: string
  sourceJobId?: string
  durationSeconds?: number
}

export type UpdatePartitionDTO = {
  title?: string
  tags?: string[]
  notes?: string
}

export type PartitionListFilters = {
  instrument?: string
  search?: string
  page?: number
  limit?: number
}

export type SavePartitionInput = {
  jobId: string
  title: string
  tags?: string[]
  notes?: string
  originalFileName?: string
}

export type PartitionSummary = Omit<
  SavedPartition,
  'musicXmlContent' | 'svgContent' | 'transcribeConfig'
>
