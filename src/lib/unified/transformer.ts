import {
  UnifiedMarket,
  UnifiedEvent,
  PolymarketMarketResponse,
  PolymarketEventResponse,
  KalshiMarketResponse,
  KalshiEventResponse,
  Platform,
} from './types';

/**
 * Normalize price to 0-100 scale
 * Polymarket uses 0-1 scale (e.g., 0.65 = 65%)
 * Kalshi uses cents (e.g., 65 = 65 cents = 65%)
 */
export function normalizePrice(price: number, platform: Platform): number {
  if (platform === 'polymarket') {
    // Convert 0-1 to 0-100
    return price * 100;
  } else {
    // Kalshi already in cents (0-100)
    return price;
  }
}

/**
 * Transform Polymarket market data to unified format
 */
export function transformPolymarketMarket(
  market: PolymarketMarketResponse
): UnifiedMarket {
  // Robust extraction from Gamma (fields may be camelCase strings)
  const m: any = market as any;
  const conditionId: string | undefined =
    m.conditionId || m.condition_id || m.conditionid || undefined;
  const polyId: string | undefined = m.id || undefined;
  let outcomes: string[] | undefined;
  let prices: number[] | undefined;

  // outcomes can be an array or a JSON string
  if (Array.isArray(m.outcomes)) outcomes = m.outcomes as string[];
  else if (typeof m.outcomes === 'string') {
    try {
      const parsed = JSON.parse(m.outcomes);
      if (Array.isArray(parsed)) outcomes = parsed;
    } catch {}
  }

  // outcomePrices may be array or JSON string; Gamma docs show string
  if (Array.isArray(m.outcome_prices)) prices = (m.outcome_prices as any[]).map(v => typeof v === 'string' ? parseFloat(v) : Number(v));
  else if (Array.isArray(m.outcomePrices)) prices = (m.outcomePrices as any[]).map(v => typeof v === 'string' ? parseFloat(v) : Number(v));
  else if (typeof m.outcomePrices === 'string') {
    try {
      const parsed = JSON.parse(m.outcomePrices);
      if (Array.isArray(parsed)) prices = parsed.map((v: any) => typeof v === 'string' ? parseFloat(v) : Number(v));
    } catch {
      // try comma-separated
      const parts = String(m.outcomePrices).split(',').map((s: string) => parseFloat(s.trim()));
      if (parts.every((n: number) => !Number.isNaN(n))) prices = parts;
    }
  }

  // Determine yes/no indices
  let yesIdx = -1, noIdx = -1;
  if (outcomes && outcomes.length) {
    yesIdx = outcomes.findIndex(o => String(o).toLowerCase() === 'yes');
    noIdx = outcomes.findIndex(o => String(o).toLowerCase() === 'no');
  }

  // Extract raw values
  let yesRaw: number | undefined;
  let noRaw: number | undefined;
  if (prices && prices.length) {
    if (yesIdx >= 0) yesRaw = prices[yesIdx];
    if (noIdx >= 0) noRaw = prices[noIdx];
    if (yesRaw === undefined && prices.length >= 1) yesRaw = prices[0];
    if (noRaw === undefined && prices.length >= 2) noRaw = prices[1];
  }

  // Infer missing side when one side present
  if (typeof yesRaw === 'number' && typeof noRaw !== 'number') noRaw = 1 - yesRaw;
  if (typeof noRaw === 'number' && typeof yesRaw !== 'number') yesRaw = 1 - noRaw;

  // Convert to 0-100 if values appear to be 0-1
  const toPct = (v?: number) =>
    typeof v === 'number' && !Number.isNaN(v)
      ? (v <= 1 ? v * 100 : v)
      : undefined;

  const y = toPct(yesRaw);
  const n = toPct(noRaw);
  const yesPrice = y !== undefined ? y : 50;
  const noPrice = n !== undefined ? n : (y !== undefined ? 100 - y : 50);

  return {
    id: conditionId || polyId || market.slug || 'unknown',
    platform: 'polymarket',
    externalId: conditionId || polyId || undefined,
    title: market.question,
    description: market.description,
    category: market.category,
    yesPrice: normalizePrice(yesPrice, 'polymarket'),
    noPrice: normalizePrice(noPrice, 'polymarket'),
    volume24h: typeof (m.volume24hr ?? m.volumeNum ?? m.volume) === 'number' ? (m.volume24hr ?? m.volumeNum ?? m.volume) : (m.volume ? parseFloat(m.volume) : undefined),
    volume1w: typeof m.volume1wk === 'number' ? m.volume1wk : undefined,
    volume1m: typeof m.volume1mo === 'number' ? m.volume1mo : undefined,
    volume1y: typeof m.volume1yr === 'number' ? m.volume1yr : undefined,
    liquidity: typeof (m.liquidityNum ?? m.liquidity) === 'number' ? (m.liquidityNum ?? m.liquidity) : (m.liquidity ? parseFloat(m.liquidity) : undefined),
    endDate: m.endDateIso ? new Date(m.endDateIso) : (m.end_date_iso ? new Date(m.end_date_iso) : (m.endDate ? new Date(m.endDate) : undefined)),
    startDate: m.startDateIso ? new Date(m.startDateIso) : (m.startDate ? new Date(m.startDate) : undefined),
    url: market.slug ? `https://polymarket.com/event/${market.slug}` : undefined,
    lastUpdated: new Date(),
    tags: market.tags,
    metadata: {
      slug: market.slug,
      outcomes: outcomes || market.outcomes,
      active: m.active,
      closed: m.closed,
      oneHourPriceChange: m.oneHourPriceChange,
      oneDayPriceChange: m.oneDayPriceChange,
      oneWeekPriceChange: m.oneWeekPriceChange,
      oneMonthPriceChange: m.oneMonthPriceChange,
      oneYearPriceChange: m.oneYearPriceChange,
      sportsMarketType: m.sportsMarketType,
      gameStartTime: m.gameStartTime,
      eventStartTime: m.eventStartTime,
      teamAID: m.teamAID,
      teamBID: m.teamBID,
      fee: m.fee,
      makerBaseFee: m.makerBaseFee,
      takerBaseFee: m.takerBaseFee,
      marketType: m.marketType,
      formatType: m.formatType,
      clobTokenIds: m.clobTokenIds,
      acceptingOrders: m.acceptingOrders,
      notificationsEnabled: m.notificationsEnabled,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      endDateIso: m.endDateIso,
      startDateIso: m.startDateIso,
      resolutionSource: m.resolutionSource,
      eventStartTime: m.eventStartTime,
      image: m.image,
      icon: m.icon,
    },
    bestBid: typeof m.bestBid === 'number' ? normalizePrice(m.bestBid, 'polymarket') : undefined,
    bestAsk: typeof m.bestAsk === 'number' ? normalizePrice(m.bestAsk, 'polymarket') : undefined,
    lastTradePrice: typeof m.lastTradePrice === 'number' ? normalizePrice(m.lastTradePrice, 'polymarket') : undefined,
    imageUrl: typeof m.image === 'string' ? m.image : undefined,
    iconUrl: typeof m.icon === 'string' ? m.icon : undefined,
  };
}

