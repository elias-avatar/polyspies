import { NextRequest, NextResponse } from 'next/server';

// Very lightweight HTML extraction for PredictFolio dashboard cards
// We intentionally avoid heavy HTML parsers. This extracts links, titles, images, and chances

export async function GET(_req: NextRequest) {
  try {
    // Always prefer PredictFolio API (stable JSON). Avoid brittle HTML/JS scraping.
    const direct = await predictFolioAPI();
    if (direct.length > 0) {
      return NextResponse.json({ success: true, count: direct.length, data: direct });
    }
    // Fallback to Gamma-based breaking list
    const gamma = await gammaBreaking();
    return NextResponse.json({ success: true, count: gamma.length, data: gamma });
  } catch (e: any) {
    console.error('predictfolio proxy error', e?.message || e);
    try {
      const direct = await predictFolioAPI();
      return NextResponse.json({ success: true, count: direct.length, data: direct });
    } catch {
      try {
        const headless = await predictFolioHeadless();
        return NextResponse.json({ success: true, count: headless.length, data: headless });
      } catch (err2: any) {
        console.error('headless scrape failed', err2?.message || err2);
        return NextResponse.json({ success: false, error: 'Failed to load PredictFolio' }, { status: 500 });
      }
    }
  }
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function tryParseArr<T=any>(val: any): T[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string') {
    try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed as T[]; } catch {}
  }
  return undefined;
}

async function gammaBreaking(limit: number = 24): Promise<Array<{ title: string; url: string; image?: string; chance?: string }>> {
  // Fetch newest active events and flatten to markets, then rank by |oneDayPriceChange|
  const results: Array<{ title: string; url: string; image?: string; chance?: string; delta: number }> = [];
  let offset = 0;
  for (let page = 0; page < 3; page++) { // up to ~300 events
    const url = `https://gamma-api.polymarket.com/events?order=id&ascending=false&closed=false&limit=100&offset=${offset}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) break;
    const data = await r.json();
    const events = Array.isArray(data?.events) ? data.events : (Array.isArray(data) ? data : []);
    if (!events.length) break;
    for (const ev of events) {
      const markets = Array.isArray(ev?.markets) ? ev.markets : [];
      for (const m of markets) {
        // Compute yes chance
        let yes: number | undefined;
        const outcomes = tryParseArr<string>(m?.outcomes) || tryParseArr<string>(m?.shortOutcomes);
        const prices = tryParseArr<number>(m?.outcomePrices);
        if (outcomes && prices) {
          const idx = outcomes.findIndex((o)=>String(o).toLowerCase()==='yes');
          if (idx>=0 && typeof prices[idx]==='number') yes = prices[idx];
        }
        const bestBid = typeof m?.bestBid === 'number' ? m.bestBid : undefined;
        if (yes === undefined && typeof bestBid === 'number') yes = bestBid;
        const pct = typeof yes === 'number' ? (yes <= 1 ? yes*100 : yes) : undefined;
        const delta = Math.abs(typeof m?.oneDayPriceChange === 'number' ? (m.oneDayPriceChange <= 1 ? m.oneDayPriceChange*100 : m.oneDayPriceChange) : 0);
        const title = m?.question || m?.title || ev?.title || 'Market';
        const image = m?.image || m?.twitterCardImage || ev?.image || undefined;
        const slug = m?.slug || ev?.slug;
        const url = slug ? `https://polymarket.com/market/${slug}` : 'https://polymarket.com/';
        results.push({ title, url, image, chance: pct !== undefined ? `${pct.toFixed(0)}% Chance` : undefined, delta });
      }
    }
    offset += 100;
  }
  const sorted = results.sort((a,b)=> (b.delta - a.delta)).slice(0, limit).map(({delta, ...rest})=>rest);
  return sorted;
}

async function predictFolioAPI(limit: number = 24): Promise<Array<{ title: string; url: string; image?: string; chance?: string }>> {
  const r = await fetch('https://predictfolio.com/api/biggest-movers', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const json = await r.json();
  const markets = Array.isArray(json?.markets) ? json.markets : [];
  const items = markets.slice(0, limit * 2).map((m: any) => {
    // compute yes chance
    let yes: number | undefined;
    const outcomes = tryParseArr<string>(m?.outcomes) || tryParseArr<string>(m?.shortOutcomes);
    let prices = tryParseArr<any>(m?.outcomePrices);
    if (Array.isArray(prices)) {
      prices = prices.map((p: any) => typeof p === 'string' ? parseFloat(p) : (typeof p === 'number' ? p : NaN));
    }
    if (outcomes && Array.isArray(prices)) {
      const idx = outcomes.findIndex((o)=>String(o).toLowerCase()==='yes');
      const val = idx>=0 ? prices[idx] : undefined;
      if (typeof val === 'number' && !Number.isNaN(val)) yes = val;
    }
    // Fallback: assume first price corresponds to YES when outcomes are missing
    if (yes === undefined && Array.isArray(prices) && typeof prices[0] === 'number' && !Number.isNaN(prices[0])) {
      yes = prices[0];
    }
    const pct = typeof yes === 'number' ? (yes <= 1 ? yes*100 : yes) : undefined;

    // Robust slug extraction; guard against template literals like ${h.slug}
    const extractSlug = (): string | undefined => {
      const direct = typeof m?.slug === 'string' ? m.slug : undefined;
      const bad = (s?: string) => !!s && /\$\{[^}]+\}/.test(s);
      if (direct && !bad(direct)) return direct;

      // Try nested props or links
      const alt1 = typeof m?.market?.slug === 'string' ? m.market.slug : undefined;
      if (alt1 && !bad(alt1)) return alt1;
      const href: string | undefined = m?.href || m?.url || m?.link;
      if (typeof href === 'string') {
        const mm = href.match(/\/market\/([^?\s#]+)/);
        if (mm && mm[1] && !bad(mm[1])) return mm[1];
      }
      return undefined;
    };
    const slug = extractSlug();
    if (!slug) return null as any;
    return {
      title: m?.question || m?.title,
      url: `https://polymarket.com/market/${slug}?via=predictfolio`,
      image: m?.image,
      chance: pct !== undefined ? `${pct.toFixed(0)}% Chance` : undefined,
    };
  });
  // Filter any nulls and limit
  return items.filter(Boolean).slice(0, limit);
}

async function predictFolioHeadless(limit: number = 24): Promise<Array<{ title: string; url: string; image?: string; chance?: string }>> {
  // Serverless-friendly Playwright: use playwright-core + @sparticuz/chromium in prod
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
      browser = await pwChromium.launch({ headless: true });
    }
    if (!browser) throw new Error('Failed to launch Chromium');
    const page = await browser.newPage();
    await page.goto('https://predictfolio.com/dashboard', { waitUntil: 'domcontentloaded' });
    // Wait for the container to appear and populate
    await page.waitForSelector('div.A0zx1ilc div.e9leUTpi a', { timeout: 15000 });
    // Extract anchors inside the container
    const anchors = await page.$$eval('div.A0zx1ilc div.e9leUTpi a', (nodes) => nodes.map((a) => {
      const url = (a as HTMLAnchorElement).href;
      const img = a.querySelector('img') as HTMLImageElement | null;
      const h2 = a.querySelector('h2');
      const h3 = a.querySelector('h3');
      return {
        url,
        image: img?.src || undefined,
        title: h2?.textContent?.trim() || undefined,
        chance: h3?.textContent?.trim() || undefined,
      };
    }));
    return (anchors || []).filter(x => x.url && x.title).slice(0, limit);
  } finally {
    if (browser) await browser.close();
  }
}


