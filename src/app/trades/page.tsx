"use client";

import * as React from 'react';
import useSWR from 'swr';
import Link from 'next/link';

type Trade = {
  proxyWallet: string;
  side: 'BUY'|'SELL';
  conditionId: string;
  size: number;
  price?: number; // cents
  timestamp: number;
  title?: string;
  slug?: string;
  icon?: string;
  outcome?: string;
  name?: string;
  profileImage?: string;
  transactionHash?: string;
};

const fetcher = (url: string) => fetch(url).then(r=>r.json());

function normalizeImageUrl(u?: string): string | undefined {
  if (!u || typeof u !== 'string') return undefined;
  let url = u.trim();
  if (!url) return undefined;
  // Handle protocol-relative URLs
  if (url.startsWith('//')) url = `https:${url}`;
  // Handle ipfs://CID or ipfs://ipfs/CID
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://ipfs/', '').replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return url;
}

export default function TradesFeedPage() {
  const [limit, setLimit] = React.useState(200);
  const [view, setView] = React.useState<'table'|'grid'>('grid');
  const { data, isLoading, error, mutate } = useSWR(`/api/trades?global=true&limit=${limit}`, fetcher, { refreshInterval: 10_000, revalidateOnFocus: false });
  const trades: Trade[] = data?.data || [];

  // Enrich unique markets with liquidity for bucketing
  const [liqMap, setLiqMap] = React.useState<Record<string, number | undefined>>({});
  // Address -> avatar fallback from leaderboard
  const [avatarMap, setAvatarMap] = React.useState<Record<string, string | undefined>>({});
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/leaderboard/daily', { cache: 'no-store' });
        const j = await r.json();
        if (Array.isArray(j?.data)) {
          const map: Record<string, string> = {};
          (j.data as any[]).forEach((row) => {
            const addr = (row?.address || '').toLowerCase();
            if (addr && row?.avatar) map[addr] = row.avatar as string;
          });
          setAvatarMap(map);
        }
      } catch {}
    })();
  }, []);
  React.useEffect(() => {
    (async () => {
      const slugs = Array.from(new Set(trades.map(t => t.slug).filter(Boolean) as string[]));
      if (!slugs.length) return;
      const entries: [string, number | undefined][] = [];
      await Promise.allSettled(slugs.map(async (slug) => {
        try { const r = await fetch(`/api/market-stats?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' }); const j = await r.json(); if (j?.success) entries.push([slug, j.data?.liquidity]); } catch {}
      }));
      setLiqMap(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [trades]);

  const fmtTime = (ts?: number) => {
    if (!ts) return '';
    const delta = Date.now() - ts * 1000;
    const s = Math.max(1, Math.floor(delta / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };
  const fmtCents = (n?: number) => (typeof n==='number' ? `${n.toFixed(1)}¢` : '-');

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-3 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Trades</h1>
            <p className="text-sm text-muted-foreground">Realtime feed from leaderboard traders</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button className={`border rounded px-3 py-1 ${view==='table'?'bg-primary text-primary-foreground':''}`} onClick={()=>setView('table')}>Table</button>
            <button className={`border rounded px-3 py-1 ${view==='grid'?'bg-primary text-primary-foreground':''}`} onClick={()=>setView('grid')}>Grid</button>
            <label className="text-muted-foreground">Limit</label>
            <select value={limit} onChange={(e)=> setLimit(Number(e.target.value))} className="border rounded px-2 py-1 bg-background">
              {[50,100,200,500].map(v=> <option key={v} value={v}>{v}</option>)}
            </select>
            <button className="border rounded px-3 py-1" onClick={()=> mutate()}>Refresh</button>
          </div>
        </div>

        {view === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-md">
            <thead className="bg-muted">
              <tr className="text-left select-none">
                <th className="p-2">Time</th>
                <th className="p-2">Trader</th>
                <th className="p-2">Side</th>
                <th className="p-2">Outcome</th>
                <th className="p-2">Price</th>
                <th className="p-2">Size</th>
                <th className="p-2">Market</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && trades.map((t, i) => (
                <tr key={`${t.transactionHash || t.timestamp}-${i}`} className="border-t align-middle">
                  <td className="p-2 whitespace-nowrap">{fmtTime(t.timestamp)}</td>
                  <td className="p-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        { (() => { const src = normalizeImageUrl(t.profileImage) || (t.proxyWallet && normalizeImageUrl(avatarMap[t.proxyWallet.toLowerCase()])); return src ? <img src={src} alt={t.name || 'pfp'} className="w-full h-full object-cover" /> : null; })() }
                      </div>
                      <Link href={t.proxyWallet ? `/user/${t.proxyWallet}` : '#'} className="underline">
                        {(t.name && t.name.trim()) ? t.name : (t.proxyWallet ? t.proxyWallet.slice(0,6) : '')}
                      </Link>
                    </div>
                  </td>
                  <td className={`p-2 font-medium ${t.side==='BUY'?'text-green-600':'text-red-600'}`}>{t.side}</td>
                  <td className="p-2">{t.outcome ?? '-'}</td>
                  <td className="p-2">{fmtCents(t.price)}</td>
                  <td className="p-2">{t.size?.toLocaleString('en-US')}</td>
                   <td className="p-2 max-w-[560px]">
                    <div className="flex items-start gap-2">
                      {t.icon && <div className="w-5 h-5 rounded-sm overflow-hidden flex-shrink-0"><img src={t.icon} alt="" className="w-full h-full object-cover" /></div>}
                       {t.slug ? (
                        <a href={`https://polymarket.com/market/${t.slug}`} target="_blank" rel="noopener noreferrer" className="underline min-w-0">
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.title || t.slug}</span>
                        </a>
                      ) : (
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.title || '-'}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : (
        // Grid view grouped by liquidity buckets
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['Low Caps','$100k+','$500k+'] as const).map((bucketLabel, idx) => {
            const ranges = [ [0, 100_000], [100_000, 500_000], [500_000, Infinity] ] as [number, number][];
            const [min, max] = ranges[idx];
            const markets = Object.values(
              trades.reduce((acc: Record<string, { slug?: string; title?: string; icon?: string; liq?: number; trades: Trade[] }>, t) => {
                const slug = t.slug; if (!slug) return acc;
                const liq = liqMap[slug];
                if (liq === undefined) return acc;
                if (liq < min || liq >= max) return acc;
                if (!acc[slug]) acc[slug] = { slug, title: t.title, icon: t.icon, liq, trades: [] };
                acc[slug].trades.push(t);
                return acc;
              }, {})
            ).sort((a,b)=> (b.liq||0)-(a.liq||0));

            return (
              <div key={bucketLabel}>
                <h2 className="text-lg font-semibold mb-2">{bucketLabel}</h2>
                <div className="space-y-3">
                  {markets.map(mkt => (
                    <div key={mkt.slug} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {mkt.icon && <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0"><img src={mkt.icon} alt="" className="w-full h-full object-cover"/></div>}
                          <a href={mkt.slug ? `https://polymarket.com/market/${mkt.slug}` : '#'} target="_blank" rel="noopener noreferrer" className="font-medium truncate hover:underline">{mkt.title || mkt.slug}</a>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">LIQ: {typeof mkt.liq==='number'? new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(mkt.liq).replace(/^/,'$') : '-'}</div>
                      </div>
                      <div className="divide-y">
                        {mkt.trades.slice(0,8).map((t, i) => (
                          <div key={`${t.transactionHash || t.timestamp}-${i}`} className="py-1.5 flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-muted flex-shrink-0">{ (() => { const src = normalizeImageUrl(t.profileImage) || (t.proxyWallet && normalizeImageUrl(avatarMap[t.proxyWallet.toLowerCase()])); return src ? <img src={src} alt="" className="w-full h-full object-cover"/> : null; })() }</div>
                              <Link href={t.proxyWallet ? `/user/${t.proxyWallet}` : '#'} className="truncate hover:underline">{(t.name && t.name.trim()) ? t.name : (t.proxyWallet ? t.proxyWallet.slice(0,6) : '')}</Link>
                              <span className={`font-medium ${t.side==='BUY'?'text-green-600':'text-red-600'}`}>{t.side}</span>
                              <span className="text-muted-foreground truncate">{t.outcome ?? '-'}</span>
                            </div>
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              <span>{fmtCents(t.price)}</span>
                              <span>{t.size?.toLocaleString('en-US')}</span>
                              <span className="text-muted-foreground">{fmtTime(t.timestamp)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {markets.length === 0 && <div className="text-sm text-muted-foreground">No markets in this range yet.</div>}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}


