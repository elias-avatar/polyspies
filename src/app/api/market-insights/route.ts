import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get('url') || '';
    let slug: string | undefined;
    const m = rawUrl.match(/polymarket\.com\/(?:market|event)\/([^?]+)/);
    if (m) slug = m[1];
    if (!slug) return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 });

    const r = await fetch(`https://gamma-api.polymarket.com/markets/slug/${slug}`);
    if (!r.ok) return NextResponse.json({ success: false, error: 'Gamma not ok' }, { status: 502 });
    const data = await r.json();

    // Compute yes price
    const { yes, pct } = computeYes(data);
    // Build synopsis from description + quick stats
    const desc = (data?.description || '').toString().trim();
    const trimmed = desc ? desc.replace(/\s+/g,' ').slice(0, 260) + (desc.length>260 ? '…' : '') : undefined;
    const oneDay = normPct(data?.oneDayPriceChange);
    const volume24h = data?.volume24hr ?? data?.volume24hrAmm ?? data?.volume24hrClob;
    const end = data?.endDateIso || data?.end_date_iso || data?.endDate;
    const synopsis = [
      trimmed,
      pct !== undefined ? `Current Yes: ${pct.toFixed(0)}%` : undefined,
      oneDay !== undefined ? `24h Δ: ${oneDay.toFixed(0)}%` : undefined,
      volume24h !== undefined ? `24h Vol: ${formatCurrency(volume24h)}` : undefined,
      end ? `Ends: ${new Date(end).toLocaleString()}` : undefined,
    ].filter(Boolean).join(' • ');

    return NextResponse.json({
      success: true,
      data: {
        title: data?.question || data?.title,
        image: data?.image || data?.twitterCardImage,
        synopsis,
        yesPct: pct,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'insights failed' }, { status: 500 });
  }
}

function tryParseArr<T=any>(val: any): T[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string') {
    try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed as T[]; } catch {}
  }
  return undefined;
}

function computeYes(data: any): { yes?: number; pct?: number } {
  let yes: number | undefined;
  const outcomes = tryParseArr<string>(data?.outcomes) || tryParseArr<string>(data?.shortOutcomes);
  const prices = tryParseArr<number>(data?.outcomePrices);
  if (outcomes && prices) {
    const idx = outcomes.findIndex((o)=>String(o).toLowerCase()==='yes');
    if (idx>=0 && typeof prices[idx]==='number') yes = prices[idx];
  }
  if (typeof data?.bestBid === 'number' && yes === undefined) yes = data.bestBid;
  const pct = typeof yes === 'number' ? (yes <= 1 ? yes*100 : yes) : undefined;
  return { yes, pct };
}

function normPct(v: any): number | undefined {
  if (typeof v !== 'number') return undefined;
  return v <= 1 ? v*100 : v;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD'}).format(v);
}


