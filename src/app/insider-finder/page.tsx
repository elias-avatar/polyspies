import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function InsiderFinderPage() {
  let inner = '';
  try {
    const hdrs = headers();
    const host = hdrs.get('host');
    const proto = hdrs.get('x-forwarded-proto') || 'http';
    const base = process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : '');
    const res = await fetch(`${base}/api/insider-finder`, { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await res.json();
    if (j?.success) inner = j.html as string;
  } catch {}

  return (
    <div className="min-h-screen p-0 w-screen">
      <div className="w-screen max-w-none">
        <div className="max-w-none" dangerouslySetInnerHTML={{ __html: inner }} />
      </div>
    </div>
  );
}


