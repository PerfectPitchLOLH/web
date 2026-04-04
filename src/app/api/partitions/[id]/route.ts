import { NextRequest } from 'next/server'

import { partitionController } from '@/server/domains/partition'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { id } = await params
  return partitionController.getOne(auth.session.user.id, id)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { id } = await params
  return partitionController.patch(auth.session.user.id, id, request)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { id } = await params
  return partitionController.remove(auth.session.user.id, id)
}
