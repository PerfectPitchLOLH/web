import { NextRequest } from 'next/server'

import { partitionController } from '@/server/domains/partition'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return partitionController.lastOpened(auth.session.user.id)
}
