import { NextRequest } from 'next/server'

import { devModeController } from '@/server/domains/dev-mode'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return devModeController.getStatus(request, auth.session.user.role)
}

export async function POST(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return devModeController.activate(request, auth.session.user.role)
}

export async function DELETE(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return devModeController.deactivate(request, auth.session.user.role)
}
