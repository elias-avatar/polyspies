"use client";

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function TopHolders({ conditionId }: { conditionId: string }) {
  const { data, error, isLoading } = useSWR(
    conditionId ? `/api/holders?market=${encodeURIComponent(conditionId)}&limit=5` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (!conditionId) return null;
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading holders…</div>;
  if (error || !data?.success) return <div className="text-xs text-muted-foreground">Holders unavailable</div>;

  const entry = Array.isArray(data?.data) ? data.data[0] : null;
  const holders: any[] = entry?.holders || [];
  if (!holders.length) return <div className="text-xs text-muted-foreground">No holders</div>;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Top Holders</p>
      <ul className="space-y-1">
        {holders.slice(0, 5).map((h, idx) => (
          <li key={`${h.proxyWallet}-${idx}`} className="flex items-center justify-between text-xs">
            <a
              href={`/user/${h.proxyWallet}`}
              className="truncate max-w-[70%] underline"
              title={h.name || h.proxyWallet}
            >
              {h.name || h.proxyWallet}
            </a>
            <span className="text-muted-foreground">{h.amount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


