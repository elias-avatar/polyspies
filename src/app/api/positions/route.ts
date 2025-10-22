import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const DATA_API = process.env.POLYMARKET_DATA_API_URL || 'https://data-api.polymarket.com';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const user = sp.get('user');
    if (!user) return NextResponse.json({ success: false, error: 'Missing user' }, { status: 400 });

    const params: Record<string, any> = {
      user,
      limit: parseInt(sp.get('limit') || '100', 10),
      offset: parseInt(sp.get('offset') || '0', 10),
    };
    if (sp.get('market')) params.market = sp.get('market');
    if (sp.get('sizeThreshold')) params.sizeThreshold = sp.get('sizeThreshold');
    if (sp.get('redeemable')) params.redeemable = sp.get('redeemable');
    if (sp.get('mergeable')) params.mergeable = sp.get('mergeable');
    if (sp.get('sortBy')) params.sortBy = sp.get('sortBy');
    if (sp.get('sortDirection')) params.sortDirection = sp.get('sortDirection');

    const { data } = await axios.get(`${DATA_API}/positions`, { params, timeout: 20000 });
    const arr = Array.isArray(data) ? data : [];

    const norm = arr.map((p: any) => ({
      proxyWallet: p?.proxyWallet,
      conditionId: p?.conditionId,
      size: p?.size,
      avgPrice: typeof p?.avgPrice === 'number' ? (p.avgPrice <= 1 ? p.avgPrice * 100 : p.avgPrice) : undefined,
      curPrice: typeof p?.curPrice === 'number' ? (p.curPrice <= 1 ? p.curPrice * 100 : p.curPrice) : undefined,
      initialValue: p?.initialValue,
      currentValue: p?.currentValue,
      cashPnl: p?.cashPnl,
      percentPnl: p?.percentPnl,
      totalBought: p?.totalBought,
      realizedPnl: p?.realizedPnl,
      percentRealizedPnl: p?.percentRealizedPnl,
      redeemable: p?.redeemable,
      mergeable: p?.mergeable,
      title: p?.title,
      slug: p?.slug,
      outcome: p?.outcome,
      outcomeIndex: p?.outcomeIndex,
      endDate: p?.endDate,
    }));

    return NextResponse.json({ success: true, data: norm, count: norm.length });
  } catch (e: any) {
    console.error('positions error', e?.message || e);
    return NextResponse.json({ success: false, error: 'Failed to fetch positions' }, { status: 500 });
  }
}


