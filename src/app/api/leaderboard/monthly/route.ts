import { NextResponse } from 'next/server';
import { scrapePredictingTop } from '@/lib/leaderboard/scraper';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await scrapePredictingTop('monthly');
    return NextResponse.json({ success: true, timeframe: 'monthly', data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'failed' }, { status: 500 });
  }
}


