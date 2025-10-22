import { NextRequest, NextResponse } from 'next/server';
import { polymarketClient } from '@/lib/polymarket/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const tagId = searchParams.get('tag_id');
    const order = searchParams.get('order') || 'id';
    const ascending = (searchParams.get('ascending') || 'false') === 'true';
    const sortBy = (searchParams.get('sortBy') || '').toLowerCase();

    let markets: any[] = [];
    // Prefer fetching via events when no search, optionally filtered by tag
    let polymarkets;
    if (search) {
      polymarkets = await polymarketClient.searchMarkets(search, limit);
    } else {
      const events = await polymarketClient.getEvents({ closed: false, limit, offset, tagId: tagId || undefined });
      polymarkets = events.flatMap(e => e.markets || []);
    }
    markets.push(...polymarkets);

    // Optional sorting
    // slice not needed; server returns requested page
    if (sortBy) {
      if (sortBy === 'enddate') {
        markets.sort((a, b) => (a.endDate?.getTime?.() || 0) - (b.endDate?.getTime?.() || 0));
      } else if (sortBy === 'liquidity') {
        markets.sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0));
      } else if (sortBy === 'volume') {
        markets.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
      } else if (sortBy === 'updated') {
        markets.sort((a, b) => (b.lastUpdated?.getTime?.() || 0) - (a.lastUpdated?.getTime?.() || 0));
      }
    }

    return NextResponse.json({
      success: true,
      data: markets,
      count: markets.length,
    });
  } catch (error: any) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}

