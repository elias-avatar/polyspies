import axios, { AxiosInstance } from 'axios';
import {
  KalshiMarketResponse,
  KalshiEventResponse,
  UnifiedMarket,
  UnifiedEvent,
} from '../unified/types';
import {
  transformKalshiMarket,
  transformKalshiEvent,
} from '../unified/transformer';

export class KalshiClient {
  private client: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    baseURL: string = 'https://api.kalshi.com/trade-api/v2',
    private apiKey?: string
  ) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
    });
    this.cache = new Map();
  }

  /**
   * Get cached data or fetch new data
   */
  private async getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Get markets with optional filters
   */
  async getMarkets(params?: {
    limit?: number;
    cursor?: string;
    status?: 'open' | 'closed' | 'settled';
    event_ticker?: string;
    series_ticker?: string;
  }): Promise<UnifiedMarket[]> {
    const cacheKey = `markets:${JSON.stringify(params)}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const queryParams: any = {
          limit: params?.limit ?? 100,
          status: params?.status ?? 'open',
        };

        if (params?.cursor) queryParams.cursor = params.cursor;
        if (params?.event_ticker) queryParams.event_ticker = params.event_ticker;
        if (params?.series_ticker) queryParams.series_ticker = params.series_ticker;

        const response = await this.client.get('/markets', { params: queryParams });
        const markets: KalshiMarketResponse[] = response.data.markets || [];
        
        return markets.map(transformKalshiMarket);
      } catch (error) {
        console.error('Error fetching Kalshi markets:', error);
        throw error;
      }
    });
  }

  /**
   * Get market by ticker
   */
  async getMarketByTicker(ticker: string): Promise<UnifiedMarket | null> {
    const cacheKey = `market:${ticker}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const response = await this.client.get(`/markets/${ticker}`);
        const market: KalshiMarketResponse = response.data.market;
        
        return transformKalshiMarket(market);
      } catch (error) {
        console.error(`Error fetching Kalshi market ${ticker}:`, error);
        return null;
      }
    });
  }

  /**
   * Get events
   */
  async getEvents(params?: {
    limit?: number;
    cursor?: string;
    status?: 'open' | 'closed' | 'settled';
    series_ticker?: string;
  }): Promise<UnifiedEvent[]> {
    const cacheKey = `events:${JSON.stringify(params)}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const queryParams: any = {
          limit: params?.limit ?? 100,
          status: params?.status ?? 'open',
        };

        if (params?.cursor) queryParams.cursor = params.cursor;
        if (params?.series_ticker) queryParams.series_ticker = params.series_ticker;

        const response = await this.client.get('/events', { params: queryParams });
        const events: KalshiEventResponse[] = response.data.events || [];
        
        return events.map(transformKalshiEvent);
      } catch (error) {
        console.error('Error fetching Kalshi events:', error);
        throw error;
      }
    });
  }

  /**
   * Get event by ticker
   */
  async getEventByTicker(eventTicker: string): Promise<UnifiedEvent | null> {
    const cacheKey = `event:${eventTicker}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const response = await this.client.get(`/events/${eventTicker}`);
        const event: KalshiEventResponse = response.data.event;
        
        return transformKalshiEvent(event);
      } catch (error) {
        console.error(`Error fetching Kalshi event ${eventTicker}:`, error);
        return null;
      }
    });
  }

  /**
   * Search markets
   */
  async searchMarkets(query: string, limit: number = 20): Promise<UnifiedMarket[]> {
    const cacheKey = `search:${query}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        // Kalshi doesn't have a direct search endpoint, so we'll fetch markets and filter
        const allMarkets = await this.getMarkets({ limit: 200 });
        const lowerQuery = query.toLowerCase();
        
        return allMarkets
          .filter(market => 
            market.title.toLowerCase().includes(lowerQuery) ||
            market.description?.toLowerCase().includes(lowerQuery)
          )
          .slice(0, limit);
      } catch (error) {
        console.error('Error searching Kalshi markets:', error);
        return [];
      }
    });
  }

  /**
   * Get market orderbook
   */
  async getMarketOrderbook(ticker: string): Promise<{
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
  } | null> {
    const cacheKey = `orderbook:${ticker}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const response = await this.client.get(`/markets/${ticker}/orderbook`);
        const { yes, no } = response.data;
        
        // Return the yes side orderbook (simplified)
        return {
          bids: yes || [],
          asks: no || [],
        };
      } catch (error) {
        console.error(`Error fetching Kalshi orderbook for ${ticker}:`, error);
        return null;
      }
    });
  }

  /**
   * Get available series (categories)
   */
  async getSeries(): Promise<Array<{ ticker: string; title: string }>> {
    const cacheKey = 'series';
    
    return this.getCached(cacheKey, async () => {
      try {
        const response = await this.client.get('/series');
        return response.data.series || [];
      } catch (error) {
        console.error('Error fetching Kalshi series:', error);
        return [];
      }
    });
  }

  /**
   * Get markets by category
   */
  async getMarketsByCategory(seriesTicker: string, limit: number = 50): Promise<UnifiedMarket[]> {
    return this.getMarkets({ series_ticker: seriesTicker, limit, status: 'open' });
  }

  /**
   * Get market price data
   */
  async getMarketPrices(ticker: string): Promise<{
    yesPrice: number;
    noPrice: number;
  } | null> {
    try {
      const market = await this.getMarketByTicker(ticker);
      if (!market) return null;
      
      return {
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
      };
    } catch (error) {
      console.error(`Error fetching prices for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(key: string): void {
    this.cache.delete(key);
  }
}

// Export singleton instance
export const kalshiClient = new KalshiClient(
  'https://api.kalshi.com/trade-api/v2',
  process.env.KALSHI_API_KEY
);

