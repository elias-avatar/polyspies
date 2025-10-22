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
  const [stats, setStats] = useState<{
    totalOpportunities: number;
    largestGap: number;
  } | null>(null);

  useEffect(() => {
    fetchTopOpportunities();
    fetchPredictFolio();
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

  // Auto-scrolling carousel row (no drag interactivity)
  function MarqueeRow({ items, direction }: { items: typeof pfCards; direction: 'left'|'right' }) {
    // Duplicate items to create seamless loop
    const loopItems = React.useMemo(() => {
      const base = items || [];
      return [...base, ...base];
    }, [items]);
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
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PolyGuild
            </h1>
            <p className="text-2xl text-muted-foreground mb-2">
              Prediction Market Analytics
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track top traders and explore live prediction markets.
            </p>
          </div>

          <div className="flex justify-center gap-4 mb-12">
            <Link href="/markets">
              <Button size="lg" variant="outline">
                Browse Markets
              </Button>
            </Link>
          </div>

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
              <div className="overflow-hidden mt-6"><MarqueeRow items={rowB} direction="right" /></div>
              <style jsx global>{`
                @keyframes pg-scroll-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                @keyframes pg-scroll-right { from { transform: translateX(0); } to { transform: translateX(50%); } }
                .pg-animate-left { animation: pg-scroll-left 40s linear infinite; }
                .pg-animate-right { animation: pg-scroll-right 42s linear infinite; }
              `}</style>
            </div>
            );})()}
        </div>
      </div>

      

      {/* Removed arbitrage section */}

      {/* Removed bottom breaking grid in favor of marquee */}

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to start finding arbitrage opportunities?
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join PolyGuild today and get instant access to real-time arbitrage detection across prediction markets.
        </p>
        <Link href="/arbitrage">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </main>
  );
}
