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
  // Prefer a serverless-compatible Chromium when available (Vercel/AWS Lambda)
  const { chromium: pwChromium } = await import('playwright-core');
  let browser: any | null = null;
  try {
    try {
      const mod = await import('@sparticuz/chromium');
      const chromium = (mod as any).default ?? mod;
      const executablePath = await chromium.executablePath();
      const headless = chromium.headless ?? true;
      const args = chromium.args ?? [];
      browser = await pwChromium.launch({ headless, args, executablePath });
    } catch {
      // Fallback to bundled Playwright Chromium (useful locally)
      browser = await pwChromium.launch({ headless: true });
    }
    if (!browser) throw new Error('Failed to launch Chromium');
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
          if (el) { await el.click({ force: true }); }
        } catch {}

        // Strategy 3: small delay, then ensure table updated
        await page.waitForFunction((prev) => {
          const now = Array.from(document.querySelectorAll('[data-testid="leaderboard-table"] tbody tr')).map(tr => (tr as HTMLElement).innerText.trim()).join('\n');
          return now && now !== prev;
        }, initialFingerprint, { timeout: 4000 });
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
    if (browser) await browser.close();
  }
}