/**
 * Transform Polymarket event data to unified format
 */
export function transformPolymarketEvent(
  event: PolymarketEventResponse
): UnifiedEvent {
  return {
    id: event.id,
    platform: 'polymarket',
    title: event.title,
    description: event.description,
    markets: event.markets?.map(transformPolymarketMarket) || [],
    endDate: event.end_date_iso ? new Date(event.end_date_iso) : undefined,
  };
}

/**
 * Transform Kalshi market data to unified format
 */
export function transformKalshiMarket(
  market: KalshiMarketResponse
): UnifiedMarket {
  // Kalshi uses bid/ask prices, let's use the midpoint for simplicity
  const yesMid = market.yes_bid && market.yes_ask
    ? (market.yes_bid + market.yes_ask) / 2
    : market.last_price || 50;
  
  const noMid = market.no_bid && market.no_ask
    ? (market.no_bid + market.no_ask) / 2
    : (100 - yesMid);

  return {
    id: market.ticker,
    platform: 'kalshi',
    externalId: market.ticker,
    title: market.title,
    description: market.subtitle || market.rules_primary,
    category: market.category,
    yesPrice: normalizePrice(yesMid, 'kalshi'),
    noPrice: normalizePrice(noMid, 'kalshi'),
    volume24h: market.volume_24h,
    liquidity: market.liquidity || market.open_interest,
    endDate: new Date(market.close_time),
    url: `https://kalshi.com/markets/${market.ticker}`,
    lastUpdated: new Date(),
    metadata: {
      eventTicker: market.event_ticker,
      status: market.status,
      marketType: market.market_type,
      yesBid: market.yes_bid,
      yesAsk: market.yes_ask,
      noBid: market.no_bid,
      noAsk: market.no_ask,
      lastPrice: market.last_price,
      openInterest: market.open_interest,
      yesSubTitle: market.yes_sub_title,
      noSubTitle: market.no_sub_title,
    },
  };
}

