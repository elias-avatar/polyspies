import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const DATA_API = process.env.POLYMARKET_DATA_API_URL || 'https://data-api.polymarket.com';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    // Accept either ?market=0x.. (single) or ?markets=a,b,c
    const single = sp.get('market') || '';
    const many = sp.get('markets') || '';
    const limit = parseInt(sp.get('limit') || '5', 10);

    const marketsParam = [single, many]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .join(',');

    if (!marketsParam) {
      return NextResponse.json({ success: false, error: 'Missing market(s) parameter' }, { status: 400 });
    }

    const url = `${DATA_API}/holders`;
    const { data } = await axios.get(url, {
      params: { market: marketsParam, limit },
      timeout: 15000,
    });

    // Normalize response into a simple map of token -> top holders
    const normalized = Array.isArray(data)
      ? data.map((entry: any) => ({
          token: entry?.token,
          holders: Array.isArray(entry?.holders)
            ? entry.holders.map((h: any) => ({
                proxyWallet: h?.proxyWallet,
                amount: h?.amount,
                name: h?.name || h?.pseudonym || h?.proxyWallet,
                outcomeIndex: h?.outcomeIndex,
                profileImage: h?.profileImageOptimized || h?.profileImage || undefined,
              }))
            : [],
        }))
      : [];

    return NextResponse.json({ success: true, data: normalized, count: normalized.length });
  } catch (error: any) {
    console.error('holders route error', error?.message || error);
    return NextResponse.json({ success: false, error: 'Failed to fetch holders' }, { status: 500 });
  }
}


