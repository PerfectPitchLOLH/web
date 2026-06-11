import { NextRequest } from 'next/server'

import { userController } from '@/server/domains/user'

export async function GET(request: NextRequest) {
  return userController.getActivationStatus(request)
}
