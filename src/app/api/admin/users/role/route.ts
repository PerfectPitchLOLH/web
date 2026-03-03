import { NextRequest } from 'next/server'

import { adminController } from '@/server/domains/admin'
import { withAdminRateLimit } from '@/server/shared/middleware/rate-limit.middleware'

export async function PATCH(request: NextRequest) {
  return withAdminRateLimit(request, async (req) => {
    return adminController.updateUserRole(req)
  })
}
