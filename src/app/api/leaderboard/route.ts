import { NextRequest, NextResponse } from 'next/server';
import { scrapePredictingTop } from '@/lib/leaderboard/scraper';

export async function GET(_req: NextRequest) {
  try {
    const data = await scrapePredictingTop();
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'failed' }, { status: 500 });
  }
}

// scraper moved to lib/leaderboard/scraper


