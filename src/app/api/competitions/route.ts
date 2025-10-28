import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store during development. Replace with DB later.
type Match = {
  id: string;
  playerA: { address: string; name?: string; avatar?: string };
  playerB: { address: string; name?: string; avatar?: string };
  timeframe: '1D'|'1W'|'1M';
  startedAt: number; // epoch seconds
  endsAt: number; // epoch seconds
  createdBy: string; // address
};

const store: { matches: Match[] } = { matches: [] };

export async function GET(req: NextRequest) {
  const onlyOfficial = req.nextUrl.searchParams.get('official') === '1';
  if (!onlyOfficial) {
    return NextResponse.json({ success: true, data: store.matches });
  }
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const r = await fetch(`${base}/api/leaderboard/daily`, { cache: 'no-store' });
    const j = await r.json();
    const addrs = new Set<string>(Array.isArray(j?.data) ? j.data.map((x: any) => String(x?.address || '').toLowerCase()) : []);
    const official = store.matches.filter(m => addrs.has(m.createdBy.toLowerCase()));
    return NextResponse.json({ success: true, data: official });
  } catch {
    // Fallback to none if leaderboard fetch fails
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerA, playerB, timeframe, durationHours = 24, createdBy } = body || {};
    if (!playerA?.address || !playerB?.address || !timeframe || !createdBy) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }
    const now = Math.floor(Date.now()/1000);
    const endsAt = now + Math.max(1, Math.floor(Number(durationHours))) * 3600;
    const match: Match = {
      id: `m_${now}_${Math.random().toString(36).slice(2,8)}`,
      playerA, playerB,
      timeframe,
      startedAt: now,
      endsAt,
      createdBy,
    };
    store.matches.unshift(match);
    return NextResponse.json({ success: true, data: match });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to create' }, { status: 500 });
  }
}


