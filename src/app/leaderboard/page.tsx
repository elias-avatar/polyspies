"use client";

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import polymarketLogo from '../../../polymarket.jpeg';

type LeaderRow = {
  rank: number;
  avatar?: string;
  name: string;
  joined?: string;
  pnl: string;
  profileUrl?: string;
  address?: string;
  hasTwitter?: boolean;
  hasPolymarket?: boolean;
  hasKalshi?: boolean;
  twitterUrl?: string;
  polymarketUrl?: string;
};

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = React.useState<'daily'|'weekly'|'monthly'>('daily');
  const [rows, setRows] = React.useState<LeaderRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/leaderboard/${timeframe}`, { cache: 'no-store' });
        const j = await r.json();
        const raw: LeaderRow[] = Array.isArray(j?.data) ? j.data : [];
        const filtered = raw.filter((x) => !x.hasKalshi);
        if (!alive) return;
        setRows(filtered);
      } catch {
        if (!alive) return;
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [timeframe]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <div className="inline-flex border rounded-md overflow-hidden text-sm">
            <button onClick={() => setTimeframe('daily')} className={`px-3 py-1 ${timeframe==='daily' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}>Daily</button>
            <button onClick={() => setTimeframe('weekly')} className={`px-3 py-1 border-l ${timeframe==='weekly' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}>Weekly</button>
            <button onClick={() => setTimeframe('monthly')} className={`px-3 py-1 border-l ${timeframe==='monthly' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}>Monthly</button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full border-collapse min-w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 w-16 sm:w-20">Rank</th>
                <th className="p-2 w-12 sm:w-14"></th>
                <th className="text-left p-2">Trader</th>
                <th className="text-left p-2">Social</th>
                <th className="text-left p-2 hidden md:table-cell">Joined</th>
                <th className="text-right p-2">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && rows.map((r) => {
                const pnlClass = typeof r.pnl === 'string'
                  ? (r.pnl.trim().startsWith('+$') ? 'text-green-600' : r.pnl.trim().startsWith('-$') ? 'text-red-600' : 'text-muted-foreground')
                  : '';
                return (
                <tr key={`${timeframe}-${r.rank}-${r.address || r.name}`} className="border-b border-border hover:bg-accent/50">
                  <td className="p-2 text-sm sm:text-base">{r.rank}</td>
                  <td className="p-2">
                    {r.avatar && (
                      r.address ? (
                        <Link href={`/user/${r.address}`} className="inline-block w-8 h-8 rounded-full overflow-hidden">
                          <Image src={r.avatar} alt={r.name} width={32} height={32} className="object-cover w-full h-full" />
                        </Link>
                      ) : (
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <Image src={r.avatar} alt={r.name} width={32} height={32} className="object-cover w-full h-full" />
                        </div>
                      )
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {r.address ? (
                        <Link href={`/user/${r.address}`} className="no-underline text-foreground">{r.name}</Link>
                      ) : r.profileUrl ? (
                        <Link href={r.profileUrl} className="no-underline text-foreground" target="_blank" rel="noopener noreferrer">{r.name}</Link>
                      ) : (
                        <span>{r.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-sm">
                    <div className="flex items-center gap-2">
                      {r.hasTwitter && r.twitterUrl && (
                        <a href={r.twitterUrl} target="_blank" rel="noopener noreferrer" title="Twitter" className="inline-flex items-center justify-center w-7 h-7 rounded-full border hover:bg-muted">X</a>
                      )}
                      <a href={r.polymarketUrl || (r.address ? `https://polymarket.com/profile/${r.address}` : '#')} target="_blank" rel="noopener noreferrer" title="Polymarket" className="inline-flex items-center">
                        <Image src={polymarketLogo} alt="Polymarket" width={20} height={20} />
                      </a>
                    </div>
                  </td>
                  <td className="p-2 hidden md:table-cell text-muted-foreground text-sm sm:text-base">{r.joined || '—'}</td>
                  <td className={`p-2 text-right font-medium whitespace-nowrap ${pnlClass}`}>{r.pnl}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


