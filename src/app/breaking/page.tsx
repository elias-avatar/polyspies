import { getBreakingCache } from "@/lib/breaking/cache";

type PFCard = { title: string; url: string; image?: string; chance?: string };

export const revalidate = 60;

export default async function BreakingPage() {
  // Try in-memory cache first
  let cards: PFCard[] = getBreakingCache().data || [];

  // Fallback to API fetch when cache is empty (works locally and on Vercel)
  if (!cards.length) {
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const res = await fetch(`${base}/api/predictfolio`, { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          cards = json.data as PFCard[];
        }
      }
    } catch {
      // ignore and show skeleton
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-1">Breaking</h1>
          <p className="text-muted-foreground">Markets moving now</p>
        </div>

        {cards.length === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-40 border rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {cards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((c: PFCard, idx: number) => {
              const pct = (() => {
                const m = c.chance?.match(/(\d+)(?=%)/);
                return m ? parseInt(m[1], 10) : undefined;
              })();
              const color = pct === undefined ? 'text-foreground' : pct >= 50 ? 'text-green-600' : 'text-red-600';
              return (
                <div key={`${c.url}-${idx}`} className="border rounded-lg hover:shadow-md transition p-3 flex gap-3">
                  {c.image && (
                    <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded">
                      <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate" title={c.title}>{c.title}</div>
                    {c.chance && <div className={`text-sm mt-1 ${color}`}>{c.chance}</div>}
                    <div className="mt-3">
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-sm px-3 py-1 border rounded hover:bg-muted">Open</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


