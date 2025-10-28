"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArbitrageOpportunity } from "@/lib/unified/types";

type PFCard = { title: string; url: string; image?: string; chance?: string };

type Leader = { rank:number; name:string; pnl:string; avatar?:string; address?:string; profileUrl?:string };

type Props = {
  initialPF?: PFCard[];
  initialLeaderboard?: any[];
};

export default function HomeClient({ initialPF, initialLeaderboard }: Props) {
  const [pfCards, setPfCards] = React.useState<PFCard[]>(initialPF || []);
  const [topThree, setTopThree] = React.useState<Leader[]>(Array.isArray(initialLeaderboard) ? (initialLeaderboard as any[]).slice(0,3).map((r:any)=>({ rank:r.rank, name:r.name, pnl:r.pnl, avatar:r.avatar, address:r.address, profileUrl:r.profileUrl })) : []);
  const [topLoading, setTopLoading] = React.useState<boolean>(!Array.isArray(initialLeaderboard));
  const [breakingView, setBreakingView] = React.useState<'carousel'|'table'>('table');
  const [sortKey, setSortKey] = React.useState<'none'|'title'|'chance'|'liq'|'buy'|'sell'>('none');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('asc');
  const [statsMap, setStatsMap] = React.useState<Record<string, { liq?: number; vol?: number; chg?: number }>>({});
  const [lbTimeframe, setLbTimeframe] = React.useState<'daily'|'weekly'|'monthly'>('daily');

  const didInitRef = React.useRef<boolean>(false);

  React.useEffect(() => { (async () => {
    try { const res = await fetch('/api/predictfolio', { cache: 'no-store' }); const j = await res.json(); if (j?.success) setPfCards(j.data || []); } catch {}
  })(); }, []);

  React.useEffect(() => {
    if (!didInitRef.current && lbTimeframe === 'daily' && Array.isArray(initialLeaderboard)) { didInitRef.current = true; return; }
    (async () => {
      setTopLoading(true); setTopThree([]);
      try {
        const endpoint = lbTimeframe === 'daily' ? '/api/leaderboard/daily' : lbTimeframe === 'weekly' ? '/api/leaderboard/weekly' : '/api/leaderboard/monthly';
        const r = await fetch(endpoint, { cache: 'no-store' }); const j = await r.json();
        if (j?.success && Array.isArray(j.data)) {
          const top = (j.data as any[]).slice(0,3).map((r:any)=>({ rank:r.rank, name:r.name, pnl:r.pnl, avatar:r.avatar, address:r.address, profileUrl:r.profileUrl }));
          setTopThree(top);
        }
      } catch {}
      setTopLoading(false);
    })();
  }, [lbTimeframe, initialLeaderboard]);

  const todayStr = React.useMemo(() => {
    try { return new Date().toLocaleDateString('en-US', { month:'short', day:'2-digit', year:'numeric' }); } catch { return ''; }
  }, []);

  const lbTimeframeLabel = React.useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const now = new Date();
    if (lbTimeframe === 'daily') return fmt(now);
    const days = lbTimeframe === 'weekly' ? 7 : 30;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return `${fmt(start)} – ${fmt(now)}`;
  }, [lbTimeframe]);

  function extractSlug(u?: string) { if (!u) return undefined; const m = u.match(/\/market\/([^?]+)/); return m ? m[1] : undefined; }
  function formatCompactUSD(n?: number) {
    if (typeof n !== 'number' || Number.isNaN(n)) return '-';
    try { return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n).replace(/^/, '$'); } catch { if (n>=1_000_000) return `$${(n/1_000_000).toFixed(2)}M`; if (n>=1_000) return `$${(n/1_000).toFixed(2)}K`; return `$${n.toFixed(0)}`; }
  }

  // Prefetch stats map as in original page
  React.useEffect(() => { (async () => {
    try {
      const slugs = Array.from(new Set((pfCards || []).map(c=>extractSlug(c.url)).filter(Boolean) as string[])); if (!slugs.length) return;
      const entries: [string, { liq?: number; vol?: number; chg?: number }][] = [];
      await Promise.allSettled(slugs.map(async (slug) => {
        try { const r = await fetch(`/api/market-stats?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' }); const j = await r.json(); if (j?.success) entries.push([slug, { liq: j.data?.liquidity, vol: j.data?.volume24h, chg: j.data?.oneDayChange }]); } catch {}
      }));
      setStatsMap((prev)=> ({ ...prev, ...Object.fromEntries(entries) }));
    } catch {}
  })(); }, [pfCards]);

  const { rowA, rowB } = React.useMemo(() => {
    const seen = new Set<string>();
    const unique = (pfCards || []).filter(c => { const key = c.url || c.title; if (seen.has(key)) return false; seen.add(key); return true; });
    return { rowA: unique.filter((_,i)=> i%2===0), rowB: unique.filter((_,i)=> i%2===1) };
  }, [pfCards]);

  function toggleSort(newKey: 'title'|'chance'|'liq'|'buy'|'sell') {
    if (sortKey !== newKey) { setSortKey(newKey); setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortDir('asc'); return; }
    setSortKey('none'); setSortDir('asc');
  }

  const rows = React.useMemo(() => {
    const arr = [...pfCards]; if (sortKey==='none') return arr;
    const getVal = (c:any) => {
      if (sortKey==='title') return (c.title||'').toLowerCase();
      if (sortKey==='chance') { const m=c.chance?.match(/(\d+)(?=%)/); return m?parseInt(m[1],10):-1; }
      const slug = extractSlug(c.url); const st = slug ? statsMap[slug] : undefined; const vol = st?.vol || 0; const bias = st?.chg ? Math.sign(st.chg) : 0; const buy = bias>0?vol*0.6:bias<0?vol*0.4:vol*0.5; const sell = Math.max(0, vol-buy);
      if (sortKey==='liq') return st?.liq ?? -1; if (sortKey==='buy') return buy; if (sortKey==='sell') return sell; return 0;
    };
    arr.sort((a,b)=>{ const av=getVal(a), bv=getVal(b); if(typeof av==='string'&&typeof bv==='string'){ const cmp=av.localeCompare(bv); return sortDir==='asc'?cmp:-cmp; } const cmp=(Number(av)||0)-(Number(bv)||0); return sortDir==='asc'?cmp:-cmp; });
    return arr;
  }, [pfCards, sortKey, sortDir, statsMap]);

  const lbTimeframeHeader = (
    <div className="w-fit mx-auto">
      <div className="w-full flex items-end justify-between mb-2">
        <div className="text-sm text-muted-foreground">{lbTimeframeLabel}</div>
        <div className="inline-flex border rounded-md overflow-hidden text-sm">
          <button onClick={()=>setLbTimeframe('daily')} className={`px-2 py-1 ${lbTimeframe==='daily'?'bg-primary text-primary-foreground':'bg-background hover:bg-accent'}`}>Daily</button>
          <button onClick={()=>setLbTimeframe('weekly')} className={`px-2 py-1 border-l ${lbTimeframe==='weekly'?'bg-primary text-primary-foreground':'bg-background hover:bg-accent'}`}>Weekly</button>
          <button onClick={()=>setLbTimeframe('monthly')} className={`px-2 py-1 border-l ${lbTimeframe==='monthly'?'bg-primary text-primary-foreground':'bg-background hover:bg-accent'}`}>Monthly</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">
          <span className="whitespace-nowrap">Track the Top Polymarket</span>
          <br />
          <span className="whitespace-nowrap">traders in <span className="text-[#2D6CDF]">realtime</span></span>
        </h1>
      </div>

      {(topLoading || topThree.length > 0) && (
        <div className="max-w-7xl mx-auto mb-4">
          {lbTimeframeHeader}
          <div className="grid grid-cols-3 gap-2 md:gap-3 justify-center">
            {topThree.map((t, idx) => {
              const colors = [
                { ring: 'ring-yellow-400', label: '1st', bg:'bg-yellow-50', border:'border-yellow-300 dark:border-yellow-500' },
                { ring: 'ring-slate-300', label: '2nd', bg:'bg-slate-50', border:'border-slate-300 dark:border-slate-600' },
                { ring: 'ring-amber-400', label: '3rd', bg:'bg-amber-50', border:'border-amber-300 dark:border-amber-500' },
              ];
              const c = colors[idx] || colors[2];
              const pnlPositive = (t.pnl || '').startsWith('+$');
              return (
                <Link key={t.rank} href={t.address ? `/user/${t.address}` : (t.profileUrl || '#')} className={`border ${c.border} rounded-lg ${c.bg} dark:bg-slate-800 hover:shadow-md transition ring-1 ${c.ring} dark:ring-slate-700 aspect-square w-full md:w-44 flex flex-col items-center justify-center text-center p-2`}>
                  {t.avatar && (
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden mb-2"><img src={t.avatar} alt={t.name} className="w-full h-full object-cover" /></div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate max-w-[160px] md:max-w-[200px] mx-auto text-gray-900 dark:text-white text-sm md:text-base">{t.name}</div>
                    <div className={`${pnlPositive ? 'text-green-600' : 'text-red-600'} font-bold text-lg md:text-xl`}>{t.pnl}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
                  </div>
                </Link>
              );
            })}
            {topLoading && topThree.length === 0 && [0,1,2].map((i) => (
              <div key={`skeleton-${i}`} className="border rounded-lg ring-1 ring-slate-200 aspect-square w-full md:w-44 p-2 animate-pulse bg-muted/40 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-2"><div className="w-7 h-7 rounded-full bg-muted" /><div className="w-8 h-3 rounded bg-muted" /></div>
                <div className="w-12 h-12 rounded-full bg-muted mb-2" />
                <div className="w-24 h-3 rounded bg-muted mb-2" />
                <div className="w-20 h-4 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breaking section header & controls preserved in page wrapper */}
    </>
  );
}


