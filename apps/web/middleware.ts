import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

/**
 * Lightweight auth gate. The session cookie is httpOnly but still sent to the
 * Next server, so middleware can check presence (not validity — the API is the
 * source of truth and rejects bad/expired tokens on every call).
 */
export function middleware(req: NextRequest): NextResponse {
  const isAuthed = Boolean(req.cookies.get(SESSION_COOKIE_NAME));
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/dashboard') && !isAuthed) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if ((pathname === '/login' || pathname === '/register') && isAuthed) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
