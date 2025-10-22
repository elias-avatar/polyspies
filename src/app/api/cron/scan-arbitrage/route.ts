import { NextRequest, NextResponse } from 'next/server';
import { arbitrageScanner } from '@/lib/arbitrage/scanner';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Starting arbitrage scan...');
    const opportunities = await arbitrageScanner.findOpportunities();

    console.log(`[CRON] Scan complete: ${opportunities.length} opportunities found`);

    return NextResponse.json({
      success: true,
      message: `Scanned and found ${opportunities.length} opportunities`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON] Error in arbitrage scan:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

