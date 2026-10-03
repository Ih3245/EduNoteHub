import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// In-memory cache (per serverless instance)
let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 10_000; // 10 seconds

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Credentials missing' }, { status: 500 });
    }

    // Return cached response if fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json({ success: true, notes: cache.data }, {
        headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=30' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    // Update cache
    cache = { data, ts: Date.now() };

    return NextResponse.json({ success: true, notes: data }, {
      headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=30' }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// Invalidate cache after upload
export async function POST() {
  cache = null;
  return NextResponse.json({ ok: true });
}
