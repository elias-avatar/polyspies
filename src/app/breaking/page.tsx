"use client";

import React from "react";

type PFCard = { title: string; url: string; image?: string; chance?: string };
type EnrichedCard = PFCard & { liquidity?: number; volume24h?: number; endsAt?: string; oneDayChange?: number };

export default function BreakingPage() {
  const [cards, setCards] = React.useState<PFCard[]>([]);
  const [enriched, setEnriched] = React.useState<EnrichedCard[]>([]);
  const [view, setView] = React.useState<'table'|'grid'>('table');
  const [sortKey, setSortKey] = React.useState<'none'|'title'|'chance'|'liq'|'buy'|'sell'>('none');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc');

  React.useEffect(() => {
    (async () => {
      try { const r = await fetch('/api/predictfolio', { cache: 'no-store' }); const j = await r.json(); if (j?.success) setCards(j.data || []); } catch {}
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      const out: EnrichedCard[] = [];
      await Promise.allSettled(cards.map(async (c) => {
        const m = c.url?.match(/\/market\/([^?]+)/); const slug = m ? m[1] : undefined; if (!slug) { out.push(c as EnrichedCard); return; }
        try { const r = await fetch(`/api/market-stats?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' }); const j = await r.json(); if (j?.success) out.push({ ...c, liquidity: j.data?.liquidity, volume24h: j.data?.volume24h, oneDayChange: j.data?.oneDayChange }); else out.push(c as EnrichedCard); } catch { out.push(c as EnrichedCard); }
      }));
      setEnriched(out);
    })();
  }, [cards]);

  const todayStr = React.useMemo(() => new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), []);

  function toggleSort(k: 'title'|'chance'|'liq'|'buy'|'sell') {
    if (sortKey !== k) { setSortKey(k); setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortDir('asc'); return; }
    setSortKey('none'); setSortDir('desc');
  }

  const tableRows = React.useMemo(() => {
    const arr = [...enriched]; if (sortKey === 'none') return arr;
    const get = (c: EnrichedCard) => {
      if (sortKey === 'title') return (c.title || '').toLowerCase();
      if (sortKey === 'chance') { const m = c.chance?.match(/(\d+)(?=%)/); return m ? parseInt(m[1], 10) : -1; }
      const vol = c.volume24h || 0; const bias = c.oneDayChange ? Math.sign(c.oneDayChange) : 0; const buy = bias>0?vol*0.6:bias<0?vol*0.4:vol*0.5; const sell = Math.max(0, vol-buy);
      if (sortKey === 'liq') return c.liquidity ?? -1; if (sortKey === 'buy') return buy; if (sortKey === 'sell') return sell; return 0;
    };
    arr.sort((a,b)=>{ const av=get(a), bv=get(b); if(typeof av==='string'&&typeof bv==='string'){const cmp=av.localeCompare(bv); return sortDir==='asc'?cmp:-cmp;} const cmp=(Number(av)||0)-(Number(bv)||0); return sortDir==='asc'?cmp:-cmp;});
    return arr;
  }, [enriched, sortKey, sortDir]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-3 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{todayStr}</div>
            <h1 className="text-2xl font-bold">Breaking News</h1>
            <p className="text-sm text-muted-foreground">See the markets that moved the most in the last 24 hours</p>
          </div>
          <div className="flex gap-2">
            <button className="border rounded-md px-3 py-1 text-sm" onClick={()=> setView(v=> v==='table'?'grid':'table')}>{view==='table'?'Carousel View':'Table View'}</button>
            {view==='table' && <button className="border rounded-md px-3 py-1 text-sm" onClick={()=>{ setSortKey('none'); setSortDir('desc'); }}>Reset Sort</button>}
          </div>
        </div>

        {view==='table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-md">
              <thead className="bg-muted">
                <tr className="text-left select-none">
                  <th className="p-2 cursor-pointer" onClick={()=>toggleSort('title')}><span className="inline-flex items-center gap-1">Item {sortKey==='title'?(sortDir==='asc'?'▲':'▼'):'↕'}</span></th>
                  <th className="p-2 cursor-pointer" onClick={()=>toggleSort('chance')}><span className="inline-flex items-center gap-1">Chance {sortKey==='chance'?(sortDir==='asc'?'▲':'▼'):'↕'}</span></th>
                  <th className="p-2 cursor-pointer" onClick={()=>toggleSort('liq')}><span className="inline-flex items-center gap-1">LIQ {sortKey==='liq'?(sortDir==='asc'?'▲':'▼'):'↕'}</span></th>
                  <th className="p-2 cursor-pointer" onClick={()=>toggleSort('buy')}><span className="inline-flex items-center gap-1">Buy {sortKey==='buy'?(sortDir==='asc'?'▲':'▼'):'↕'}</span></th>
                  <th className="p-2 cursor-pointer" onClick={()=>toggleSort('sell')}><span className="inline-flex items-center gap-1">Sell {sortKey==='sell'?(sortDir==='asc'?'▲':'▼'):'↕'}</span></th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((c, i)=>{
                  const pct = (() => { const m = c.chance?.match(/(\d+)(?=%)/); return m ? parseInt(m[1], 10) : undefined; })();
                  const color = pct === undefined ? 'text-foreground' : pct >= 50 ? 'text-green-600' : 'text-red-600';
                  const vol = c.volume24h || 0; const bias = c.oneDayChange ? Math.sign(c.oneDayChange) : 0; const buy = bias>0?vol*0.6:bias<0?vol*0.4:vol*0.5; const sell = Math.max(0, vol-buy);
                  return (
                    <tr key={`row-${i}`} className="border-t hover:bg-accent/40 cursor-pointer" onClick={()=> window.open(c.url, '_blank', 'noopener noreferrer') }>
                      <td className="p-2 max-w-[720px]">
                        <div className="flex items-start gap-3">
                          {c.image && (<div className="w-10 h-10 overflow-hidden rounded"><img src={c.image} alt={c.title} className="w-full h-full object-cover"/></div>)}
                          <div className="min-w-0"><div className="font-medium whitespace-normal break-words" style={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{c.title}</div></div>
                        </div>
                      </td>
                      <td className={`p-2 ${color}`}>{c.chance || '-'}</td>
                      <td className="p-2">{c.liquidity===undefined?'—':formatCompactUSD(c.liquidity)}</td>
                      <td className="p-2 text-green-700">{formatCompactUSD(buy)}</td>
                      <td className="p-2 text-red-700">{formatCompactUSD(sell)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enriched.map((c, idx) => {
              const pct = (() => { const m = c.chance?.match(/(\d+)(?=%)/); return m ? parseInt(m[1], 10) : undefined; })();
              const color = pct === undefined ? 'text-foreground' : pct >= 50 ? 'text-green-600' : 'text-red-600';
              const vol = c.volume24h || 0; const bias = c.oneDayChange ? Math.sign(c.oneDayChange) : 0; const buy = bias>0?vol*0.6:bias<0?vol*0.4:vol*0.5; const sell = Math.max(0, vol-buy); const buyPct = vol>0?(buy/vol)*100:50; const sellPct = 100-buyPct;
              return (
                <a key={`${c.url}-${idx}`} href={c.url} target="_blank" rel="noopener noreferrer" className="block border rounded-lg hover:shadow-md transition p-3">
                  <div className="flex items-start gap-3">
                    {c.image && (<div className="w-16 h-16 md:w-20 md:h-20 overflow-hidden rounded"><img src={c.image} alt={c.title} className="w-full h-full object-cover"/></div>)}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold whitespace-normal break-words leading-snug" style={{ display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }} title={c.title}>{c.title}</div>
                      {c.chance && <div className={`text-xs md:text-sm mt-1 ${color}`}>{c.chance}</div>}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full rounded-md px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 text-center">LIQ: {c.liquidity===undefined?'—':formatCompactUSD(c.liquidity)}</div>
                    <div className="mt-2 w-full rounded-md overflow-hidden border border-slate-200 bg-background">
                      <div className="flex text-xs font-semibold">
                        <div className="flex items-center justify-center bg-green-100 text-green-700" style={{ width: `${buyPct}%` }}>Buy: {formatCompactUSD(buy)}</div>
                        <div className="flex items-center justify-center bg-red-100 text-red-700" style={{ width: `${sellPct}%` }}>Sell: {formatCompactUSD(sell)}</div>
                      </div>
                    </div>
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


