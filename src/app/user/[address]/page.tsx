"use client";

import useSWR from 'swr';
import { useMemo, useState, use as usePromise } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function UserProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = usePromise(params);
  const { data, error, isLoading } = useSWR(
    address ? `/api/trades?user=${encodeURIComponent(address)}&limit=1000` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: traded } = useSWR(
    address ? `/api/traded?user=${encodeURIComponent(address)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: positions } = useSWR(
    address ? `/api/positions?user=${encodeURIComponent(address)}&limit=100` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: posValue } = useSWR(
    address ? `/api/value?user=${encodeURIComponent(address)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const pnl = useMemo(() => {
    const pos = (positions?.data || []) as any[];
    if (!pos.length) return { totalCashPnl: 0, totalRealizedPnl: 0 };
    const totalCashPnl = pos.reduce((sum, p: any) => sum + (typeof p.cashPnl === 'number' ? p.cashPnl : 0), 0);
    const totalRealizedPnl = pos.reduce((sum, p: any) => sum + (typeof p.realizedPnl === 'number' ? p.realizedPnl : 0), 0);
    return { totalCashPnl, totalRealizedPnl };
  }, [positions]);

  const formatUSD = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  // Build realized PnL time series from trades (FIFO per market/outcome)
  const [range, setRange] = useState<'1D'|'1W'|'1M'|'ALL'>('ALL');
  const [tab, setTab] = useState<'positions'|'activity'>('positions');
  const pnlSeries = useMemo(() => {
    const trades = (data?.data || []) as any[];
    if (!trades.length) return [] as { time: number; value: number }[];
    const sorted = [...trades].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    type Inv = { size: number; avg: number };
    const inv = new Map<string, Inv>();
    let realized = 0;
    const points: { time: number; value: number }[] = [];
    const keyOf = (t: any) => `${t.conditionId}:${t.outcomeIndex ?? t.outcome ?? ''}`;
    for (const t of sorted) {
      const key = keyOf(t);
      const price = typeof t.price === 'number' ? (t.price <= 1 ? t.price * 100 : t.price) : 0; // cents
      const size = Number(t.size || 0);
      if (!inv.has(key)) inv.set(key, { size: 0, avg: 0 });
      const slot = inv.get(key)!;
      if (t.side === 'BUY') {
        // new avg cost
        const totalCost = slot.avg * slot.size + price * size;
        slot.size += size;
        slot.avg = slot.size > 0 ? totalCost / slot.size : 0;
      } else if (t.side === 'SELL') {
        const closeSize = Math.min(size, slot.size);
        if (closeSize > 0) {
          realized += ((price - slot.avg) / 100) * closeSize;
          slot.size -= closeSize;
        }
      }
      points.push({ time: (t.timestamp || 0) * 1000, value: realized });
    }
    // filter by range
    const now = Date.now();
    let start = 0;
    if (range === '1D') start = now - 24 * 60 * 60 * 1000;
    if (range === '1W') start = now - 7 * 24 * 60 * 60 * 1000;
    if (range === '1M') start = now - 30 * 24 * 60 * 60 * 1000;
    return points.filter(p => range === 'ALL' || p.time >= start);
  }, [data, range]);

  const summary = useMemo(() => {
    const trades = (data?.data || []) as any[];
    if (!trades.length) return { count: 0, buys: 0, sells: 0 };
    const buys = trades.filter(t => t.side === 'BUY').length;
    const sells = trades.filter(t => t.side === 'SELL').length;
    return { count: trades.length, buys, sells };
  }, [data]);

  // Positions controls: Active/Closed + search
  const [positionsFilter, setPositionsFilter] = useState<'active'|'closed'>('active');
  const [positionsQuery, setPositionsQuery] = useState('');
  const filteredPositions = useMemo(() => {
    const list = (positions?.data || []) as any[];
    if (!positionsQuery) return list;
    const q = positionsQuery.toLowerCase();
    return list.filter((p: any) =>
      (p.title?.toLowerCase().includes(q)) ||
      (p.slug?.toLowerCase().includes(q)) ||
      (p.outcome?.toString().toLowerCase().includes(q))
    );
  }, [positions, positionsQuery]);

  // Derive closed positions from trades aggregation
  const closedFromTrades = useMemo(() => {
    const trades = (data?.data || []) as any[];
    if (!trades.length) return [] as any[];
    type Agg = {
      key: string;
      conditionId: string;
      outcomeIndex?: number;
      title?: string;
      slug?: string;
      outcome?: string;
      totalBet: number;      // dollars
      amountWon: number;     // dollars
      lastTs: number;
      buys: number;
      sells: number;
    };
    const map = new Map<string, Agg>();
    for (const t of trades) {
      const key = `${t.conditionId}:${t.outcomeIndex ?? t.outcome ?? ''}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          conditionId: t.conditionId,
          outcomeIndex: t.outcomeIndex,
          title: t.title,
          slug: t.slug,
          outcome: t.outcome,
          totalBet: 0,
          amountWon: 0,
          lastTs: 0,
          buys: 0,
          sells: 0,
        });
      }
      const a = map.get(key)!;
      const price = typeof t.price === 'number' ? t.price : 0; // cents
      const dollars = (price / 100) * Number(t.size || 0);
      if (t.side === 'BUY') {
        a.totalBet += dollars;
        a.buys += Number(t.size || 0);
      } else if (t.side === 'SELL') {
        a.amountWon += dollars;
        a.sells += Number(t.size || 0);
      }
      a.lastTs = Math.max(a.lastTs, (t.timestamp || 0));
    }
    const result = Array.from(map.values())
      .filter(a => Math.abs(a.buys - a.sells) < 1e-6 && (a.totalBet > 0 || a.amountWon > 0))
      .sort((x, y) => y.lastTs - x.lastTs);
    return result;
  }, [data]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Profile summary card */}
          <div className="p-4 border rounded-md">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div>
                <h1 className="text-2xl font-bold truncate max-w-[420px]" title={address}>{address}</h1>
                <p className="text-xs text-muted-foreground">Positions Value: {posValue?.data ? formatUSD(posValue.data[0]?.value || 0) : '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                {(() => {
                  const arr = ((positions?.data || []) as any[]).map(p => typeof p.realizedPnl === 'number' ? p.realizedPnl : 0);
                  const max = arr.length ? Math.max(...arr) : 0;
                  const min = arr.length ? Math.min(...arr) : 0;
                  const label = max > 0 ? 'Biggest Win' : 'Biggest Loss';
                  const value = max > 0 ? max : min;
                  return (
                    <>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-xl font-bold">{positions ? formatUSD(value) : '-'}</p>
                    </>
                  );
                })()}
              </div>
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground">Predictions</p>
                <p className="text-xl font-bold">{traded?.data?.traded ?? '-'}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground">Unrealized PnL</p>
                <p className="text-xl font-bold">{positions ? formatUSD(pnl.totalCashPnl) : '-'}</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground">Realized PnL</p>
                <p className="text-xl font-bold">{positions ? formatUSD(pnl.totalRealizedPnl) : '-'}</p>
              </div>
            </div>
          </div>
          {/* Right: Realized PnL chart */}
          <div className="p-4 border rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">Profit/Loss</p>
              <div className="flex gap-2 text-sm">
                {(['1D','1W','1M','ALL'] as const).map(r => (
                  <button key={r} onClick={() => setRange(r)} className={`px-2 py-1 rounded ${range===r? 'bg-primary text-primary-foreground':'border'}`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pnlSeries} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <XAxis dataKey="time" tickFormatter={(t) => new Date(t).toLocaleDateString()} minTickGap={24} />
                  <YAxis tickFormatter={(v) => `$${v.toFixed(0)}`} width={60} />
                  <Tooltip labelFormatter={(t) => new Date(Number(t)).toLocaleString()} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'PnL']} />
                  <Line type="monotone" dataKey="value" stroke="#6b5bff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabs: Positions | Activity */}
        <div className="flex items-center gap-6 border-b">
          <button
            className={`py-2 px-1 -mb-px border-b-2 ${tab==='positions' ? 'border-foreground font-semibold' : 'border-transparent text-muted-foreground'}`}
            onClick={() => setTab('positions')}
          >
            Positions
          </button>
          <button
            className={`py-2 px-1 -mb-px border-b-2 ${tab==='activity' ? 'border-foreground font-semibold' : 'border-transparent text-muted-foreground'}`}
            onClick={() => setTab('activity')}
          >
            Activity
          </button>
        </div>

        {tab === 'positions' && (
        <div className="space-y-2">
          {/* Secondary controls row: Active | Closed + search (search only filters client-side for now) */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setPositionsFilter('active')} className={`px-3 py-1 rounded border ${positionsFilter==='active' ? 'bg-primary text-primary-foreground' : ''}`}>Active</button>
              <button onClick={() => setPositionsFilter('closed')} className={`px-3 py-1 rounded border ${positionsFilter==='closed' ? 'bg-primary text-primary-foreground' : ''}`}>Closed</button>
            </div>
            <div className="relative w-full md:w-96">
              <input value={positionsQuery} onChange={e=>setPositionsQuery(e.target.value)} placeholder="Search positions" className="w-full border rounded px-3 py-2 bg-background" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {positionsFilter === 'active' ? (
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Market</th>
                  <th className="py-2 pr-4">AVG</th>
                  <th className="py-2 pr-4">CURRENT</th>
                  <th className="py-2 pr-4">VALUE</th>
                </tr>
                ) : (
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">RESULT</th>
                  <th className="py-2 pr-4">MARKET</th>
                  <th className="py-2 pr-4">TOTAL BET</th>
                  <th className="py-2 pr-4">AMOUNT WON</th>
                </tr>
                )}
              </thead>
              <tbody>
                {(() => {
                  const listAll = (filteredPositions || []) as any[];
                  if (positionsFilter === 'closed') {
                    // Use closedFromTrades aggregation to render rows similar to reference screenshot
                    return closedFromTrades.map((a: any, idx2: number) => {
                      const initialValueNum = a.totalBet;
                      const realizedNum = a.amountWon - a.totalBet;
                      const amountWonNum = a.amountWon;
                      const profitColor = realizedNum >= 0 ? 'text-green-600' : 'text-red-600';
                      const pct = initialValueNum > 0 ? (realizedNum / initialValueNum) * 100 : 0;
                      return (
                        <tr key={`closed-${idx2}`} className="border-b align-top">
                          <td className="py-2 pr-4">
                            <div className={`inline-flex items-center gap-2 ${realizedNum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <span className={`h-2 w-2 rounded-full ${realizedNum >= 0 ? 'bg-green-600' : 'bg-red-600'}`} />
                              {realizedNum >= 0 ? 'Won' : 'Lost'}
                            </div>
                          </td>
                          <td className="py-2 pr-4">
                            <a className="underline" href={`https://polymarket.com/event/${a.slug}`} target="_blank" rel="noopener noreferrer">{a.title ?? a.slug ?? a.conditionId}</a>
                            <div className="text-xs text-muted-foreground">{a.buys.toLocaleString('en-US')} {a.outcome ?? ''}</div>
                          </td>
                          <td className="py-2 pr-4">{formatUSD(initialValueNum)}</td>
                          <td className="py-2 pr-4">
                            <div className="font-medium">{formatUSD(amountWonNum)}</div>
                            <div className={`text-xs ${profitColor}`}>{formatUSD(realizedNum)} ({pct.toFixed(2)}%)</div>
                          </td>
                        </tr>
                      );
                    });
                  }
                  const list = listAll; // active view uses raw positions
                  return list.map((p: any, idx: number) => {
                  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
                  const shares = typeof p.size === 'number' ? nf.format(p.size) : (p.size ?? '-');
                  const avgStr = typeof p.avgPrice === 'number' ? `${p.avgPrice.toFixed(1)}¢` : (typeof p.avgPrice === 'string' ? p.avgPrice : '-');
                  const curStr = typeof p.curPrice === 'number' ? `${p.curPrice.toFixed(1)}¢` : (typeof p.curPrice === 'string' ? p.curPrice : '-');
                  const curPriceNum = typeof p.curPrice === 'number' ? p.curPrice : (typeof p.curPrice === 'string' ? Number(p.curPrice.replace(/[^0-9.\-]/g, '')) : 0);
                  const valueNum = typeof p.currentValue === 'number' ? p.currentValue : (typeof p.currentValue === 'string' ? Number(p.currentValue.replace(/[^0-9.\-]/g, '')) : (typeof p.size === 'number' && typeof curPriceNum === 'number' ? (p.size * (curPriceNum / 100)) : 0));
                  const valueStr = formatUSD(valueNum);
                  const cashPnlNum = typeof p.cashPnl === 'number' ? p.cashPnl : (typeof p.cashPnl === 'string' ? Number(p.cashPnl.replace(/[^0-9.\-]/g, '')) : 0);
                  const cashPnlStr = (typeof p.cashPnl === 'string') ? p.cashPnl : formatUSD(cashPnlNum);
                  const percentStr = typeof p.percentPnl === 'number' ? `${p.percentPnl.toFixed(2)}%` : (p.percentPnl ?? '-');
                  const pnlPos = cashPnlNum >= 0;
                  const outcome = (p.outcome ?? '').toString();
                  const outcomeColor = outcome.toLowerCase() === 'yes' ? 'bg-green-600' : (outcome.toLowerCase() === 'no' ? 'bg-red-600' : 'bg-muted');
                    if (positionsFilter === 'active') {
                      return (
                        <tr key={idx} className="border-b align-top">
                          <td className="py-2 pr-4">
                            <div className="flex items-start gap-3">
                              <div className={`text-[10px] text-white px-2 py-0.5 rounded ${outcomeColor}`}>{outcome || '—'}</div>
                              <div>
                                <a className="underline" href={`https://polymarket.com/event/${p.slug}`} target="_blank" rel="noopener noreferrer">{p.title ?? p.slug ?? p.conditionId}</a>
                                <div className="text-xs text-muted-foreground">{shares} shares at {avgStr}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 pr-4">{avgStr}</td>
                          <td className="py-2 pr-4">{curStr}</td>
                          <td className="py-2 pr-4">
                            <div className="font-medium">{valueStr}</div>
                            <div className={`text-xs ${pnlPos ? 'text-green-600' : 'text-red-600'}`}>{pnlPos ? '' : '-'}{cashPnlStr} ({percentStr})</div>
                          </td>
                        </tr>
                      );
                    }
                    // Closed row
                    const initialValueNum = typeof p.initialValue === 'number' ? p.initialValue : (typeof p.initialValue === 'string' ? Number(p.initialValue.replace(/[^0-9.\-]/g, '')) : 0);
                    const realizedNum = typeof p.realizedPnl === 'number' ? p.realizedPnl : (typeof p.realizedPnl === 'string' ? Number(p.realizedPnl.replace(/[^0-9.\-]/g, '')) : 0);
                    const amountWonNum = Math.max(0, initialValueNum + realizedNum);
                    const profitColor = realizedNum >= 0 ? 'text-green-600' : 'text-red-600';
                    const pct = initialValueNum > 0 ? (realizedNum / initialValueNum) * 100 : 0;
                    return (
                      <tr key={idx} className="border-b align-top">
                        <td className="py-2 pr-4">
                          <div className={`inline-flex items-center gap-2 ${realizedNum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <span className={`h-2 w-2 rounded-full ${realizedNum >= 0 ? 'bg-green-600' : 'bg-red-600'}`} />
                            {realizedNum >= 0 ? 'Won' : 'Lost'}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <a className="underline" href={`https://polymarket.com/event/${p.slug}`} target="_blank" rel="noopener noreferrer">{p.title ?? p.slug ?? p.conditionId}</a>
                          <div className="text-xs text-muted-foreground">{shares} {outcome ? `${outcome} at ${avgStr}` : ''}</div>
                        </td>
                        <td className="py-2 pr-4">{formatUSD(initialValueNum)}</td>
                        <td className="py-2 pr-4">
                          <div className="font-medium">{formatUSD(amountWonNum)}</div>
                          <div className={`text-xs ${profitColor}`}>{formatUSD(realizedNum)} ({pct.toFixed(2)}%)</div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {tab === 'activity' && (
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-red-600">Failed to load trades</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Side</th>
                  <th className="py-2 pr-4">Outcome</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Market</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data || []).map((t: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 pr-4">{t.timestamp ? new Date(t.timestamp * 1000).toLocaleString() : '-'}</td>
                    <td className="py-2 pr-4">{t.side}</td>
                    <td className="py-2 pr-4">{t.outcome ?? '-'}</td>
                    <td className="py-2 pr-4">{t.price !== undefined ? `${t.price.toFixed(1)}¢` : '-'}</td>
                    <td className="py-2 pr-4">{t.size ?? '-'}</td>
                    <td className="py-2 pr-4"><a className="underline" href={`https://polymarket.com/event/${t.slug}`} target="_blank" rel="noopener noreferrer">{t.title ?? t.slug ?? t.conditionId}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}


