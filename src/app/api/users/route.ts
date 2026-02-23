import { NextRequest } from 'next/server'

import { userController } from '@/server/domains/user'

export async function GET(request: NextRequest) {
  return userController.getUsers(request)
}

export async function POST(request: NextRequest) {
  return userController.createUser(request)
}
