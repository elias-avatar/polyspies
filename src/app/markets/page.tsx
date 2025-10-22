"use client";

import { useEffect, useState } from "react";
import { MarketCard } from "@/components/MarketCard";
import { Button } from "@/components/ui/button";
import { UnifiedMarket } from "@/lib/unified/types";

export default function MarketsPage() {
  const [markets, setMarkets] = useState<UnifiedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<'volume'|'liquidity'|'enddate'|'updated'|'none'>('none');
  const [tab, setTab] = useState<'all'|'trending'|'breaking'|'crypto'>('all');
  const PAGE_SIZE = 50;
  const [allTrending, setAllTrending] = useState<UnifiedMarket[]>([]);
  const [loadingText, setLoadingText] = useState<string>('');
  const [allBreaking, setAllBreaking] = useState<UnifiedMarket[]>([]);
  const [allCrypto, setAllCrypto] = useState<UnifiedMarket[]>([]);

  useEffect(() => {
    if (tab === 'trending') {
      // fetch and sort the entire set client-side
      fetchAllTrending();
    } else if (tab === 'breaking') {
      fetchAllBreaking();
    } else if (tab === 'crypto') {
      fetchAllCrypto();
    } else {
      fetchMarkets(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sortBy]);

  // categories removed

  const fetchMarkets = async (start = 0) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('limit', String(PAGE_SIZE));
      q.set('offset', String(start));
      if (tab === 'trending') q.set('sortBy', 'volume');
      else if (sortBy && sortBy !== 'none') q.set('sortBy', sortBy);
      const response = await fetch(`/api/markets?${q.toString()}`);
      const data = await response.json();
      if (data.success) {
        setMarkets(data.data);
        setOffset(start);
      }
    } catch (error) {
      console.error("Error fetching markets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTrending = async () => {
    setLoading(true);
    try {
      const aggregated: UnifiedMarket[] = [];
      let start = 0;
      let page = 0;
      while (true) {
        const q = new URLSearchParams();
        q.set('limit', String(PAGE_SIZE));
        q.set('offset', String(start));
        const res = await fetch(`/api/markets?${q.toString()}`);
        const json = await res.json();
        if (!json?.success) break;
        const arr: UnifiedMarket[] = json.data || [];
        aggregated.push(...arr);
        page += 1;
        setLoadingText(`Loading trending… fetched ${aggregated.length} markets (page ${page})`);
        if (arr.length < PAGE_SIZE) break;
        start += PAGE_SIZE;
      }
      // Exclude resolved/closed markets
      const openOnly = aggregated.filter((m: any) => {
        const meta = (m as any)?.metadata || {};
        const isClosed = meta.closed === true;
        const isInactive = meta.active === false;
        return !isClosed && !isInactive;
      });
      openOnly.sort((a, b) => ((b.volume24h || 0) - (a.volume24h || 0)));
      setAllTrending(openOnly);
      setOffset(0);
      setLoadingText('');
    } catch (e) {
      console.error('Error building trending list', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBreaking = async () => {
    setLoading(true);
    try {
      const aggregated: UnifiedMarket[] = [];
      let start = 0;
      let page = 0;
      while (true) {
        const q = new URLSearchParams();
        q.set('limit', String(PAGE_SIZE));
        q.set('offset', String(start));
        const res = await fetch(`/api/markets?${q.toString()}`);
        const json = await res.json();
        if (!json?.success) break;
        const arr: UnifiedMarket[] = json.data || [];
        aggregated.push(...arr);
        page += 1;
        setLoadingText(`Loading breaking… fetched ${aggregated.length} markets (page ${page})`);
        if (arr.length < PAGE_SIZE) break;
        start += PAGE_SIZE;
      }
      // Exclude closed; sort by absolute oneDayPriceChange desc (fallback to 24h volume if missing)
      const open = aggregated.filter((m: any) => !((m as any)?.metadata?.closed === true) && !((m as any)?.metadata?.active === false));
      open.sort((a: any, b: any) => {
        const ad = Math.abs(a?.metadata?.oneDayPriceChange ?? 0);
        const bd = Math.abs(b?.metadata?.oneDayPriceChange ?? 0);
        if (bd !== ad) return bd - ad;
        return (b.volume24h || 0) - (a.volume24h || 0);
      });
      setAllBreaking(open);
      setOffset(0);
      setLoadingText('');
    } catch (e) {
      console.error('Error building breaking list', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCrypto = async () => {
    setLoading(true);
    try {
      const aggregated: UnifiedMarket[] = [];
      let start = 0;
      let page = 0;
      while (true) {
        const q = new URLSearchParams();
        q.set('limit', String(PAGE_SIZE));
        q.set('offset', String(start));
        const res = await fetch(`/api/markets?${q.toString()}`);
        const json = await res.json();
        if (!json?.success) break;
        const arr: UnifiedMarket[] = json.data || [];
        aggregated.push(...arr);
        page += 1;
        setLoadingText(`Loading crypto… fetched ${aggregated.length} markets (page ${page})`);
        if (arr.length < PAGE_SIZE) break;
        start += PAGE_SIZE;
      }
      const looksCrypto = (title: string) => /bitcoin|ethereum|solana|xrp|doge|btc|eth|sol|up or down|price|crypto/i.test(title || '');
      const cryptoOnly = aggregated.filter((m: any) => looksCrypto(String(m.title || '')));
      const active = cryptoOnly.filter((m: any) => !((m as any)?.metadata?.closed === true) && !((m as any)?.metadata?.active === false));
      active.sort((a, b) => ((b.volume24h || 0) - (a.volume24h || 0)));
      setAllCrypto(active);
      setOffset(0);
      setLoadingText('');
    } catch (e) {
      console.error('Error building crypto list', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Markets</h1>
          <p className="text-xl text-muted-foreground">Browse active prediction markets from Polymarket</p>
        </div>

        {/* Tabs: All | Trending | Breaking | Sports | Crypto */}
        <div className="mb-4 flex items-center gap-3 border-b pb-3">
          <button className={`py-2 px-1 -mb-px border-b-2 ${tab==='all' ? 'border-foreground font-semibold' : 'border-transparent text-muted-foreground'}`} onClick={() => setTab('all')}>All</button>
          <button className={`py-2 px-1 -mb-px border-b-2 ${tab==='trending' ? 'border-foreground font-semibold' : 'border-transparent text-muted-foreground'}`} onClick={() => setTab('trending')}>Trending</button>
          <button className={`py-2 px-1 -mb-px border-b-2 ${tab==='breaking' ? 'border-foreground font-semibold' : 'border-transparent text-muted-foreground'}`} onClick={() => setTab('breaking')}>Breaking</button>
          <a className={`py-2 px-1 -mb-px border-b-2 border-transparent text-muted-foreground`} href="/sports" onClick={(e)=>{ e.preventDefault(); window.location.href='/sports'; }}>Sports</a>
          <button className={`py-2 px-1 -mb-px border-b-2 ${tab==='crypto' ? 'border-foreground font-semibold' : 'border-transparent text-muted-foreground'}`} onClick={() => setTab('crypto')}>Crypto</button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as any); }}
              className="border rounded px-2 py-1 bg-background"
            >
              <option value="none">Default</option>
              <option value="volume">Volume (24h)</option>
              <option value="liquidity">Liquidity</option>
              <option value="enddate">End Date</option>
              <option value="updated">Updated</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {loadingText || (tab === 'trending' ? 'Building trending list…' : 'Loading markets…')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Markets Grid */}
        {!loading && (tab === 'trending' ? allTrending.length > 0 : tab === 'breaking' ? allBreaking.length > 0 : tab==='crypto' ? allCrypto.length>0 : markets.length > 0) && (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {tab === 'trending' ? `Showing ${Math.min(PAGE_SIZE, Math.max(0, allTrending.length - offset))} of ${allTrending.length} markets`
                : tab === 'breaking' ? `Showing ${Math.min(PAGE_SIZE, Math.max(0, allBreaking.length - offset))} of ${allBreaking.length} markets`
                : tab === 'crypto' ? `Showing ${Math.min(PAGE_SIZE, Math.max(0, allCrypto.length - offset))} of ${allCrypto.length} markets`
                : `Showing ${markets.length} markets`}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(tab === 'trending' ? allTrending.slice(offset, offset + PAGE_SIZE) : tab === 'breaking' ? allBreaking.slice(offset, offset + PAGE_SIZE) : tab==='crypto' ? allCrypto.slice(offset, offset + PAGE_SIZE) : markets).map((market, idx) => {
                const key = `${market.platform}-${market.externalId || market.id || market.url || market.title}-${idx}`;
                return <MarketCard key={key} market={market} />;
              })}
            </div>
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => {
                  const next = Math.max(0, offset - PAGE_SIZE);
                  setOffset(next);
                  if (tab === 'all') fetchMarkets(next);
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const next = offset + PAGE_SIZE;
                  if (tab === 'trending' || tab === 'breaking' || tab==='crypto') setOffset(next);
                  else fetchMarkets(next);
                }}
              >
                Next
              </Button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && (tab === 'trending' ? allTrending.length === 0 : tab === 'breaking' ? allBreaking.length === 0 : tab==='crypto' ? allCrypto.length===0 : markets.length === 0) && (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No markets found</p>
            <Button onClick={fetchMarkets} className="mt-4">
              Refresh
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

