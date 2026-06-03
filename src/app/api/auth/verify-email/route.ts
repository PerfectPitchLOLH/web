import { NextRequest } from 'next/server'

import { authController } from '@/server/domains/auth'

export async function GET(request: NextRequest) {
  return authController.verifyEmail(request)
}
