import { NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'

import { auth } from '@/server/lib/auth'
import { auditLogger } from '@/server/shared/utils'

import { routing } from './i18n/routing'

export const runtime = 'nodejs'

const intlMiddleware = createMiddleware(routing)

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

function isAuthOnlyPage(pathname: string): boolean {
  return (
    pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup')
  )
}

function isLandingPath(pathname: string): boolean {
  return (
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api')
  )
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

  if (isAuthenticated && isAuthOnlyPage(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (isLandingPath(pathname)) {
    return intlMiddleware(req)
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
