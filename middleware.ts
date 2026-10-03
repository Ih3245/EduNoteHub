import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip auth for login page and auth API
  if (
    path === '/login' ||
    path === '/api/auth' ||
    path === '/api/me' ||
    path.startsWith('/_next') ||
    path === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('edunote_auth');

  if (!authCookie?.value) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Cookie exists — allow through.
  // Session revocation is handled server-side in /api/sessions DELETE.
  // No DB call here keeps Edge latency near-zero.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
