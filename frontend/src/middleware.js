import { NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/profile', '/admin', '/seller/dashboard', '/cart', '/wishlist'];

function isProtectedRoute(pathname) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Do not redirect away from auth pages when a session cookie exists — that caused
  // unexpected navigations to "/" and blocked login/register when a stale token was present.

  if (!token && isProtectedRoute(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
