import { NextRequest } from 'next/server'

import { impersonationLogController } from '@/server/domains/impersonation'
import { withAdminRateLimit } from '@/server/shared/middleware/rate-limit.middleware'

export async function GET(request: NextRequest) {
  return withAdminRateLimit(request, (req) =>
    impersonationLogController.getSessionLogs(req),
  )
}
