import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CORRECT_PIN = '01407286010';
const BLOCK_TIME_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

// In-memory store for rate limiting (works per-instance on Vercel)
const attemptsMap = new Map<string, { count: number, blockedUntil: number }>();

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const body = await request.json();
    const pin = body.pin;

    const now = Date.now();
    const record = attemptsMap.get(ip) || { count: 0, blockedUntil: 0 };

    // Check if blocked
    if (record.blockedUntil > now) {
      const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
      return NextResponse.json(
        { error: `Too many wrong attempts. Blocked for ${remainingMinutes} minutes.` },
        { status: 429 }
      );
    }

    // Verify PIN
    if (pin === CORRECT_PIN) {
      // Reset attempts on success
      attemptsMap.delete(ip);
      
      const response = NextResponse.json({ success: true });
      response.cookies.set('edunote_auth', 'authenticated_secure_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });
      return response;
    }

    // Wrong PIN
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_TIME_MS;
      record.count = 0; // Reset count for the next cycle after block
    }
    
    attemptsMap.set(ip, record);
    
    const remaining = MAX_ATTEMPTS - record.count;
    if (record.blockedUntil > now) {
      return NextResponse.json({ error: `Blocked for 10 minutes due to 3 wrong attempts.` }, { status: 429 });
    }
    
    return NextResponse.json({ error: `Incorrect PIN. ${remaining} attempts remaining.` }, { status: 401 });

  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
