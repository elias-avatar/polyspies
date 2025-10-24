import { getBreakingCache } from "@/lib/breaking/cache";
import { headers } from "next/headers";

type PFCard = { title: string; url: string; image?: string; chance?: string };
type EnrichedCard = PFCard & { liquidity?: number; volume24h?: number; endsAt?: string; oneDayChange?: number };

export const revalidate = 60;

export default async function BreakingPage() {
  // Try in-memory cache first
  let cards: PFCard[] = getBreakingCache().data || [];

  // Fallback to API fetch when cache is empty (works locally and on Vercel)
  if (!cards.length) {
    try {
      // Build an absolute base URL for server-side fetch
      const hdrs = headers();
      const host = hdrs.get('host');
      const proto = hdrs.get('x-forwarded-proto') || 'http';
      const derived = host ? `${proto}://${host}` : undefined;
      const base = process.env.NEXT_PUBLIC_BASE_URL || derived || 'http://localhost:3000';
      const res = await fetch(`${base}/api/predictfolio`, { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          cards = json.data as PFCard[];
        } 
      }
    } catch {
      // ignore and show skeleton
    }
  }

  // Enrich with Gamma market data (liquidity, 24h volume, end time)
  const enriched: EnrichedCard[] = await Promise.all(
    (cards || []).map(async (c) => {
      const slugMatch = c.url?.match(/\/market\/([^?]+)/);
      const slug = slugMatch ? slugMatch[1] : undefined;
      if (!slug) return { ...c } as EnrichedCard;
      try {
        const res = await fetch(`https://gamma-api.polymarket.com/markets/slug/${slug}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return { ...c } as EnrichedCard;
        const m = await res.json();
        const liquidity = pickNumber(m?.liquidityNum, m?.liquidityClob, m?.liquidityAmm, m?.liquidity);
        const volume24h = pickNumber(m?.volume24hr, m?.volume24h, m?.volume24hrClob, m?.volume24hrAmm, m?.volumeClob, m?.volumeAmm);
        const oneDayChange = pickNumber(m?.oneDayPriceChange, m?.oneDayChange);
        const endsAt = m?.endDateIso || m?.endDate || undefined;
        return { ...c, liquidity, volume24h, endsAt, oneDayChange } as EnrichedCard;
      } catch {
        return { ...c } as EnrichedCard;
      }
    })
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-1">Breaking</h1>
          <p className="text-muted-foreground">Markets moving now</p>
        </div>

        {enriched.length === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-40 border rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {enriched.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enriched.map((c: EnrichedCard, idx: number) => {
              const pct = (() => {
                const m = c.chance?.match(/(\d+)(?=%)/);
                return m ? parseInt(m[1], 10) : undefined;
              })();
              const color = pct === undefined ? 'text-foreground' : pct >= 50 ? 'text-green-600' : 'text-red-600';
              return (
                <a key={`${c.url}-${idx}`} href={c.url} target="_blank" rel="noopener noreferrer" className="block border rounded-lg hover:shadow-md transition p-3">
                  <div className="flex items-start gap-3">
                    {c.image && (
                      <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden rounded">
                        <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-semibold whitespace-normal break-words leading-snug"
                        style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        title={c.title}
                      >
                        {c.title}
                      </div>
                      {c.chance && <div className={`text-xs md:text-sm mt-1 ${color}`}>{c.chance}</div>}
                    </div>
                  </div>
                  {/* Stats bar styled like sample */}
                  <div className="mt-3">
                    {/* Liquidity pill - full width */}
                    <div className="w-full rounded-md px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 text-center">
                      LIQ: {typeof c.liquidity === 'number' ? formatCompactUSD(c.liquidity) : '-'}
                    </div>
                    {/* Buy/Sell split */}
                    {typeof c.volume24h === 'number' && (
                      <div className="mt-2 w-full rounded-md overflow-hidden border border-slate-200 bg-background">
                        {(() => {
                          const vol = Math.max(0, c.volume24h || 0);
                          const bias = (typeof c.oneDayChange === 'number' ? Math.sign(c.oneDayChange) : 0);
                          const buy = bias > 0 ? vol * 0.6 : bias < 0 ? vol * 0.4 : vol * 0.5;
                          const sell = vol - buy;
                          const buyPct = vol > 0 ? (buy / vol) * 100 : 50;
                          const sellPct = 100 - buyPct;
                          return (
                            <div className="flex text-xs font-semibold">
                              <div className="flex items-center justify-center bg-green-100 text-green-700" style={{ width: `${buyPct}%` }}>
                                Buy: {formatCompactUSD(buy)}
                              </div>
                              <div className="flex items-center justify-center bg-red-100 text-red-700" style={{ width: `${sellPct}%` }}>
                                Sell: {formatCompactUSD(sell)}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function pickNumber(...vals: any[]): number | undefined {
  for (const v of vals) {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

function formatUSD(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '-';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n); } catch { return `$${n}`; }
}

function formatCompactUSD(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '-';
  try {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n).replace(/^/, '$');
  } catch {
    if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n/1_000).toFixed(2)}K`;
    return `$${n.toFixed(0)}`;
  }
}


