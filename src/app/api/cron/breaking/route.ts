import { NextRequest, NextResponse } from 'next/server';
import { setBreakingCache } from '@/lib/breaking/cache';

// In-memory cache (persists per server instance). For Vercel, this will refresh per lambda cold start.
// Good enough for MVP; can be replaced with KV or S3 later.
let cache: { data: any[]; updatedAt: number } = { data: [], updatedAt: 0 };

export async function GET(req: NextRequest) {
  try {
    // Build absolute base for local/dev use
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const base = `${proto}://${host}`;
    // Call the predictfolio route which includes bundle and Gamma fallbacks
    const r = await fetch(`${base}/api/predictfolio`, { cache: 'no-store' });
    const json = await r.json();
    if (json?.success) {
      cache = { data: json.data || [], updatedAt: Date.now() };
      setBreakingCache(cache.data, cache.updatedAt);
      return NextResponse.json({ success: true, data: cache.data, count: cache.data.length, updatedAt: cache.updatedAt }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      });
    }
    return NextResponse.json({ success: false, error: 'Upstream failed' }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Cron failed' }, { status: 500 });
  }
}

// Helper to expose cached data for pages if needed
export function getBreakingCache() {
  return cache;
}


