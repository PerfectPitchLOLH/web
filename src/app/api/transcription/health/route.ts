import { transcriptionController } from '@/server/domains/transcription'

export const dynamic = 'force-dynamic'

export async function GET() {
  return transcriptionController.healthCheck()
}
