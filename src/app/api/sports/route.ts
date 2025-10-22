import { NextRequest, NextResponse } from 'next/server';
import { polymarketClient } from '@/lib/polymarket/client';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const type = sp.get('type') || 'meta'; // 'meta' | 'teams'
    if (type === 'teams') {
      const league = sp.getAll('league');
      const name = sp.getAll('name');
      const abbreviation = sp.getAll('abbreviation');
      const limit = parseInt(sp.get('limit') || '100', 10);
      const offset = parseInt(sp.get('offset') || '0', 10);
      const teams = await polymarketClient.getTeams({
        league: league.length ? league : undefined,
        name: name.length ? name : undefined,
        abbreviation: abbreviation.length ? abbreviation : undefined,
        limit,
        offset,
      });
      return NextResponse.json({ success: true, data: teams, count: teams.length });
    }
    const sports = await polymarketClient.getSportsMeta();
    return NextResponse.json({ success: true, data: sports, count: sports.length });
  } catch (e: any) {
    console.error('sports route error', e?.message || e);
    return NextResponse.json({ success: false, error: 'Failed to fetch sports' }, { status: 500 });
  }
}


