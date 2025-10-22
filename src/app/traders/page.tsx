"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TradersPage() {
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'today'|'weekly'|'monthly'|'all'>('today');

  useEffect(() => {
    // Auto-load leaderboard using heuristic from recent trades (proxy for PnL/volume)
    const load = async () => {
      setLoading(true);
      try {
        const leaderboard = await buildLeaderboard(timeframe);
        setResults(leaderboard);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [timeframe]);

  const onSearch = async () => {
    if (!address && !query) return;
    setLoading(true);
    try {
      // Minimal MVP: if an address is provided, show quick stats using existing APIs
      if (address) {
        const [trades, positions, traded] = await Promise.all([
          fetch(`/api/trades?user=${encodeURIComponent(address)}&limit=50`).then(r=>r.json()),
          fetch(`/api/positions?user=${encodeURIComponent(address)}&limit=50`).then(r=>r.json()),
          fetch(`/api/traded?user=${encodeURIComponent(address)}`).then(r=>r.json()),
        ]);
        const totalTrades = trades?.count ?? 0;
        const totalMarkets = traded?.data?.traded ?? 0;
        const pnlCurrent = (positions?.data || []).reduce((s: number, p: any) => s + (typeof p.cashPnl === 'number' ? p.cashPnl : 0), 0);
        const pnlRealized = (positions?.data || []).reduce((s: number, p: any) => s + (typeof p.realizedPnl === 'number' ? p.realizedPnl : 0), 0);
        setResults([{
          address,
          totalTrades,
          totalMarkets,
          pnlCurrent,
          pnlRealized,
        }]);
      } else {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  async function buildLeaderboard(tf: 'today'|'weekly'|'monthly'|'all') {
    // Pull a large window of trades and aggregate by user; compute gross PnL proxy via signed deltas between sells/buys price*size
    const limit = 2000; // capped by proxy API
    const res = await fetch(`/api/trades?global=true&limit=${limit}`);
    const json = await res.json();
    const trades: any[] = Array.isArray(json?.data) ? json.data : [];
    const now = Date.now();
    const windowMs = tf === 'today' ? 24*60*60*1000 : tf === 'weekly' ? 7*24*60*60*1000 : tf === 'monthly' ? 30*24*60*60*1000 : 365*24*60*60*1000;
    const cutoff = now - windowMs;
    const filtered = trades.filter(t => (t.timestamp ? t.timestamp*1000 >= cutoff : true));
    type Agg = { address: string; name?: string; volume: number; pnlProxy: number };
    const map = new Map<string, Agg>();
    for (const t of filtered) {
      const addr = t.proxyWallet || t.user || 'unknown';
      if (!map.has(addr)) map.set(addr, { address: addr, name: t.name, volume: 0, pnlProxy: 0 });
      const a = map.get(addr)!;
      const dollars = ((typeof t.price === 'number' ? t.price : 0)/100) * Number(t.size || 0);
      a.volume += Math.abs(dollars);
      a.pnlProxy += (t.side === 'SELL' ? dollars : -dollars); // crude proxy (sell proceeds - buy cost)
    }
    const list = Array.from(map.values()).sort((a,b)=> (b.pnlProxy - a.pnlProxy));
    return list.slice(0, 50);
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Traders</h1>
        <p className="text-xl text-muted-foreground mb-6">Search traders by wallet address and view quick stats. Click to view full profile.</p>

        <div className="flex flex-col md:flex-row gap-3 items-start md:items-end mb-6">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground">Wallet Address</label>
            <input value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full border rounded px-3 py-2 bg-background" placeholder="0x... or proxy wallet" />
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground">Keyword (optional)</label>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} className="w-full border rounded px-3 py-2 bg-background" placeholder="name, note (coming soon)" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Timeframe</label>
            <select value={timeframe} onChange={e=>setTimeframe(e.target.value as any)} className="border rounded px-3 py-2 bg-background">
              <option value="today">Today</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="all">All</option>
            </select>
          </div>
          <Button onClick={onSearch} disabled={loading}>{loading ? 'Searching...' : 'Search'}</Button>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading trader data…</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((r, idx) => (
            <div key={idx} className="border rounded p-4">
              <div className="text-xs text-muted-foreground">Wallet</div>
              <div className="font-mono truncate" title={r.address}>{r.address}</div>
              {r.pnlProxy !== undefined ? (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">PnL (proxy)</div><div className={`font-semibold ${r.pnlProxy>=0?'text-green-600':'text-red-600'}`}>${(r.pnlProxy||0).toFixed(0)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Volume</div><div className="font-semibold">${(r.volume||0).toFixed(0)}</div></div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Trades</div><div className="font-semibold">{r.totalTrades}</div></div>
                  <div><div className="text-xs text-muted-foreground">Markets</div><div className="font-semibold">{r.totalMarkets}</div></div>
                  <div><div className="text-xs text-muted-foreground">Unrealized PnL</div><div className={`font-semibold ${r.pnlCurrent>=0?'text-green-600':'text-red-600'}`}>${r.pnlCurrent.toFixed(2)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Realized PnL</div><div className={`font-semibold ${r.pnlRealized>=0?'text-green-600':'text-red-600'}`}>${r.pnlRealized.toFixed(2)}</div></div>
                </div>
              )}
              <Link href={`/user/${r.address}`} className="mt-4 inline-block text-blue-500">Open Profile →</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

