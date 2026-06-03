import { NextRequest } from 'next/server'

import { partitionController } from '@/server/domains/partition'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { id } = await params
  return partitionController.musicXml(auth.session.user.id, id)
}
