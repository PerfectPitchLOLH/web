import { NextRequest, NextResponse } from 'next/server'

import { ImpersonationLogRepository } from '@/server/domains/impersonation/impersonation-log.repository'
import { ImpersonationLogService } from '@/server/domains/impersonation/impersonation-log.service'
import { auth } from '@/server/lib/auth'

const impersonationLogRepository = new ImpersonationLogRepository()
const impersonationLogService = new ImpersonationLogService(
  impersonationLogRepository,
)

function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  return null
}

export async function withImpersonationLogging(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  const session = await auth()

  if (!session?.impersonation?.isActive) {
    return handler(request)
  }

  const startTime = Date.now()
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent')
  const { pathname } = request.nextUrl
  const method = request.method

  let requestBody: unknown = null
  try {
    if (method !== 'GET' && method !== 'HEAD') {
      const clonedRequest = request.clone()
      requestBody = await clonedRequest.json()
    }
  } catch {
    requestBody = null
  }

  const response = await handler(request)

  const duration = Date.now() - startTime

  let responseBody: unknown = null
  try {
    const clonedResponse = response.clone()
    responseBody = await clonedResponse.json()
  } catch {
    responseBody = null
  }

  await impersonationLogService.logAction(
    session.impersonation.sessionId,
    session.impersonation.adminId,
    session.user.id,
    {
      action: `${method} ${pathname}`,
      method,
      path: pathname,
      statusCode: response.status,
      requestBody,
      responseBody,
      ip,
      userAgent,
      duration,
      adminName: session.impersonation.adminEmail || 'Unknown Admin',
      targetUserName: session.user.name || session.user.email || 'Unknown User',
    },
  )

  return response
}
