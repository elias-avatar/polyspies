import { NextResponse } from 'next/server';
import { arbitrageScanner } from '@/lib/arbitrage/scanner';

export async function POST() {
  try {
    console.log('Starting arbitrage scan...');
    const opportunities = await arbitrageScanner.findOpportunities();

    return NextResponse.json({
      success: true,
      message: `Found ${opportunities.length} arbitrage opportunities`,
      count: opportunities.length,
      data: opportunities.slice(0, 10), // Return top 10
    });
  } catch (error: any) {
    console.error('Error scanning for arbitrage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to scan for arbitrage' },
      { status: 500 }
    );
  }
}