/**
 * Transform Kalshi event data to unified format
 */
export function transformKalshiEvent(event: KalshiEventResponse): UnifiedEvent {
  return {
    id: event.event_ticker,
    platform: 'kalshi',
    title: event.title,
    description: event.subtitle,
    category: event.category,
    markets: event.markets?.map(transformKalshiMarket) || [],
  };
}

/**
 * Calculate arbitrage opportunity between two markets
 */
export function calculateArbitrage(
  polymarketPrice: number,
  kalshiPrice: number,
  investmentAmount: number = 100
): {
  priceDifference: number;
  percentageGap: number;
  potentialProfit: number;
  direction: 'poly-to-kalshi' | 'kalshi-to-poly' | null;
} {
  const difference = Math.abs(polymarketPrice - kalshiPrice);
  const percentageGap = (difference / Math.min(polymarketPrice, kalshiPrice)) * 100;
  
  // Simplified profit calculation (before fees)
  // Buy low, sell high strategy
  let potentialProfit = 0;
  let direction: 'poly-to-kalshi' | 'kalshi-to-poly' | null = null;
  
  if (polymarketPrice > kalshiPrice && difference > 2) {
    // Buy on Kalshi, sell on Polymarket
    potentialProfit = (investmentAmount / kalshiPrice) * (polymarketPrice - kalshiPrice);
    direction = 'kalshi-to-poly';
  } else if (kalshiPrice > polymarketPrice && difference > 2) {
    // Buy on Polymarket, sell on Kalshi
    potentialProfit = (investmentAmount / polymarketPrice) * (kalshiPrice - polymarketPrice);
    direction = 'poly-to-kalshi';
  }
  
  return {
    priceDifference: difference,
    percentageGap,
    potentialProfit,
    direction,
  };
}

/**
 * Match markets from different platforms
 * Uses simple string similarity for now
 */
