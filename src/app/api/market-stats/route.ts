import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ success: false, error: 'slug required' }, { status: 400 });
    }
    const r = await fetch(`https://gamma-api.polymarket.com/markets/slug/${encodeURIComponent(slug)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    if (!r.ok) {
      return NextResponse.json({ success: false, error: 'upstream failed' }, { status: 502 });
    }
    const m = await r.json();
    const liquidity = pickNumber(m?.liquidityNum, m?.liquidityClob, m?.liquidityAmm, m?.liquidity);
    const volume24h = pickNumber(m?.volume24hr, m?.volume24h, m?.volume24hrClob, m?.volume24hrAmm, m?.volumeClob, m?.volumeAmm);
    const oneDayChange = pickNumber(m?.oneDayPriceChange, m?.oneDayChange);
    return NextResponse.json({ success: true, data: { liquidity, volume24h, oneDayChange } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'failed' }, { status: 500 });
  }
}

function pickNumber(...vals: any[]): number | undefined {
  for (const v of vals) {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}


