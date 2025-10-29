export type LeaderRow = {
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

export async function scrapePredictingTop(timeframe?: 'daily'|'weekly'|'monthly'): Promise<LeaderRow[]> {
  // Try fast static HTML scrape first (no headless needed)
  try {
    const staticRows = await scrapeStatic(timeframe);
    if (staticRows.length > 0) return staticRows;
  } catch {}

  // Fallback: puppeteer-core + @sparticuz/chromium
  try {
    const puppeteer = (await import('puppeteer-core')).default;
    const chromiumMod = await import('@sparticuz/chromium');
    const chromium: any = (chromiumMod as any).default ?? chromiumMod;
    const executablePath: string = (await chromium.executablePath()) || process.env.CHROMIUM_PATH || '/var/task/chromium';
    const headless: boolean = chromium.headless ?? true;
    const args: string[] = chromium.args ?? [];
    const browser = await puppeteer.launch({ headless, args, executablePath });
    try {
      const page = await browser.newPage();
      await page.goto('https://predicting.top/', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="leaderboard-table"] tbody tr', { timeout: 15000 });

    // Try to switch timeframe if requested and wait for change in table content
    if (timeframe && timeframe !== 'daily') {
      try {
        const initialFingerprint = await page.$$eval('[data-testid="leaderboard-table"] tbody tr', (trs) =>
          trs.map(tr => (tr as HTMLElement).innerText.trim()).join('\n')
        );

        const targetLabel = timeframe === 'weekly' ? 'weekly' : 'monthly';

        // Strategy 1: Click by visible text
        try {
          await page.evaluate((label) => {
            const els = Array.from(document.querySelectorAll('button, a, [role="button"]')) as HTMLElement[];
            const found = els.find(el => (el.innerText || el.textContent || '').trim().toLowerCase().includes(label));
            if (found) (found as HTMLElement).click();
          }, targetLabel);
        } catch {}

        // Strategy 2: data-testid patterns
        try {
          const testid = timeframe === 'weekly' ? '[data-testid*="weekly"]' : '[data-testid*="monthly"]';
          const el = await page.$(testid);
          if (el) { await el.click(); }
        } catch {}

        // Strategy 3: small delay, then ensure table updated
        await page.waitForFunction((prev) => {
          const now = Array.from(document.querySelectorAll('[data-testid="leaderboard-table"] tbody tr')).map(tr => (tr as HTMLElement).innerText.trim()).join('\n');
          return now && now !== prev;
        }, { timeout: 4000 }, initialFingerprint);
      } catch {
        // ignore if timeframe switch fails; fallback to current table
      }
    }
      const rows = await page.$$eval('[data-testid="leaderboard-table"] tbody tr', (trs) => {
      const toText = (el: Element | null | undefined) => el ? (el as HTMLElement).innerText.trim() : undefined;
      return trs.map((tr) => {
        const rank = toText(tr.querySelector('[data-testid^="text-rank-"]')) || '0';
        const avatar = (tr.querySelector('td [data-testid^="avatar-img-trader-"]') as HTMLImageElement | null)?.src || undefined;
        const name = toText(tr.querySelector('[data-testid^="text-trader-name-"]')) || '';
        const joined = toText(tr.querySelector('[data-testid^="text-joined-"]'));
        const pnl = toText(tr.querySelector('[data-testid^="text-pnl-"]')) || '';
        const a = tr.querySelector('a[href^="/account/"]') as HTMLAnchorElement | null;
        const profileUrl = a ? new URL(a.getAttribute('href')!, 'https://predicting.top').toString() : undefined;
        const addrMatch = a?.getAttribute('href')?.match(/\/account\/([^?]+)/);
        const address = addrMatch ? addrMatch[1] : undefined;
        const twBtn = tr.querySelector('[data-testid^="button-twitter-"] a') as HTMLAnchorElement | null;
        const pmBtn = tr.querySelector('[data-testid^="button-polymarket-"] a') as HTMLAnchorElement | null;
        const hasTwitter = !!twBtn;
        const hasPolymarket = !!pmBtn;
        const twitterUrl = (twBtn && twBtn.href) || undefined;
        const polymarketUrl = (pmBtn && pmBtn.href) || (address ? `https://polymarket.com/profile/${address}` : undefined);
        const hasKalshi = !!tr.querySelector('[data-testid^="button-kalshi-"]');
        return { rank: Number(rank), avatar, name, joined, pnl, profileUrl, address, hasTwitter, hasPolymarket, hasKalshi, twitterUrl, polymarketUrl };
      });
      });
      return rows;
    } finally {
      await browser.close();
    }
  } catch (e) {
    // If headless also fails, return static scrape (may be partial)
    return await scrapeStatic('daily');
  }
}

async function scrapeStatic(timeframe?: 'daily'|'weekly'|'monthly'): Promise<LeaderRow[]> {
  // predicting.top is often SSR; attempt plain HTML parse (daily only reliably)
  if (timeframe && timeframe !== 'daily') timeframe = 'daily';
  const res = await fetch('https://predicting.top/', { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
  const html = await res.text();
  const tableMatch = html.match(/<table[^>]*data-testid="leaderboard-table"[\s\S]*?<\/table>/i);
  const table = tableMatch ? tableMatch[0] : html;
  const rows: LeaderRow[] = [];
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  const toText = (s?: string) => (s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  for (const m of table.matchAll(trRegex)) {
    const tr = m[0];
    const rank = Number((tr.match(/data-testid="text-rank-[^"]*"[^>]*>([^<]+)/)?.[1] || '0').trim());
    const name = toText(tr.match(/data-testid="text-trader-name-[^"]*"[\s\S]*?>([^<]+)/)?.[1]);
    const joined = toText(tr.match(/data-testid="text-joined-[^"]*"[\s\S]*?>([^<]+)/)?.[1]);
    const pnl = toText(tr.match(/data-testid="text-pnl-[^"]*"[\s\S]*?>([^<]+)/)?.[1]);
    const avatar = tr.match(/data-testid="avatar-img-trader-[^"]*"[^>]*src="([^"]+)"/i)?.[1];
    const address = tr.match(/href="\/account\/([^"?]+)/i)?.[1];
    const hasTwitter = /data-testid="button-twitter-/.test(tr);
    const hasPolymarket = /data-testid="button-polymarket-/.test(tr);
    const twitterUrl = tr.match(/data-testid="button-twitter-[^"]*"[\s\S]*?href="([^"]+)"/i)?.[1];
    const polymarketUrl = tr.match(/data-testid="button-polymarket-[^"]*"[\s\S]*?href="([^"]+)"/i)?.[1] || (address ? `https://polymarket.com/profile/${address}` : undefined);
    if (!name) continue;
    rows.push({ rank, name, pnl, avatar, joined, address, hasTwitter, hasPolymarket, hasKalshi: /button-kalshi-/.test(tr), twitterUrl, polymarketUrl });
  }
  return rows.filter(r => !!r.name);
}


