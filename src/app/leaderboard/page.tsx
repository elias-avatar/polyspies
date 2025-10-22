import Image from 'next/image';
import Link from 'next/link';
import { scrapePredictingTop, LeaderRow } from '@/lib/leaderboard/scraper';

export const dynamic = 'force-static';
export const revalidate = 300;

export default async function LeaderboardPage() {
  const raw = await scrapePredictingTop();
  // Filter out users with Kalshi button present
  const rows: LeaderRow[] = raw.filter(r => !r.hasKalshi);
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold">Leaderboard</h1>
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
              {rows.map((r) => (
                <tr key={r.rank} className="border-b border-border hover:bg-accent/50">
                  <td className="p-2 text-sm sm:text-base">{r.rank}</td>
                  <td className="p-2">
                    {r.avatar && (
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        <Image src={r.avatar} alt={r.name} width={32} height={32} className="object-cover w-full h-full" />
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {r.profileUrl ? (
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
                      {r.hasPolymarket && r.polymarketUrl && (
                        <a href={r.polymarketUrl} target="_blank" rel="noopener noreferrer" title="Polymarket" className="inline-flex items-center justify-center w-7 h-7 rounded-full border hover:bg-muted">P</a>
                      )}
                    </div>
                  </td>
                  <td className="p-2 hidden md:table-cell text-muted-foreground text-sm sm:text-base">{r.joined || '—'}</td>
                  <td className="p-2 text-right font-medium whitespace-nowrap">{r.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


