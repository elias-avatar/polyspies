import { NextRequest, NextResponse } from 'next/server';
import { arbitrageScanner } from '@/lib/arbitrage/scanner';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const minGap = parseFloat(searchParams.get('minGap') || '0');
    const sortBy = searchParams.get('sortBy') as 'gap' | 'profit' | 'detected' || 'gap';
    const limit = parseInt(searchParams.get('limit') || '50');

    const opportunities = await arbitrageScanner.getActiveOpportunities({
      minGap,
      sortBy,
      limit,
    });

    const stats = await arbitrageScanner.getStats();

    return NextResponse.json({
      success: true,
      data: opportunities,
      stats,
      count: opportunities.length,
    });
  } catch (error: any) {
    console.error('Error fetching arbitrage opportunities:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}

