import { NextRequest } from 'next/server'

import { userController } from '@/server/domains/user'

export async function POST(request: NextRequest) {
  return userController.dismissActivationChecklist(request)
}
