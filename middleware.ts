import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  if (path === '/login' || path === '/api/auth' || path.startsWith('/_next') || path === '/favicon.ico') {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('edunote_auth');
  
  const handleUnauthorized = () => {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  };

  if (!authCookie || !authCookie.value) {
    return handleUnauthorized();
  }

  // Fast Edge-compatible verification against Supabase REST API
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${authCookie.value}&select=id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    const data = await res.json();
    
    if (!data || data.length === 0) {
      // Session invalid or logged out remotely
      const response = handleUnauthorized();
      response.cookies.delete('edunote_auth');
      return response;
    }
    
    return NextResponse.next();
  } catch (err) {
    // Fail closed
    return handleUnauthorized();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
