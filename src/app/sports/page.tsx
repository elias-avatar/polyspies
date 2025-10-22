"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UnifiedMarket } from '@/lib/unified/types';

export default function SportsPage() {
  const [sports, setSports] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState<string | undefined>(undefined);
  const [markets, setMarkets] = useState<UnifiedMarket[]>([]);
  const [live, setLive] = useState<UnifiedMarket[]>([]);
  const [soon, setSoon] = useState<UnifiedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const PAGE = 50;

  useEffect(() => {
    fetchSports();
  }, []);

  useEffect(() => {
    fetchMarkets(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSport]);

  const fetchSports = async () => {
    try {
      const res = await fetch('/api/sports?type=meta');
      const json = await res.json();
      if (json.success) setSports(json.data);
      const tr = await fetch('/api/sports?type=teams&limit=200');
      const tj = await tr.json();
      if (tj.success) setTeams(tj.data);
    } catch (e) {
      console.error('load sports', e);
    }
  };

  const fetchMarkets = async (start = 0) => {
    setLoading(true);
    try {
      // Build full result set for selected sport (aggregate all pages & all related tag_ids)
      const aggregate: UnifiedMarket[] = [];
      // Build tag list: if a sport is selected, use its tags; else aggregate all sports tags
      const selected = selectedSport
        ? sports.filter((s: any) => String(s.sport) === String(selectedSport))
        : sports;
      const allTagIds: string[] = selected
        .flatMap((s: any) => String(s?.tags || '')
          .split(',')
          .map((v: string) => v.trim())
          .filter(Boolean))
        .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);
      for (const tag of allTagIds) {
        for (let startOff = 0; startOff < PAGE * 10; startOff += PAGE) {
          const q = new URLSearchParams();
          q.set('limit', String(PAGE));
          q.set('offset', String(startOff));
          q.set('tag_id', tag);
          const res = await fetch(`/api/markets?${q.toString()}`);
          const json = await res.json();
          if (!json?.success) break;
          const arr: UnifiedMarket[] = json.data || [];
          aggregate.push(...arr);
          if (arr.length < PAGE) break;
        }
      }
      // Deduplicate by externalId/id
      const seen = new Set<string>();
      const dedup: UnifiedMarket[] = [];
      for (const m of aggregate) {
        const k = String(m.externalId || m.id);
        if (seen.has(k)) continue;
        seen.add(k);
        dedup.push(m);
      }
      // Filter to sports-only markets: require sports hints in metadata (sportsMarketType/team ids) or known sports tags
      const sportsOnly = dedup.filter((m: any) => {
        const meta = (m as any).metadata || {};
        const hasTeams = Boolean(meta.teamAID) || Boolean(meta.teamBID);
        const hasSportsFlag = typeof meta.sportsMarketType === 'string';
        // Exclude typical non-sports titles (crypto up/down)
        const title = String(m.title || '').toLowerCase();
        const looksCrypto = /bitcoin|ethereum|solana|xrp|btc|eth|sol|up or down|\bcrypto\b/.test(title);
        return (hasTeams || hasSportsFlag) && !looksCrypto;
      });
      setMarkets(sportsOnly);
      setOffset(start);
      // Slice into Live and Starting Soon
      const now = Date.now();
      const soonHorizon = now + 48 * 60 * 60 * 1000; // 48h
      const liveMkts: UnifiedMarket[] = [];
      const soonMkts: UnifiedMarket[] = [];
      for (const m of sportsOnly) {
        const meta: any = (m as any).metadata || {};
        const startIso: any = meta.eventStartTime || meta.gameStartTime || meta.startDateIso;
        const startTs = startIso ? Date.parse(startIso) : (m.startDate ? m.startDate.getTime() : undefined);
        const isClosed = meta.closed === true || meta.active === false;
        if (isClosed) continue;
        const isLive = Boolean(meta.fpmmLive) || (typeof startTs === 'number' && startTs <= now && now - startTs < 4 * 60 * 60 * 1000);
        if (isLive) liveMkts.push(m);
        else if (typeof startTs === 'number' && startTs > now && startTs <= soonHorizon) soonMkts.push(m);
      }
      liveMkts.sort((a: any, b: any) => ((b.volume24h || 0) - (a.volume24h || 0)));
      soonMkts.sort((a: any, b: any) => {
        const aStart = Date.parse(((a as any).metadata?.eventStartTime) || '') || (a.startDate ? a.startDate.getTime() : 0);
        const bStart = Date.parse(((b as any).metadata?.eventStartTime) || '') || (b.startDate ? b.startDate.getTime() : 0);
        return aStart - bStart;
      });
      setLive(liveMkts);
      setSoon(soonMkts);
    } catch (e) {
      console.error('load markets', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Sports</h1>
          <p className="text-muted-foreground">Browse Polymarket sports metadata, teams, and markets</p>
        </div>

        {/* Sports selector */}
        <div className="mb-6 flex flex-wrap gap-2 items-center border-b pb-3">
          <Button variant={!selectedSport ? 'default' : 'outline'} onClick={() => setSelectedSport(undefined)}>All</Button>
          {sports.slice(0, 20).map((s: any) => (
            <Button key={s.sport} variant={selectedSport === String(s.sport) ? 'default' : 'outline'} onClick={() => setSelectedSport(String(s.sport))}>
              {s.sport}
            </Button>
          ))}
        </div>

        {/* Layout: sidebar + content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="md:col-span-1 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Popular</h3>
              <div className="space-y-1 text-sm">
                {sports.slice(0, 10).map((s: any) => (
                  <button key={s.sport} className={`w-full text-left px-2 py-1 rounded ${selectedSport === String(s.sport) ? 'bg-muted' : ''}`} onClick={() => setSelectedSport(String(s.sport))}>
                    {s.sport}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">All Sports</h3>
              <div className="space-y-1 text-sm max-h-64 overflow-auto">
                {sports.map((s: any) => (
                  <button key={`all-${s.sport}`} className={`w-full text-left px-2 py-1 rounded ${selectedSport === String(s.sport) ? 'bg-muted' : ''}`} onClick={() => setSelectedSport(String(s.sport))}>
                    {s.sport}
                  </button>
                ))}
              </div>
            </div>
          </aside>
          <section className="md:col-span-3">
            {/* Live */}
            <h2 className="text-2xl font-semibold mb-3">Live</h2>
            {loading ? (
              <div className="grid grid-cols-1 gap-3">
                {[...Array(3)].map((_, i) => (<div key={i} className="h-24 bg-muted animate-pulse rounded" />))}
              </div>
            ) : (
              <div className="space-y-2">
                {live.slice(0, 6).map((m: any, i: number) => (
                  <div key={`live-${i}`} className="border rounded p-3 flex items-center justify-between">
                    <div className="truncate pr-4">
                      <div className="font-medium truncate" title={m.title}>{m.title}</div>
                      <div className="text-xs text-muted-foreground">Vol 24h: {m.volume24h ?? '-'} • Yes {m.yesPrice.toFixed(1)}¢ / No {m.noPrice.toFixed(1)}¢</div>
                    </div>
                    <a className="text-blue-500 text-sm" href={m.url} target="_blank" rel="noopener noreferrer">Game View</a>
                  </div>
                ))}
                {live.length === 0 && <div className="text-sm text-muted-foreground">No live markets.</div>}
              </div>
            )}

            {/* Starting Soon */}
            <h2 className="text-2xl font-semibold mt-8 mb-3">Starting Soon</h2>
            {loading ? (
              <div className="grid grid-cols-1 gap-3">
                {[...Array(4)].map((_, i) => (<div key={i} className="h-20 bg-muted animate-pulse rounded" />))}
              </div>
            ) : (
              <div className="space-y-2">
                {soon.slice(0, 12).map((m: any, i: number) => {
                  const startIso: any = m?.metadata?.eventStartTime || m?.metadata?.gameStartTime || m?.metadata?.startDateIso;
                  const start = startIso ? new Date(startIso) : (m.startDate ? m.startDate : undefined);
                  return (
                    <div key={`soon-${i}`} className="border rounded p-3 flex items-center justify-between">
                      <div className="truncate pr-4">
                        <div className="font-medium truncate" title={m.title}>{m.title}</div>
                        <div className="text-xs text-muted-foreground">{start ? start.toLocaleString() : '—'} • Vol 24h: {m.volume24h ?? '-'}</div>
                      </div>
                      <a className="text-blue-500 text-sm" href={m.url} target="_blank" rel="noopener noreferrer">Game View</a>
                    </div>
                  );
                })}
                {soon.length === 0 && <div className="text-sm text-muted-foreground">No upcoming markets in the next 48 hours.</div>}
              </div>
            )}
          </section>
        </div>

        {/* Teams list (sample grid below the sections) */}
        <div className="mt-10 mb-6">
          <h2 className="text-xl font-semibold mb-2">Teams</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
            {teams.slice(0, 24).map((t: any) => (
              <div key={`${t.id}-${t.abbreviation}`} className="border rounded p-2">
                <div className="font-medium">{t.name}</div>
                <div className="text-muted-foreground">{t.league} · {t.abbreviation}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Raw markets grid as a fallback below */}
        <div className="mb-4 text-sm text-muted-foreground">Loaded {markets.length} markets</div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (<div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((m: any, idx: number) => (
              <div key={`${m.externalId || m.id}-${idx}`} className="border rounded p-3">
                <div className="font-semibold truncate" title={m.title}>{m.title}</div>
                <div className="text-sm mt-2">Yes {m.yesPrice.toFixed(1)}¢ · No {m.noPrice.toFixed(1)}¢</div>
                <div className="text-xs text-muted-foreground">Volume 24h: {m.volume24h ?? '-'}</div>
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm mt-2 inline-block">Open</a>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" disabled={offset === 0} onClick={() => fetchMarkets(Math.max(0, offset - PAGE))}>Previous</Button>
          <Button variant="outline" onClick={() => fetchMarkets(offset + PAGE)}>Next</Button>
        </div>
      </div>
    </div>
  );
}


