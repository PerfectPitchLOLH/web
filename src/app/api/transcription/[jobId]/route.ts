import { NextRequest } from 'next/server'

import { transcriptionController } from '@/server/domains/transcription'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { jobId } = await params
  return transcriptionController.getJobStatus(jobId, auth.session.user.id)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { jobId } = await params
  return transcriptionController.cancelJob(jobId, auth.session.user.id)
}
