import { NextRequest, NextResponse } from 'next/server';
import { polymarketClient } from '@/lib/polymarket/client';
import { kalshiClient } from '@/lib/kalshi/client';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ platform: string; id: string }> }
) {
  try {
    const { platform, id } = await context.params;

    let market = null;

    if (platform === 'polymarket') {
      market = await polymarketClient.getMarketById(id);
    } else if (platform === 'kalshi') {
      market = await kalshiClient.getMarketByTicker(id);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid platform' },
        { status: 400 }
      );
    }

    if (!market) {
      return NextResponse.json(
        { success: false, error: 'Market not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: market,
    });
  } catch (error: any) {
    console.error('Error fetching market:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch market' },
      { status: 500 }
    );
  }
}

