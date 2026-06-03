import { NextResponse } from 'next/server'

import { auth } from '@/server/lib/auth'
import { auditLogger } from '@/server/shared/utils'

export const runtime = 'nodejs'

function getClientIP(request: Request): string | null {
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

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth
  const ip = getClientIP(req)

  if (!isAuthenticated && pathname.startsWith('/dashboard')) {
    auditLogger.logUnauthorizedAccess(
      pathname,
      ip,
      'Unauthenticated access to dashboard',
    )
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  if (isAuthenticated && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  const response = NextResponse.next()

  if (isAuthenticated && !req.cookies.get('nv_visited')) {
    response.cookies.set('nv_visited', '1', {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  return response
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
