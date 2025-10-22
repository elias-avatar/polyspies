import axios, { AxiosInstance } from 'axios';
import { UnifiedMarket } from '@/lib/unified/types';

type AdjMarket = {
  market_id: string;
  platform: string; // "kalshi" | "polymarket" | ...
  question: string;
  description?: string;
  rules?: string;
  link?: string;
  status?: string;
  end_date?: string;
  probability?: number; // assumed 0-100
  volume?: number;
  open_interest?: number;
  liquidity?: number;
  category?: string;
  tags?: string[];
  updated_at?: string;
};

export class AdjClient {
  private client: AxiosInstance;
  private cache = new Map<string, { data: any; ts: number }>();
  private ttlMs = 60 * 1000; // 1 min cache

  constructor(
    baseURL: string = process.env.ADJ_API_URL || 'https://api.data.adj.news/api',
    token?: string
  ) {
    this.client = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(token || process.env.ADJ_API_TOKEN
          ? { Authorization: `Bearer ${token || process.env.ADJ_API_TOKEN}` }
          : {}),
      },
    });
  }

  private async cached<T>(key: string, getter: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.ts < this.ttlMs) return hit.data as T;
    const data = await getter();
    this.cache.set(key, { data, ts: Date.now() });
    return data;
  }

  async listMarkets(params: {
    platform?: 'polymarket' | 'kalshi' | 'all';
    keyword?: string;
    limit?: number;
    offset?: number;
    status?: 'active' | 'resolved' | 'closed' | 'suspended' | 'cancelled';
  }): Promise<UnifiedMarket[]> {
    const query: Record<string, any> = {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      status: params.status ?? 'active',
      sort_by: 'updated_at',
      sort_dir: 'desc',
    };
    if (params.keyword) query.keyword = params.keyword;
    if (params.platform && params.platform !== 'all') query.platform = params.platform;

    const key = `adj:markets:${JSON.stringify(query)}`;
    const payload = await this.cached(key, async () => {
      const res = await this.client.get('/markets', { params: query });
      return res.data;
    });

    const items: AdjMarket[] = Array.isArray(payload?.data) ? payload.data : [];
    return items.map(this.toUnified);
  }

  private toUnified = (m: AdjMarket): UnifiedMarket => {
    const probability = typeof m.probability === 'number' ? Math.max(0, Math.min(100, m.probability)) : 50;
    const yesPrice = probability; // already 0-100 scale per docs
    const noPrice = 100 - probability;
    return {
      id: m.market_id,
      platform: (m.platform as any) === 'kalshi' ? 'kalshi' : 'polymarket',
      externalId: m.market_id,
      title: m.question,
      description: m.description || m.rules,
      category: m.category,
      yesPrice,
      noPrice,
      volume24h: typeof m.volume === 'number' ? m.volume : undefined,
      liquidity: typeof m.liquidity === 'number' ? m.liquidity : undefined,
      endDate: m.end_date ? new Date(m.end_date) : undefined,
      url: m.link || undefined,
      lastUpdated: m.updated_at ? new Date(m.updated_at) : new Date(),
      tags: m.tags,
      metadata: {
        status: m.status,
        open_interest: m.open_interest,
      },
    };
  };
}

export const adjClient = new AdjClient();


