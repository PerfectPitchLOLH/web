import { NextRequest } from 'next/server'

import { impersonationController } from '@/server/domains/impersonation'
import { withAdminRateLimit } from '@/server/shared/middleware/rate-limit.middleware'

export async function POST(request: NextRequest) {
  return withAdminRateLimit(request, (req) =>
    impersonationController.endImpersonation(req),
  )
}