export function matchMarkets(
  polymarkets: UnifiedMarket[],
  kalshiMarkets: UnifiedMarket[]
): Array<{
  polymarket: UnifiedMarket;
  kalshi: UnifiedMarket;
  similarity: number;
}> {
  const matches: Array<{
    polymarket: UnifiedMarket;
    kalshi: UnifiedMarket;
    similarity: number;
  }> = [];

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\b(yes|no|will|the|a|an|on|in|by|to|of|and|or|be|is|are|do|does|did|with|for|this|that|at|it|from|as)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const tokenize = (s: string): string[] => normalize(s).split(" ").filter(Boolean);
  const bigrams = (tokens: string[]): string[] => {
    const out: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) out.push(tokens[i] + "_" + tokens[i + 1]);
    return out;
  };
  const aggregateText = (m: UnifiedMarket, raw?: any): string => {
    const parts: string[] = [];
    parts.push(m.title || "");
    if (m.category) parts.push(m.category);
    if (Array.isArray(m.tags)) parts.push(...(m.tags as string[]));
    if (m.description) parts.push(m.description);
    // Kalshi extras if available
    if (raw) {
      if (typeof raw.subtitle === 'string') parts.push(raw.subtitle);
      if (typeof raw.rules_primary === 'string') parts.push(raw.rules_primary);
      if (typeof raw.rules_secondary === 'string') parts.push(raw.rules_secondary);
      if (typeof raw.event_ticker === 'string') parts.push(raw.event_ticker.replace(/[_-]/g, ' '));
      if (typeof raw.ticker === 'string') parts.push(raw.ticker.replace(/[_-]/g, ' '));
    }
    return parts.join(' ');
  };
  const jaccard = (aSet: Set<string>, bSet: Set<string>) => {
    const inter = new Set([...aSet].filter(x => bSet.has(x))).size;
    const uni = new Set([...aSet, ...bSet]).size;
    return uni === 0 ? 0 : inter / uni;
  };
  const cosine = (a: string[], b: string[]) => {
    const freq = (arr: string[]) => arr.reduce<Record<string, number>>((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {});
    const fa = freq(a), fb = freq(b);
    const keys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
    let dot = 0, na = 0, nb = 0;
    for (const k of keys) {
      const va = fa[k] || 0;
      const vb = fb[k] || 0;
      dot += va * vb;
      na += va * va;
      nb += vb * vb;
    }
    return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
  };
  const anchors = (s: string): string[] => {
    const toks = tokenize(s);
    const kws = new Set<string>();
    // numbers, years, months, ticker-like words, prominent entities
    const months = new Set(["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]);
    for (const t of toks) {
      if (/^20\d{2}$/.test(t)) kws.add(t); // year
      if (/^\d+(\.\d+)?%?$/.test(t)) kws.add(t); // numeric
      if (months.has(t)) kws.add(t);
      if (["biden","trump","btc","eth","bitcoin","ethereum","fed","rate","inflation","recession","nfl","nba","mlb","election","house","senate","gdp","cpi"].includes(t)) kws.add(t);
    }
    return Array.from(kws);
  };

  for (const polymarket of polymarkets) {
    // Attempt to locate the raw Kalshi fields by url hint (ticker at end) when comparing
    const ptoks = tokenize(aggregateText(polymarket));
    const pset = new Set(ptoks);
    const pbi = bigrams(ptoks);
    const panch = anchors(polymarket.title);

    let best: { kalshi: UnifiedMarket; score: number } | null = null;

    for (const kalshi of kalshiMarkets) {
      const raw: any = kalshi.metadata || {};
      const ktext = aggregateText(kalshi, raw);
      const ktoks = tokenize(ktext);
      const kset = new Set(ktoks);
      const kbi = bigrams(ktoks);
      const kanch = anchors(kalshi.title + ' ' + (raw?.event_ticker || ''));

      const j = jaccard(pset, kset);                 // tokens overlap
      const c = cosine(pbi, kbi);                    // phrase continuity
      const a = jaccard(new Set(panch), new Set(kanch)); // anchors overlap

      let score = 0.5 * j + 0.3 * c + 0.2 * a;

      // Heuristic boosts: similar category and close end dates
      if (polymarket.category && kalshi.category) {
        const pc = polymarket.category.toLowerCase();
        const kc = kalshi.category.toLowerCase();
        if (pc === kc || pc.includes(kc) || kc.includes(pc)) score += 0.05;
      }
      if (polymarket.endDate && kalshi.endDate) {
        const diffDays = Math.abs(
          (polymarket.endDate.getTime() - kalshi.endDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays <= 7) score += 0.1; // likely same event timeframe
      }

      if (!best || score > best.score) best = { kalshi, score };
    }

    if (best && best.score > 0.35) {
      matches.push({ polymarket, kalshi: best.kalshi, similarity: best.score });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Simple string similarity using Jaccard index
 * (intersection / union of word sets)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  // Accept values in either cents (0-100) or basis points (0-10000)
  // Normalize: if value looks like bps (>100), convert to cents by dividing by 100
  const normalized = price > 100 ? price / 100 : price;
  return `${normalized.toFixed(1)}¢`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

