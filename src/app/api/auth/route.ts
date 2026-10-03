import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CORRECT_PIN = process.env.APP_PIN || '01407286010';
const BLOCK_TIME_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const attemptsMap = new Map<string, { count: number, blockedUntil: number }>();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown Device';
    const body = await request.json();
    const pin = body.pin;

    const now = Date.now();
    const record = attemptsMap.get(ip) || { count: 0, blockedUntil: 0 };

    if (record.blockedUntil > now) {
      const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
      return NextResponse.json({ error: `Too many wrong attempts. Blocked for ${remainingMinutes} minutes.` }, { status: 429 });
    }

    if (pin === CORRECT_PIN) {
      attemptsMap.delete(ip);
      
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      const { data, error } = await supabase.from('sessions').insert([{ ip_address: ip, device_info: userAgent }]).select();

      if (error || !data) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
      }

      const sessionId = data[0].id;
      
      const response = NextResponse.json({ success: true });
      response.cookies.set('edunote_auth', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });
      return response;
    }

    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_TIME_MS;
      record.count = 0;
    }
    attemptsMap.set(ip, record);
    
    const remaining = MAX_ATTEMPTS - record.count;
    if (record.blockedUntil > now) {
      return NextResponse.json({ error: `Blocked for 10 minutes due to 3 wrong attempts.` }, { status: 429 });
    }
    
    return NextResponse.json({ error: `Incorrect PIN. ${remaining} attempts remaining.` }, { status: 401 });

  } catch (err: any) {
    console.error("Auth Error:", err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
