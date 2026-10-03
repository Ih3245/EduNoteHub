import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('edunote_auth')?.value || null;
  return NextResponse.json({ sessionId });
}
