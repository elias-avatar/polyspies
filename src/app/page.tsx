"use client";

import { useEffect, useState } from "react";
import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArbitrageCard } from "@/components/ArbitrageCard";
import { ArbitrageOpportunity } from "@/lib/unified/types";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const [topOpportunities, setTopOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [pfCards, setPfCards] = useState<Array<{title:string;url:string;image?:string;chance?:string}>>([]);
  const [topThree, setTopThree] = useState<Array<{ rank:number; name:string; pnl:string; avatar?:string; address?:string; profileUrl?:string }>>([]);
  const [topLoading, setTopLoading] = useState<boolean>(true);
  const [lbTimeframe, setLbTimeframe] = useState<'daily'|'weekly'|'monthly'>('daily');
  const [breakingView, setBreakingView] = useState<'carousel'|'table'>('table');
  const [sortKey, setSortKey] = useState<'none'|'title'|'chance'|'liq'|'buy'|'sell'>('none');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [statsMap, setStatsMap] = useState<Record<string, { liq?: number; vol?: number; chg?: number }>>({});
  const [stats, setStats] = useState<{
    totalOpportunities: number;
    largestGap: number;
  } | null>(null);
  const [showTrades, setShowTrades] = useState<boolean>(false);
  type Trade = { proxyWallet: string; side: 'BUY'|'SELL'; size: number; price?: number; timestamp: number; title?: string; slug?: string; outcome?: string; name?: string; profileImage?: string; icon?: string };
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState<boolean>(false);
  const [avatarMap, setAvatarMap] = useState<Record<string, string | undefined>>({});
  const [tradesView, setTradesView] = useState<'table'|'grid'>('table');
  const [liqMap, setLiqMap] = useState<Record<string, number | undefined>>({});

  const todayStr = React.useMemo(() => {
    try {
      return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    fetchTopOpportunities();
    fetchPredictFolio();
  }, []);

  useEffect(() => {
    fetchTopThree(lbTimeframe);
  }, [lbTimeframe]);

  const fetchTopOpportunities = async () => {
    try {
      const response = await fetch("/api/arbitrage?sortBy=gap&limit=3");
      const data = await response.json();
      if (data.success) {
        setTopOpportunities(data.data.slice(0, 3));
        setStats({
          totalOpportunities: data.stats.totalOpportunities,
          largestGap: data.stats.largestGap,
        });
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    }
  };

  const lbTimeframeLabel = React.useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const now = new Date();
    if (lbTimeframe === 'daily') {
      return fmt(now);
    }
    const days = lbTimeframe === 'weekly' ? 7 : 30;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return `${fmt(start)} – ${fmt(now)}`;
  }, [lbTimeframe]);

  // Stable breaking rows derived from pfCards
  const { rowA, rowB } = React.useMemo(() => {
    const seen = new Set<string>();
    const unique = (pfCards || []).filter(c => {
      const key = c.url || c.title;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    return {
      rowA: unique.filter((_, idx) => idx % 2 === 0),
      rowB: unique.filter((_, idx) => idx % 2 === 1),
    };
  }, [pfCards]);

  const fetchPredictFolio = async () => {
    try {
      const res = await fetch('/api/predictfolio', { cache: 'no-store' });
      const json = await res.json();
      if (json?.success) setPfCards(json.data);
    } catch (e) {
      console.error('predictfolio load error', e);
    }
  };
  // Prefetch market stats for table sorting
  useEffect(() => {
    (async () => {
      try {
        const slugs = Array.from(new Set((pfCards || []).map(c => extractSlug(c.url)).filter(Boolean) as string[]));
        if (slugs.length === 0) return;
        const entries: [string, { liq?: number; vol?: number; chg?: number }][] = [];
        await Promise.allSettled(slugs.map(async (slug) => {
          try {
            const r = await fetch(`/api/market-stats?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
            const j = await r.json();
            if (j?.success) entries.push([slug, { liq: j.data?.liquidity, vol: j.data?.volume24h, chg: j.data?.oneDayChange }]);
          } catch {}
        }));
        setStatsMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      } catch {}
    })();
  }, [pfCards]);

  function toggleSort(newKey: 'title'|'chance'|'liq'|'buy'|'sell') {
    if (sortKey !== newKey) {
      setSortKey(newKey);
      setSortDir('desc'); // first click: most -> least
      return;
    }
    if (sortDir === 'desc') { // second click: least -> most
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') { // third click: reset
      setSortKey('none');
      setSortDir('asc');
      return;
    }
    // fallback reset
    setSortKey('none');
    setSortDir('asc');
  }

  const rows = React.useMemo(() => {
    const arr = [...pfCards];
    if (sortKey === 'none') return arr;
    const getVal = (c: any) => {
      if (sortKey === 'title') return (c.title || '').toLowerCase();
      if (sortKey === 'chance') {
        const m = c.chance?.match(/(\d+)(?=%)/); return m ? parseInt(m[1], 10) : -1;
      }
      const slug = extractSlug(c.url);
      const st = slug ? statsMap[slug] : undefined;
      const vol = st?.vol || 0;
      const bias = st?.chg ? Math.sign(st.chg) : 0;
      const buy = bias > 0 ? vol * 0.6 : bias < 0 ? vol * 0.4 : vol * 0.5;
      const sell = Math.max(0, vol - buy);
      if (sortKey === 'liq') return st?.liq ?? -1;
      if (sortKey === 'buy') return buy;
      if (sortKey === 'sell') return sell;
      return 0;
    };
    arr.sort((a, b) => {
      const av = getVal(a); const bv = getVal(b);
      if (typeof av === 'string' && typeof bv === 'string') {
        const cmp = av.localeCompare(bv);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = (Number(av) || 0) - (Number(bv) || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [pfCards, sortKey, sortDir, statsMap]);


  const fetchTopThree = async (timeframe: 'daily'|'weekly'|'monthly' = 'daily') => {
    try {
      setTopLoading(true);
      setTopThree([]); // show skeletons while loading new timeframe
      const endpoint = timeframe === 'daily' ? '/api/leaderboard/daily' : timeframe === 'weekly' ? '/api/leaderboard/weekly' : '/api/leaderboard/monthly';
      const res = await fetch(endpoint, { cache: 'no-store' });
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        const top = (json.data as any[]).slice(0, 3).map((r) => ({
          rank: r.rank,
          name: r.name,
          pnl: r.pnl,
          avatar: r.avatar,
          address: r.address,
          profileUrl: r.profileUrl,
        }));
        setTopThree(top);
      }
    } catch (e) {
      console.error('leaderboard load error', e);
    } finally { setTopLoading(false); }
  };

  // Auto-scrolling carousel row with seamless loop + drag to scroll
  const MarqueeRow = React.memo(function MarqueeRow({ items, direction, startAtIndex = 0, speed = 30 }: { items: typeof pfCards; direction: 'left'|'right'; startAtIndex?: number; speed?: number }) {
    const baseOrder = React.useMemo(() => {
      const arr = items || [];
      if (!arr.length) return [] as typeof items;
      const n = arr.length;
      const s = ((startAtIndex % n) + n) % n;
      return [...arr.slice(s), ...arr.slice(0, s)];
    }, [items, startAtIndex]);

    // Duplicate 3x to ensure long runway
    const loopItems = React.useMemo(() => new Array(3).fill(0).flatMap(() => baseOrder), [baseOrder]);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const posRef = React.useRef<number>(0);
    const widthRef = React.useRef<number>(0); // width of one cycle (baseOrder)
    const rafRef = React.useRef<number | null>(null);
    const lastTsRef = React.useRef<number | null>(null);
    const pausedRef = React.useRef<boolean>(false);
    const draggingRef = React.useRef<boolean>(false);
    const dragStartXRef = React.useRef<number>(0);
    const dragStartPosRef = React.useRef<number>(0);
    const dragMovedRef = React.useRef<boolean>(false);
    const DRAG_THRESHOLD = 6; // px

    // Measure width of one cycle after mount
    React.useEffect(() => {
      const el = trackRef.current;
      if (!el) return;
      // width of a single cycle equals total scrollWidth divided by 3
      widthRef.current = el.scrollWidth / 3;
      // keep existing position when items array reference is unchanged
    }, [baseOrder]);

    const step = React.useCallback((ts: number) => {
      if (pausedRef.current || draggingRef.current) {
        lastTsRef.current = ts;
      } else {
        const last = lastTsRef.current ?? ts;
        const dt = (ts - last) / 1000;
        const dir = direction === 'left' ? -1 : 1;
        posRef.current += dir * speed * dt;
        const cycle = widthRef.current || 1;
        // wrap around inside [-cycle, 0)
        if (posRef.current <= -cycle) posRef.current += cycle;
        if (posRef.current >= 0) posRef.current -= cycle;
        if (trackRef.current) trackRef.current.style.transform = `translateX(${posRef.current}px)`;
        lastTsRef.current = ts;
      }
      rafRef.current = requestAnimationFrame(step);
    }, [direction, speed]);

    // Start/stop animation
    React.useEffect(() => {
      rafRef.current = requestAnimationFrame(step);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [step]);

    // Hover pause
    const onMouseEnter = () => { pausedRef.current = true; };
    const onMouseLeave = () => { pausedRef.current = false; };

    // Drag-to-scroll
    const onPointerDown = (e: React.PointerEvent) => {
      if (!containerRef.current) return;
      draggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragStartPosRef.current = posRef.current;
      dragMovedRef.current = false;
      containerRef.current.setPointerCapture(e.pointerId);
      pausedRef.current = true;
    };
    const onPointerMove = (e: React.PointerEvent) => {
      if (!draggingRef.current || !trackRef.current) return;
      const dx = e.clientX - dragStartXRef.current;
      if (!dragMovedRef.current && Math.abs(dx) > DRAG_THRESHOLD) {
        dragMovedRef.current = true;
      }
      // Prevent native selection/drag while moving
      e.preventDefault();
      posRef.current = dragStartPosRef.current + dx;
      const cycle = widthRef.current || 1;
      if (posRef.current <= -cycle) posRef.current += cycle;
      if (posRef.current >= 0) posRef.current -= cycle;
      trackRef.current.style.transform = `translateX(${posRef.current}px)`;
    };
    const onPointerUp = (e: React.PointerEvent) => {
      draggingRef.current = false;
      if (containerRef.current) {
        try { containerRef.current.releasePointerCapture(e.pointerId); } catch {}
      }
      pausedRef.current = false;
      // small delay before clearing moved flag so click after drag is still prevented
      window.setTimeout(() => { dragMovedRef.current = false; }, 0);
    };

    const onClickCapture = (e: React.MouseEvent) => {
      if (dragMovedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    return (
      <div className="overflow-hidden select-none cursor-grab active:cursor-grabbing" ref={containerRef} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClickCapture={onClickCapture}>
        <div ref={trackRef} className="flex gap-4 whitespace-nowrap will-change-transform">
          {loopItems.map((c, i) => {
            const pct = (() => { const m = c.chance?.match(/(\d+)(?=%)/); return m ? parseInt(m[1], 10) : undefined; })();
            const color = pct === undefined ? 'text-foreground' : pct >= 50 ? 'text-green-600' : 'text-red-600';
            return (
              <a
                key={`${c.url}-${direction}-${i}`}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border rounded-lg p-3 bg-background hover:shadow-md transition w-[420px] min-w-[420px] flex-none"
                draggable={false}
                onDragStart={(e)=>e.preventDefault()}
              >
                <div className="w-full">
                  <div className="flex items-start gap-3">
                    {c.image && (
                      <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded">
                        <img src={c.image} alt={c.title} className="w-full h-full object-cover" draggable={false} onDragStart={(e)=>e.preventDefault()} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-semibold text-sm leading-snug whitespace-normal break-words"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        title={c.title}
                      >
                        {c.title}
                      </div>
                      {c.chance && <div className={`text-sm mt-1 ${color}`}>{c.chance}</div>}
                    </div>
                  </div>
                  <BreakingStats url={c.url} />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  }, (prev, next) => (
    prev.direction === next.direction &&
    prev.startAtIndex === next.startAtIndex &&
    prev.items === next.items
  ));

  function extractSlug(u: string | undefined) {
    if (!u) return undefined;
    const m = u.match(/\/market\/([^?]+)/);
    return m ? m[1] : undefined;
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

  function normalizeImageUrl(u?: string): string | undefined {
    if (!u || typeof u !== 'string') return undefined;
    let url = u.trim();
    if (!url) return undefined;
    if (url.startsWith('//')) url = `https:${url}`;
    if (url.startsWith('ipfs://')) {
      const cid = url.replace('ipfs://ipfs/', '').replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${cid}`;
    }
    return url;
  }

  const fmtTime = (ts?: number) => {
    if (!ts) return '';
    const delta = Date.now() - ts * 1000;
    const s = Math.max(1, Math.floor(delta / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); return `${d}d ago`;
  };

  useEffect(() => {
    if (!showTrades) return;
    (async () => {
      try {
        setTradesLoading(true);
        const r = await fetch('/api/trades?global=true&limit=100', { cache: 'no-store' });
        const j = await r.json();
        if (Array.isArray(j?.data)) setTrades(j.data);
      } catch {}
      setTradesLoading(false);
    })();
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
  }, [showTrades]);

  // When trades change, fetch liquidity for slugs to support grid view bucketing
  useEffect(() => {
    if (!showTrades) return;
    (async () => {
      const slugs = Array.from(new Set(trades.map(t => t.slug).filter(Boolean) as string[]));
      if (!slugs.length) return;
      const entries: [string, number | undefined][] = [];
      await Promise.allSettled(slugs.map(async (slug) => {
        try { const r = await fetch(`/api/market-stats?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' }); const j = await r.json(); if (j?.success) entries.push([slug, j.data?.liquidity]); } catch {}
      }));
      setLiqMap(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [showTrades, trades]);

  function BreakingStats({ url }: { url?: string }) {
    const [liquidity, setLiquidity] = React.useState<number | undefined>(undefined);
    const [vol24, setVol24] = React.useState<number | undefined>(undefined);
    const [change, setChange] = React.useState<number | undefined>(undefined);

    React.useEffect(() => {
      const slug = extractSlug(url);
      if (!slug) return;
      let alive = true;
      (async () => {
        try {
          const r = await fetch(`/api/market-stats?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
          if (!r.ok) return;
          const j = await r.json();
          if (!alive || !j?.success) return;
          const d = j.data || {};
          if (typeof d.liquidity === 'number') setLiquidity(d.liquidity);
          if (typeof d.volume24h === 'number') setVol24(d.volume24h);
          if (typeof d.oneDayChange === 'number') setChange(d.oneDayChange);
        } catch {}
      })();
      return () => { alive = false; };
    }, [url]);

    // Reserve layout: render placeholders until metrics arrive
    const showPlaceholder = liquidity === undefined && vol24 === undefined;

    const vol = Math.max(0, vol24 || 0);
    const bias = (typeof change === 'number' ? Math.sign(change) : 0);
    const buy = bias > 0 ? vol * 0.6 : bias < 0 ? vol * 0.4 : vol * 0.5;
    const sell = Math.max(0, vol - buy);
    const buyPct = vol > 0 ? (buy / vol) * 100 : 50;
    const sellPct = 100 - buyPct;

    return (
      <div className="mt-2">
        <div className="w-full rounded-md px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 text-center">
          {showPlaceholder ? 'LIQ: —' : `LIQ: ${formatCompactUSD(liquidity)}`}
        </div>
        <div className="mt-2 w-full rounded-md overflow-hidden border border-slate-200 bg-background">
          <div className="flex text-xs font-semibold">
            <div className="flex items-center justify-center bg-green-100 text-green-700" style={{ width: `${showPlaceholder ? 50 : buyPct}%` }}>
              {showPlaceholder ? 'Buy: —' : `Buy: ${formatCompactUSD(buy)}`}
            </div>
            <div className="flex items-center justify-center bg-red-100 text-red-700" style={{ width: `${showPlaceholder ? 50 : sellPct}%` }}>
              {showPlaceholder ? 'Sell: —' : `Sell: ${formatCompactUSD(sell)}`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Table helper: render LIQ / Buy / Sell cells with one fetch
  function TableStatsCells({ url }: { url?: string }) {
    const [liquidity, setLiquidity] = React.useState<number | undefined>(undefined);
    const [vol24, setVol24] = React.useState<number | undefined>(undefined);
    const [change, setChange] = React.useState<number | undefined>(undefined);

    React.useEffect(() => {
      const slug = extractSlug(url);
      if (!slug) return;
      let alive = true;
      (async () => {
        try {
          const r = await fetch(`/api/market-stats?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
          if (!r.ok) return;
          const j = await r.json();
          if (!alive || !j?.success) return;
          const d = j.data || {};
          if (typeof d.liquidity === 'number') setLiquidity(d.liquidity);
          if (typeof d.volume24h === 'number') setVol24(d.volume24h);
          if (typeof d.oneDayChange === 'number') setChange(d.oneDayChange);
        } catch {}
      })();
      return () => { alive = false; };
    }, [url]);

    const vol = Math.max(0, vol24 || 0);
    const bias = (typeof change === 'number' ? Math.sign(change) : 0);
    const buy = bias > 0 ? vol * 0.6 : bias < 0 ? vol * 0.4 : vol * 0.5;
    const sell = Math.max(0, vol - buy);

    return (
      <>
        <td className="p-2">{liquidity === undefined ? '—' : formatCompactUSD(liquidity)}</td>
        <td className="p-2 text-green-700">{vol24 === undefined ? '—' : formatCompactUSD(buy)}</td>
        <td className="p-2 text-red-700">{vol24 === undefined ? '—' : formatCompactUSD(sell)}</td>
      </>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Header & Hero */}
      <div className="bg-background">
        <div className="max-w-7xl mx-auto px-8 pt-6 pb-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">
              <span className="whitespace-nowrap">Track the Top Polymarket</span>
              <br />
              <span className="whitespace-nowrap">
                Traders in <span className="text-[#2D6CDF]">Realtime</span>
              </span>
            </h1>
            
          </div>

          {/* Removed Browse Markets button */}

          {/* One-time animation CSS */}
          <style jsx global>{`
            @keyframes pg-scroll-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            /* Start the rightward row at -50% so the rightmost items are initially visible */
            @keyframes pg-scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
            .pg-animate-left { animation: pg-scroll-left 36s linear infinite; }
            .pg-animate-right { animation: pg-scroll-right 38s linear infinite; }
          `}</style>

          {/* Top 3 Traders with timeframe selector */}
          {(topLoading || topThree.length > 0) && (
            <div className="max-w-7xl mx-auto mb-4">
              <div className="w-fit mx-auto">
                <div className="w-full flex items-end justify-between mb-2">
                  <div className="text-sm text-muted-foreground">{lbTimeframeLabel}</div>
                  <div className="inline-flex border rounded-md overflow-hidden text-sm">
                    <button onClick={()=>setLbTimeframe('daily')} className={`px-2 py-1 ${lbTimeframe==='daily'?'bg-primary text-primary-foreground':'bg-background hover:bg-accent'}`}>Daily</button>
                    <button onClick={()=>setLbTimeframe('weekly')} className={`px-2 py-1 border-l ${lbTimeframe==='weekly'?'bg-primary text-primary-foreground':'bg-background hover:bg-accent'}`}>Weekly</button>
                    <button onClick={()=>setLbTimeframe('monthly')} className={`px-2 py-1 border-l ${lbTimeframe==='monthly'?'bg-primary text-primary-foreground':'bg-background hover:bg-accent'}`}>Monthly</button>
                  </div>
                </div>
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
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden mb-2">
                          <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                        </div>
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
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-muted" />
                      <div className="w-8 h-3 rounded bg-muted" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-muted mb-2" />
                    <div className="w-24 h-3 rounded bg-muted mb-2" />
                    <div className="w-20 h-4 rounded bg-muted" />
                  </div>
                ))}
                </div>
              </div>
            </div>
          )}

          {/* Breaking/Trades controls */}
          {(((rowA.length + rowB.length) > 0) || showTrades) && (
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-end justify-between mb-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{todayStr}</div>
                  <h2 className="text-2xl font-bold">{showTrades ? 'Trades' : 'Breaking News'}</h2>
                  <div className="mt-2 inline-flex border rounded-md overflow-hidden text-sm">
                    <button onClick={() => setShowTrades(false)} className={`px-3 py-1 ${!showTrades ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}>Breaking</button>
                    <button onClick={() => setShowTrades(true)} className={`px-3 py-1 border-l ${showTrades ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}>Trades</button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{showTrades ? 'Realtime trades from top traders' : 'See the markets that moved the most in the last 24 hours'}</p>
                </div>
                <div className="flex gap-2">
                  {showTrades && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setTradesView(v => v==='table'?'grid':'table')}>{tradesView==='table'?'Grid':'Table'}</Button>
                      <Link href="/trades"><Button variant="outline" size="sm">View All</Button></Link>
                    </>
                  )}
                  {!showTrades && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setBreakingView(v => v === 'carousel' ? 'table' : 'carousel')}>
                        {breakingView === 'carousel' ? 'Table' : 'Carousel'}
                      </Button>
                      {breakingView === 'table' && (
                        <Button variant="outline" size="sm" onClick={() => { setSortKey('none'); setSortDir('asc'); }}>
                          Reset
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!showTrades && breakingView === 'carousel' ? (
                <>
                  <div className="overflow-hidden"><MarqueeRow items={rowA} direction="left" /></div>
                  <div className="overflow-hidden mt-1"><MarqueeRow items={rowB} direction="right" startAtIndex={Math.max(0, rowB.length - 1)} /></div>
                </>
              ) : !showTrades ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-md">
                    <thead className="bg-muted">
                      <tr className="text-left select-none">
                        <th className="p-2 cursor-pointer" onClick={() => toggleSort('title')}>
                          <span className="inline-flex items-center gap-1">Item {sortKey === 'title' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </th>
                        <th className="p-2 cursor-pointer" onClick={() => toggleSort('chance')}>
                          <span className="inline-flex items-center gap-1">Chance {sortKey === 'chance' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </th>
                        <th className="p-2 cursor-pointer" onClick={() => toggleSort('liq')}>
                          <span className="inline-flex items-center gap-1">LIQ {sortKey === 'liq' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </th>
                        <th className="p-2 cursor-pointer hidden md:table-cell" onClick={() => toggleSort('buy')}>
                          <span className="inline-flex items-center gap-1">Buy {sortKey === 'buy' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </th>
                        <th className="p-2 cursor-pointer hidden md:table-cell" onClick={() => toggleSort('sell')}>
                          <span className="inline-flex items-center gap-1">Sell {sortKey === 'sell' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c, i) => {
                        const pct = (() => { const m = c.chance?.match(/(\d+)(?=%)/); return m ? parseInt(m[1], 10) : undefined; })();
                        const color = pct === undefined ? 'text-foreground' : pct >= 50 ? 'text-green-600' : 'text-red-600';
                        const slug = extractSlug(c.url);
                        const st = slug ? statsMap[slug] : undefined;
                        const vol = Math.max(0, st?.vol || 0);
                        const bias = st?.chg ? Math.sign(st.chg) : 0;
                        const buy = bias > 0 ? vol * 0.6 : bias < 0 ? vol * 0.4 : vol * 0.5;
                        const sell = Math.max(0, vol - buy);
                        return (
                          <tr key={`tbl-${i}`} className="border-t hover:bg-accent/40 cursor-pointer" onClick={() => window.open(c.url, '_blank', 'noopener noreferrer') }>
                            <td className="p-2 max-w-[720px]">
                              <div className="flex items-start gap-3">
                                {c.image && (
                                  <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded">
                                    <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium whitespace-normal break-words" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.title}</div>
                                </div>
                              </div>
                            </td>
                            <td className={`p-2 ${color}`}>{c.chance || '-'}</td>
                            <td className="p-2">{st?.liq === undefined ? '—' : formatCompactUSD(st.liq)}</td>
                            <td className="p-2 text-green-700 hidden md:table-cell">{st?.vol === undefined ? '—' : formatCompactUSD(buy)}</td>
                            <td className="p-2 text-red-700 hidden md:table-cell">{st?.vol === undefined ? '—' : formatCompactUSD(sell)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (tradesView === 'table') ? (
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
                      {tradesLoading && (
                        <>
                          {Array.from({ length: 10 }).map((_, idx) => (
                            <tr key={`sk-${idx}`} className="border-t animate-pulse">
                              <td className="p-2"><div className="h-4 bg-muted rounded w-16" /></td>
                              <td className="p-2"><div className="h-6 bg-muted rounded w-32" /></td>
                              <td className="p-2"><div className="h-4 bg-muted rounded w-10" /></td>
                              <td className="p-2"><div className="h-4 bg-muted rounded w-24" /></td>
                              <td className="p-2"><div className="h-4 bg-muted rounded w-12" /></td>
                              <td className="p-2"><div className="h-4 bg-muted rounded w-14" /></td>
                              <td className="p-2 max-w-[560px]"><div className="h-4 bg-muted rounded w-64" /></td>
                            </tr>
                          ))}
                        </>
                      )}
                      {!tradesLoading && trades.map((t, i) => (
                        <tr key={`${t.timestamp}-${i}`} className="border-t align-middle">
                          <td className="p-2 whitespace-nowrap">{fmtTime(t.timestamp)}</td>
                          <td className="p-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                {(() => { const src = normalizeImageUrl(t.profileImage) || (t.proxyWallet && normalizeImageUrl(avatarMap[t.proxyWallet.toLowerCase()])); return src ? <img src={src} alt="pfp" className="w-full h-full object-cover" /> : null; })()}
                              </div>
                              <Link href={t.proxyWallet ? `/user/${t.proxyWallet}` : '#'} className="underline">
                                {(t.name && t.name.trim()) ? t.name : (t.proxyWallet ? t.proxyWallet.slice(0,6) : '')}
                              </Link>
                            </div>
                          </td>
                          <td className={`p-2 font-medium ${t.side==='BUY'?'text-green-600':'text-red-600'}`}>{t.side}</td>
                          <td className="p-2">{t.outcome ?? '-'}</td>
                          <td className="p-2">{typeof t.price==='number' ? `${t.price.toFixed(1)}¢` : '-'}</td>
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
                      {!tradesLoading && trades.length === 0 && (
                        <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No trades</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {tradesLoading && (
                    <>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={`sk-card-${i}`} className="border rounded-lg p-4 animate-pulse">
                          <div className="h-5 bg-muted rounded w-1/3 mb-3" />
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-full" />
                            <div className="h-4 bg-muted rounded w-5/6" />
                            <div className="h-4 bg-muted rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
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
                        <h3 className="text-lg font-semibold mb-2">{bucketLabel}</h3>
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
                                  <div key={`${t.timestamp}-${i}`} className="py-1.5 flex items-center justify-between gap-2 text-sm">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-muted flex-shrink-0">{(() => { const src = normalizeImageUrl(t.profileImage) || (t.proxyWallet && normalizeImageUrl(avatarMap[t.proxyWallet.toLowerCase()])); return src ? <img src={src} alt="" className="w-full h-full object-cover"/> : null; })()}</div>
                                      <span className="truncate">{(t.name && t.name.trim()) ? t.name : (t.proxyWallet ? t.proxyWallet.slice(0,6) : '')}</span>
                                      <span className={`font-medium ${t.side==='BUY'?'text-green-600':'text-red-600'}`}>{t.side}</span>
                                      <span className="text-muted-foreground truncate">{t.outcome ?? '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 whitespace-nowrap">
                                      <span>{typeof t.price==='number' ? `${t.price.toFixed(1)}¢` : '-'}</span>
                                      <span>{t.size?.toLocaleString('en-US')}</span>
                                      <span className="text-muted-foreground">{fmtTime(t.timestamp)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {/* No empty-state message; skeletons above serve as loading indicator */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer (sticks to bottom, small) */}
      <footer className="mt-auto border-t bg-background text-sm">
        <div className="max-w-7xl mx-auto px-8 h-12 flex items-center justify-between">
          <Link href="/" className="font-semibold">PolyGuild</Link>
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href="#" className="hover:underline">Terms</a>
            <a href="#" className="hover:underline">Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
