"use client";

import * as React from "react";
import Link from "next/link";

type Match = {
  id: string;
  playerA: { address: string; name?: string; avatar?: string };
  playerB: { address: string; name?: string; avatar?: string };
  timeframe: '1D'|'1W'|'1M';
  startedAt: number; // epoch seconds
  endsAt: number; // epoch seconds
};

export default function CompetitionsPage() {
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [tab, setTab] = React.useState<'official'|'community'>('official');
  const [official, setOfficial] = React.useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      if (tab === 'community') {
        const r = await fetch(`/api/competitions`, { cache: 'no-store' });
        const j = await r.json();
        setMatches(Array.isArray(j?.data) ? j.data : []);
      } else {
        // Load official traders from leaderboard
        const r = await fetch(`/api/leaderboard/daily`, { cache: 'no-store' });
        const j = await r.json();
        setOfficial(Array.isArray(j?.data) ? j.data : []);
      }
    } catch { setMatches([]); setOfficial([]); }
    setLoading(false);
  }

  React.useEffect(() => { load(); }, [tab]);

  const fmtTimeLeft = (end: number) => {
    const s = Math.max(0, end - Math.floor(Date.now()/1000));
    const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60;
    return `${h}h ${m}m ${sec}s`;
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h1 className="text-3xl font-bold">Competitions</h1>
          <div className="text-sm text-muted-foreground">Head-to-head PnL over a timeframe</div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex border rounded-md overflow-hidden text-sm">
            <button onClick={()=>setTab('official')} className={`px-3 py-1 ${tab==='official'?'bg-primary text-primary-foreground':'bg-background hover:bg-accent'}`}>Official</button>
            <button onClick={()=>setTab('community')} className={`px-3 py-1 border-l ${tab==='community'?'bg-primary text-primary-foreground':'bg-background hover:bg-accent'}`}>Community</button>
          </div>
          {tab==='community' && <CreateForm onCreated={load} />}
        </div>

        {tab==='official' ? (
          <div>
            <div className="border rounded-lg p-4 mb-4 bg-blue-500/10 text-blue-300 border-blue-500/30">Competitions (Season 1) is starting soon — TBA.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading && Array.from({length:6}).map((_,i)=> (
                <div key={`sk-o-${i}`} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              ))}
              {!loading && official.map((r: any, idx) => (
                <div key={idx} className="border rounded-lg p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">{r.avatar && <img src={r.avatar} alt="" className="w-full h-full object-cover" />}</div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name || (r.address ? r.address.slice(0,6) : '')}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.address}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading && Array.from({length:4}).map((_,i)=> (
              <div key={`sk-${i}`} className="border rounded-lg p-4 animate-pulse">
                <div className="h-5 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            ))}

            {!loading && matches.map((m) => (
              <div key={m.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-muted-foreground">Timeframe: {m.timeframe}</div>
                  <div className="text-sm">Ends in {fmtTimeLeft(m.endsAt)}</div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  {[m.playerA, m.playerB].map((p, idx) => (
                    <div key={idx} className="flex-1 border rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden" />
                        <div className="min-w-0">
                          <Link href={p.address ? `/user/${p.address}` : '#'} className="font-medium hover:underline truncate">
                            {p.name || (p.address ? p.address.slice(0,6) : 'Player')}
                          </Link>
                          <div className="text-xs text-muted-foreground">Current PnL: —</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right">
                  <button className="border rounded px-3 py-1 text-sm">View Match</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateForm({ onCreated }: { onCreated: ()=>void }) {
  const [playerA, setPlayerA] = React.useState('');
  const [playerB, setPlayerB] = React.useState('');
  const [timeframe, setTimeframe] = React.useState<'1D'|'1W'|'1M'>('1D');
  const [duration, setDuration] = React.useState<number>(24);
  const [me, setMe] = React.useState<string>('0x000000'); // placeholder; wire to auth later
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/competitions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
        playerA: { address: playerA }, playerB: { address: playerB }, timeframe, durationHours: duration, createdBy: me,
      })});
      setPlayerA(''); setPlayerB(''); setTimeframe('1D'); setDuration(24);
      onCreated();
    } catch {}
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 text-sm">
      <input value={playerA} onChange={e=>setPlayerA(e.target.value)} placeholder="Player A address" className="border rounded px-2 py-1 bg-background" required />
      <span>vs</span>
      <input value={playerB} onChange={e=>setPlayerB(e.target.value)} placeholder="Player B address" className="border rounded px-2 py-1 bg-background" required />
      <select value={timeframe} onChange={e=>setTimeframe(e.target.value as any)} className="border rounded px-2 py-1 bg-background">
        <option value="1D">1D</option>
        <option value="1W">1W</option>
        <option value="1M">1M</option>
      </select>
      <input type="number" min={1} value={duration} onChange={e=>setDuration(Number(e.target.value))} className="border rounded px-2 py-1 w-20 bg-background" />
      <button type="submit" className="border rounded px-3 py-1" disabled={saving}>{saving?'Creating...':'Create'}</button>
    </form>
  );
}



