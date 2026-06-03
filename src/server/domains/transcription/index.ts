import { creditService } from '@/server/domains/credit'

import { TranscriptionController } from './transcription.controller'
import { TranscriptionRepository } from './transcription.repository'
import { TranscriptionService } from './transcription.service'

const transcriptionRepository = new TranscriptionRepository()
const transcriptionService = new TranscriptionService(
  transcriptionRepository,
  creditService,
)
export const transcriptionController = new TranscriptionController(
  transcriptionService,
)

export * from './transcription.types'
export {
  TranscriptionController,
  TranscriptionRepository,
  TranscriptionService,
}
