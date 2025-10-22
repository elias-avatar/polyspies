// Unified types for both Polymarket and Kalshi platforms

export type Platform = 'polymarket' | 'kalshi';

export interface UnifiedMarket {
  id: string;
  platform: Platform;
  externalId: string;
  title: string;
  category?: string;
  description?: string;
  yesPrice: number;  // Normalized to 0-100 scale
  noPrice: number;   // Normalized to 0-100 scale
  volume24h?: number;
  volume1w?: number;
  volume1m?: number;
  volume1y?: number;
  liquidity?: number;
  endDate?: Date;
  startDate?: Date;
  url: string;
  lastUpdated: Date;
  bestBid?: number;     // 0-100
  bestAsk?: number;     // 0-100
  lastTradePrice?: number; // 0-100
  imageUrl?: string;
  iconUrl?: string;
  tags?: string[];
  metadata?: any;
}

export interface UnifiedEvent {
  id: string;
  platform: Platform;
  title: string;
  description?: string;
  markets: UnifiedMarket[];
  category?: string;
  endDate?: Date;
}

export interface UnifiedPosition {
  marketTitle: string;
  platform: Platform;
  side: 'yes' | 'no';
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface UnifiedOrderBook {
  platform: Platform;
  marketId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdated: Date;
}

export interface OrderBookLevel {
  price: number;  // Normalized to 0-100
  size: number;   // Number of contracts/shares
}

export interface UnifiedTrade {
  id: string;
  platform: Platform;
  marketId: string;
  marketName: string;
  side: 'yes' | 'no';
  price: number;
  size: number;
  timestamp: Date;
  traderId?: string;
}

export interface TraderStats {
  id: string;
  platform: Platform;
  address?: string;
  username?: string;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgReturn: number;
  performanceHistory?: PerformanceDataPoint[];
  lastUpdated: Date;
}

export interface PerformanceDataPoint {
  date: Date;
  pnl: number;
  cumulativePnL: number;
  tradesCount: number;
}

export interface ArbitrageOpportunity {
  id: string;
  marketTitle: string;
  polymarket: {
    id: string;
    price: number;
    url: string;
  };
  kalshi: {
    id: string;
    price: number;
    url: string;
  };
  priceDifference: number;
  percentageGap: number;
  potentialProfit: number; // For $100 investment
  detectedAt: Date;
  status: 'active' | 'expired';
}

// Response types from APIs
export interface PolymarketMarketResponse {
  condition_id: string;
  question: string;
  slug: string;
  description?: string;
  end_date_iso?: string;
  game_start_time?: string;
  tags?: string[];
  outcomes?: string[];
  outcome_prices?: string[];
  volume?: string;
  liquidity?: string;
  active?: boolean;
  closed?: boolean;
  category?: string;
}

export interface PolymarketEventResponse {
  id: string;
  slug: string;
  title: string;
  description?: string;
  markets?: PolymarketMarketResponse[];
  end_date_iso?: string;
  active?: boolean;
}

export interface KalshiMarketResponse {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle?: string;
  open_time: string;
  close_time: string;
  expiration_time: string;
  status: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  last_price?: number;
  previous_yes_bid?: number;
  previous_yes_ask?: number;
  previous_price?: number;
  volume?: number;
  volume_24h?: number;
  liquidity?: number;
  open_interest?: number;
  result?: string;
  can_close_early?: boolean;
  expiration_value?: string;
  category?: string;
  risk_limit_cents?: number;
  strike_type?: string;
  floor_strike?: number;
  cap_strike?: number;
  notional_value?: number;
  tick_size?: number;
  yes_sub_title?: string;
  no_sub_title?: string;
  rules_primary?: string;
  rules_secondary?: string;
}

export interface KalshiEventResponse {
  event_ticker: string;
  title: string;
  subtitle?: string;
  category: string;
  series_ticker?: string;
  mutually_exclusive: boolean;
  markets?: KalshiMarketResponse[];
}

// Filter and query types
export interface MarketFilters {
  platform?: Platform;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  endDateAfter?: Date;
  endDateBefore?: Date;
  search?: string;
  tags?: string[];
  status?: 'open' | 'closed' | 'all';
}

export interface ArbitrageFilters {
  minGap?: number;  // Minimum percentage gap
  category?: string;
  sortBy?: 'gap' | 'profit' | 'detected';
  status?: 'active' | 'expired' | 'all';
}

export interface TraderFilters {
  platform?: Platform;
  minTrades?: number;
  minWinRate?: number;
  minPnL?: number;
  timeframe?: '24h' | '7d' | '30d' | 'all';
  sortBy?: 'pnl' | 'winRate' | 'trades' | 'roi';
}

