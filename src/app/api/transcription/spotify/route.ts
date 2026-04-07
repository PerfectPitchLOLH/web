import { NextRequest } from 'next/server'

import { transcriptionController } from '@/server/domains/transcription'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return transcriptionController.uploadSpotifyUrl(auth.session.user.id, request)
}
