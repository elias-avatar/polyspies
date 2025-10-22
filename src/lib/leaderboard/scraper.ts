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

export async function scrapePredictingTop(): Promise<LeaderRow[]> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('https://predicting.top/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="leaderboard-table"] tbody tr', { timeout: 15000 });
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
}


