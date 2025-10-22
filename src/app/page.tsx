"use client";

import { useEffect, useState } from "react";
import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArbitrageCard } from "@/components/ArbitrageCard";
import { ArbitrageOpportunity } from "@/lib/unified/types";
import { ArrowRight, Trophy } from "lucide-react";

export default function Home() {
  const [topOpportunities, setTopOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [pfCards, setPfCards] = useState<Array<{title:string;url:string;image?:string;chance?:string}>>([]);
  const [topThree, setTopThree] = useState<Array<{ rank:number; name:string; pnl:string; avatar?:string; address?:string; profileUrl?:string }>>([]);
  const [topLoading, setTopLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<{
    totalOpportunities: number;
    largestGap: number;
  } | null>(null);

  useEffect(() => {
    fetchTopOpportunities();
    fetchPredictFolio();
    fetchTopThree();
  }, []);

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

  const fetchPredictFolio = async () => {
    try {
      const res = await fetch('/api/predictfolio', { cache: 'no-store' });
      const json = await res.json();
      if (json?.success) setPfCards(json.data);
    } catch (e) {
      console.error('predictfolio load error', e);
    }
  };

  const fetchTopThree = async () => {
    try {
      setTopLoading(true);
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
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

  // Auto-scrolling carousel row (no drag interactivity)
  function MarqueeRow({ items, direction, startAtIndex = 0 }: { items: typeof pfCards; direction: 'left'|'right'; startAtIndex?: number }) {
    // Rotate order so we can start from any index, then duplicate for seamless loop
    const baseOrder = React.useMemo(() => {
      const arr = items || [];
      if (!arr.length) return [] as typeof items;
      const n = arr.length;
      const s = ((startAtIndex % n) + n) % n; // safe modulo
      return [...arr.slice(s), ...arr.slice(0, s)];
    }, [items, startAtIndex]);
    const loopItems = React.useMemo(() => {
      return [...baseOrder, ...baseOrder];
    }, [baseOrder]);
    return (
      <div className="overflow-hidden">
        <div className={`flex gap-4 whitespace-nowrap ${direction === 'left' ? 'pg-animate-left' : 'pg-animate-right'}`}
        >
          {loopItems.map((c, i) => {
            const pct = (() => { const m = c.chance?.match(/(\d+)(?=%)/); return m ? parseInt(m[1], 10) : undefined; })();
            const color = pct === undefined ? 'text-foreground' : pct >= 50 ? 'text-green-600' : 'text-red-600';
            return (
              <a
                key={`${c.url}-${direction}-${i}`}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border rounded-lg p-3 flex items-center gap-3 bg-background hover:shadow-md transition w-[380px]"
              >
                {c.image && (
                  <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded">
                    <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate" title={c.title}>{c.title}</div>
                  {c.chance && <div className={`text-sm mt-1 ${color}`}>{c.chance}</div>}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Header & Hero */}
      <div className="bg-background">
        <div className="max-w-7xl mx-auto px-8 pt-6 pb-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">
              PolyGuild
            </h1>
            <p className="text-xl text-muted-foreground mb-1">
              Prediction Market Analytics
            </p>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Track top traders and explore live prediction markets.
            </p>
          </div>

          {/* Removed Browse Markets button */}

          {/* Top 3 Traders */}
          {(topLoading || topThree.length > 0) && (
            <div className="max-w-7xl mx-auto mb-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-none md:grid-rows-none md:flex md:flex-row md:gap-3 md:justify-center">
                {topThree.map((t, idx) => {
                  const colors = [
                    { ring: 'ring-yellow-400', icon: 'text-yellow-500', label: '1st', bg:'bg-yellow-50' },
                    { ring: 'ring-slate-300', icon: 'text-slate-400', label: '2nd', bg:'bg-slate-50' },
                    { ring: 'ring-amber-400', icon: 'text-amber-500', label: '3rd', bg:'bg-amber-50' },
                  ];
                  const c = colors[idx] || colors[2];
                  const pnlPositive = (t.pnl || '').startsWith('+$');
                  return (
                    <Link key={t.rank} href={t.address ? `/user/${t.address}` : (t.profileUrl || '#')} className={`border rounded-lg ${c.bg} hover:shadow-md transition ring-1 ${c.ring} aspect-square w-36 md:w-44 flex flex-col items-center justify-center text-center p-2`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-full bg-muted flex items-center justify-center ${c.icon}`}><Trophy className="w-3.5 h-3.5" /></div>
                        <span className="text-xs text-muted-foreground">{c.label}</span>
                      </div>
                      {t.avatar && (
                        <div className="w-12 h-12 rounded-full overflow-hidden mb-1.5">
                          <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate max-w-[140px] mx-auto">{t.name}</div>
                        <div className={`text-base font-bold ${pnlPositive ? 'text-green-600' : 'text-red-600'}`}>{t.pnl}</div>
                      </div>
                    </Link>
                  );
                })}
                {topLoading && topThree.length === 0 && [0,1,2].map((i) => (
                  <div key={`skeleton-${i}`} className="border rounded-lg ring-1 ring-slate-200 aspect-square w-36 md:w-44 p-2 animate-pulse bg-muted/40 flex flex-col items-center justify-center text-center">
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
          )}

          {/* Breaking marquee rows */}
          {pfCards.length > 0 && (() => {
            // Split into two distinct rows without duplicates
            const seen = new Set<string>();
            const unique = pfCards.filter(c => {
              const key = c.url || c.title;
              if (seen.has(key)) return false;
              seen.add(key); return true;
            });
            const rowA = unique.filter((_, idx) => idx % 2 === 0);
            const rowB = unique.filter((_, idx) => idx % 2 === 1);
            return (
            <div className="max-w-7xl mx-auto px-8">
              <div className="overflow-hidden"><MarqueeRow items={rowA} direction="left" /></div>
              <div className="overflow-hidden mt-1"><MarqueeRow items={rowB} direction="right" startAtIndex={Math.max(0, rowB.length - 1)} /></div>
              <style jsx global>{`
                @keyframes pg-scroll-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                /* Start the rightward row at -50% so the rightmost items are initially visible,
                   then move to 0 to reveal items to the left while scrolling right. */
                @keyframes pg-scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
                .pg-animate-left { animation: pg-scroll-left 36s linear infinite; }
                .pg-animate-right { animation: pg-scroll-right 38s linear infinite; }
              `}</style>
            </div>
            );})()}
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
