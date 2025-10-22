import { NextRequest, NextResponse } from 'next/server';
import { polymarketClient } from '@/lib/polymarket/client';
import { kalshiClient } from '@/lib/kalshi/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = (searchParams.get('platform') || 'all').toLowerCase();

    const responses: Array<{ platform: 'polymarket' | 'kalshi'; id: string; name: string; related?: any[] }>[] = [] as any;

    const tasks: Promise<any>[] = [];
    if (platform === 'polymarket' || platform === 'all') {
      tasks.push(
        polymarketClient.getTags().then((tags: any[]) =>
          (tags || []).map((t: any) => {
            const id = String(t?.id ?? (typeof t === 'string' ? t : t?.slug || ''));
            const name = (t?.label || t?.name || t?.slug || id) as string;
            // If API returns related_tags, plumb them through
            const related = Array.isArray((t as any)?.related_tags)
              ? (t as any).related_tags.map((rt: any) => ({ id: String(rt?.id ?? rt), name: rt?.label || rt?.name || rt?.slug || String(rt?.id ?? rt) }))
              : [];
            return { platform: 'polymarket' as const, id, name, related };
          })
        )
      );
    }
    if (platform === 'kalshi' || platform === 'all') {
      tasks.push(
        kalshiClient.getSeries().then(series =>
          (series || []).map((s: any) => ({ platform: 'kalshi' as const, id: s.ticker, name: s.title || s.ticker }))
        )
      );
    }

    const results = await Promise.all(tasks);
    const flat = results.flat();

    return NextResponse.json({ success: true, data: flat, count: flat.length });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}


