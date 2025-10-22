import axios, { AxiosInstance } from 'axios';
import {
  PolymarketMarketResponse,
  PolymarketEventResponse,
  UnifiedMarket,
  UnifiedEvent,
} from '../unified/types';
import {
  transformPolymarketMarket,
  transformPolymarketEvent,
} from '../unified/transformer';

export class PolymarketClient {
  private client: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(baseURL: string = 'https://gamma-api.polymarket.com') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
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
  async getMarkets(filters?: {
    closed?: boolean;
    tag?: string;        // legacy string tag
    tagId?: string | number; // gamma tag_id
    limit?: number;
    offset?: number;
  }): Promise<UnifiedMarket[]> {
    const cacheKey = `markets:${JSON.stringify(filters)}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const params: any = {
          closed: filters?.closed ?? false,
          limit: filters?.limit ?? 100,
          offset: filters?.offset ?? 0,
        };

        if (filters?.tag) params.tag = filters.tag;
        if (filters?.tagId !== undefined) params.tag_id = filters.tagId;

        const response = await this.client.get('/markets', { params });
        // Some Gamma responses nest results under .markets
        const payload = response.data;
        const markets: PolymarketMarketResponse[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.markets)
          ? payload.markets
          : [];
        
        return markets.map(transformPolymarketMarket);
      } catch (error) {
        console.error('Error fetching Polymarket markets:', error);
        throw error;
      }
    });
  }

  /**
   * Get market by slug
   */
  async getMarketBySlug(slug: string): Promise<UnifiedMarket | null> {
    const cacheKey = `market:${slug}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const response = await this.client.get(`/markets/${slug}`);
        return transformPolymarketMarket(response.data);
      } catch (error) {
        console.error(`Error fetching Polymarket market ${slug}:`, error);
        return null;
      }
    });
  }

  /**
   * Get market by condition ID
   */
  async getMarketById(conditionId: string): Promise<UnifiedMarket | null> {
    const cacheKey = `market:id:${conditionId}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const response = await this.client.get(`/markets?condition_id=${conditionId}`);
        const markets: PolymarketMarketResponse[] = response.data;
        
        if (markets.length > 0) {
          return transformPolymarketMarket(markets[0]);
        }
        return null;
      } catch (error) {
        console.error(`Error fetching Polymarket market ${conditionId}:`, error);
        return null;
      }
    });
  }

  /**
   * Get events with optional filters
   */
  async getEvents(options?: { closed?: boolean; limit?: number; offset?: number; tagId?: string | number }): Promise<UnifiedEvent[]> {
    const closed = options?.closed ?? false;
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const tagId = options?.tagId;
    const cacheKey = `events:${closed}:${limit}:${offset}:${tagId ?? ''}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const response = await this.client.get('/events', {
          params: { closed, limit, offset, order: 'id', ascending: false, ...(tagId !== undefined ? { tag_id: tagId } : {}) },
        });
        const payload = response.data;
        const events: PolymarketEventResponse[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.events)
          ? payload.events
          : [];
        
        return events.map(transformPolymarketEvent);
      } catch (error) {
        console.error('Error fetching Polymarket events:', error);
        throw error;
      }
    });
  }

  /**
   * Search markets by query
   */
  async searchMarkets(query: string, limit: number = 20): Promise<UnifiedMarket[]> {
    const cacheKey = `search:${query}:${limit}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        const response = await this.client.get('/search', {
          params: { query, limit },
        });
        const markets: PolymarketMarketResponse[] = response.data;
        
        return markets.map(transformPolymarketMarket);
      } catch (error) {
        console.error('Error searching Polymarket markets:', error);
        return [];
      }
    });
  }

  /**
   * Get markets by tag/category
   */
  async getMarketsByTag(tag: string, limit: number = 50): Promise<UnifiedMarket[]> {
    return this.getMarkets({ tag, limit, closed: false });
  }

  async getCategories(): Promise<string[]> {
    return this.getTags();
  }

  /**
   * Get all available tags/categories
   */
  async getTags(): Promise<string[]> {
    const cacheKey = 'tags';
    
    return this.getCached(cacheKey, async () => {
      try {
        const response = await this.client.get('/tags');
        const payload = response.data || [];
        // Normalize to include id/name
        return (Array.isArray(payload) ? payload : []).map((t: any) => ({
          id: t?.id ?? t?.tag_id ?? t?.slug ?? t?.label,
          name: t?.label || t?.name || t?.slug || String(t?.id ?? ''),
        }));
      } catch (error) {
        console.error('Error fetching Polymarket tags:', error);
        return [];
      }
    });
  }

  /**
   * Get market price data
   */
  async getMarketPrices(conditionId: string): Promise<{
    yesPrice: number;
    noPrice: number;
  } | null> {
    try {
      const market = await this.getMarketById(conditionId);
      if (!market) return null;
      
      return {
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
      };
    } catch (error) {
      console.error(`Error fetching prices for ${conditionId}:`, error);
      return null;
    }
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
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

  /** Sports metadata: GET /sports */
  async getSportsMeta(): Promise<Array<{ sport: string; image?: string; resolution?: string; ordering?: string; tags?: string; series?: string }>> {
    return this.getCached('sports-meta', async () => {
      const { data } = await this.client.get('/sports');
      return Array.isArray(data) ? data : [];
    });
  }

  /** Sports teams: GET /teams with optional filters */
  async getTeams(params?: { league?: string | string[]; name?: string | string[]; abbreviation?: string | string[]; limit?: number; offset?: number }): Promise<any[]> {
    const key = `teams:${JSON.stringify(params || {})}`;
    return this.getCached(key, async () => {
      const { data } = await this.client.get('/teams', { params });
      return Array.isArray(data) ? data : [];
    });
  }
}

// Export singleton instance
export const polymarketClient = new PolymarketClient();

