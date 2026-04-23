import { NextRequest } from 'next/server'

import { transcriptionController } from '@/server/domains/transcription'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return transcriptionController.validateConfig(request)
}
