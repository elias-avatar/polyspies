import { NextRequest, NextResponse } from 'next/server';

function absolutizeUrls(html: string, base: string): string {
  return html
    .replace(/href="\/(?!\/)/g, `href="${base}/`)
    .replace(/src="\/(?!\/)/g, `src="${base}/`)
    .replace(/href=("[^"]+"|'[^']+')/g, (m) => {
      if (m.includes('target=')) return m;
      return m + ' target="_blank" rel="noopener noreferrer"';
    });
}

export async function GET(req: NextRequest) {
  try {
    const upstream = 'https://app.polysights.xyz/insider-finder';
    const res = await fetch(upstream, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    const html = await res.text();
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
    const mainHtml = mainMatch ? mainMatch[0] : '<div>Failed to load</div>';
    let fixed = absolutizeUrls(mainHtml, 'https://app.polysights.xyz');

    // If the upstream is still in the loading state (client-rendered), fall back to headless rendering
    const looksLoading = /Fetching latest insider trades/i.test(fixed) || fixed.length < 500;
    if (looksLoading) {
      try {
        const puppeteer = (await import('puppeteer-core')).default;
        const mod = await import('@sparticuz/chromium');
        const chromium: any = (mod as any).default ?? mod;
        const executablePath = (await chromium.executablePath()) || process.env.CHROMIUM_PATH || '/var/task/chromium';
        const headless = chromium.headless ?? true;
        const args = chromium.args ?? [];
        const browser = await puppeteer.launch({ headless, args, executablePath });
        const page = await browser.newPage();
        await page.goto(upstream, { waitUntil: 'networkidle' });
        // Wait for at least one market link (card content) to appear
        await page.waitForSelector('main a[href*="polymarket.com/market"], main a[href*="/market/"]', { timeout: 15000 });
        const mainHtmlRendered = await page.evaluate(() => {
          const m = document.querySelector('main');
          return m ? m.outerHTML : '';
        });
        await browser.close();
        if (mainHtmlRendered && mainHtmlRendered.length > 0) {
          fixed = absolutizeUrls(mainHtmlRendered, 'https://app.polysights.xyz');
        }
      } catch (e) {
        // keep fixed as-is if headless fails
      }
    }
    // Optional debug mode to inspect upstream response
    const url = new URL(req.url);
    if (url.searchParams.get('debug') === '1') {
      return NextResponse.json({
        success: true,
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        upstreamLength: html.length,
        sample: html.slice(0, 800),
        mainFound: !!mainMatch,
        mainLength: mainHtml.length,
        usedHeadless: looksLoading,
      });
    }
    return NextResponse.json({ success: true, html: fixed });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'insider proxy failed' }, { status: 500 });
  }
}


