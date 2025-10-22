import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const DATA_API = process.env.POLYMARKET_DATA_API_URL || 'https://data-api.polymarket.com';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const user = sp.get('user') || '';
    const markets = sp.get('markets') || '';
    const limit = parseInt(sp.get('limit') || '100', 10);
    const offset = parseInt(sp.get('offset') || '0', 10);
    const side = sp.get('side') || undefined; // BUY | SELL
    const global = sp.get('global') === 'true';

    if (!user && !markets && !global) {
      return NextResponse.json({ success: false, error: 'Provide user or markets' }, { status: 400 });
    }

    const params: Record<string, any> = { limit, offset };
    if (user) params.user = user;
    if (markets) params.market = markets; // comma-separated conditionIds
    if (side) params.side = side;

    const { data } = await axios.get(`${DATA_API}/trades`, { params, timeout: 20000 });
    const trades = Array.isArray(data) ? data : [];

    // Normalize price to cents (0-100)
    const normalized = trades.map((t: any) => ({
      proxyWallet: t?.proxyWallet,
      side: t?.side,
      conditionId: t?.conditionId,
      size: t?.size,
      price: typeof t?.price === 'number' ? (t.price <= 1 ? t.price * 100 : t.price) : undefined,
      timestamp: t?.timestamp,
      title: t?.title,
      slug: t?.slug,
      outcome: t?.outcome,
      outcomeIndex: t?.outcomeIndex,
      name: t?.name || t?.pseudonym || t?.proxyWallet,
      profileImage: t?.profileImageOptimized || t?.profileImage || undefined,
      transactionHash: t?.transactionHash,
    }));

    return NextResponse.json({ success: true, data: normalized, count: normalized.length });
  } catch (error: any) {
    console.error('trades route error', error?.message || error);
    return NextResponse.json({ success: false, error: 'Failed to fetch trades' }, { status: 500 });
  }
}


