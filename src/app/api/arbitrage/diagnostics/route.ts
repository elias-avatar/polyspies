import { NextRequest, NextResponse } from 'next/server';
import { polymarketClient } from '@/lib/polymarket/client';
import { kalshiClient } from '@/lib/kalshi/client';
import { matchMarkets } from '@/lib/unified/transformer';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '25');

    const [polymarkets, kalshiMarkets] = await Promise.all([
      polymarketClient.getMarkets({ closed: false, limit: 200 }),
      kalshiClient.getMarkets({ status: 'open', limit: 200 }),
    ]);

    const matches = matchMarkets(polymarkets, kalshiMarkets)
      .slice(0, limit)
      .map(m => ({
        similarity: Number(m.similarity.toFixed(3)),
        polymarket: {
          id: m.polymarket.id,
          title: m.polymarket.title,
          category: m.polymarket.category,
          yesPrice: m.polymarket.yesPrice,
          noPrice: m.polymarket.noPrice,
          endDate: m.polymarket.endDate,
          url: m.polymarket.url,
        },
        kalshi: {
          id: m.kalshi.id,
          title: m.kalshi.title,
          category: m.kalshi.category,
          yesPrice: m.kalshi.yesPrice,
          noPrice: m.kalshi.noPrice,
          endDate: m.kalshi.endDate,
          url: m.kalshi.url,
        },
      }));

    return NextResponse.json({ success: true, count: matches.length, matches });
  } catch (error: any) {
    console.error('Diagnostics error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed diagnostics' },
      { status: 500 }
    );
  }
}


