import { NextRequest } from 'next/server'

import { partitionController } from '@/server/domains/partition'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { searchParams } = new URL(request.url)
  if (searchParams.has('similar')) {
    return partitionController.checkSimilarTitle(auth.session.user.id, request)
  }
  return partitionController.list(auth.session.user.id, request)
}

export async function POST(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return partitionController.save(auth.session.user.id, request)
}
