import { NextRequest } from 'next/server'

import { authController } from '@/server/domains/auth'

export async function POST(request: NextRequest) {
  return authController.signUp(request)
}
