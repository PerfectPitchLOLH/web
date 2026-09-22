import { transcriptionService } from '@/server/domains/transcription'

import { PartitionController } from './partition.controller'
import { PartitionRepository } from './partition.repository'
import { PartitionService } from './partition.service'

const partitionRepository = new PartitionRepository()
const partitionService = new PartitionService(
  partitionRepository,
  transcriptionService,
)
export const partitionController = new PartitionController(partitionService)

export * from './partition.types'
