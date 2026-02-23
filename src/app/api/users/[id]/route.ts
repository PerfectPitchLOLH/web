import { NextRequest } from 'next/server'

import { userController } from '@/server/domains/user'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return userController.getUserById(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return userController.updateUser(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return userController.deleteUser(request, context)
}
