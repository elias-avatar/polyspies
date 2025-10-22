import { polymarketClient } from '../polymarket/client';
import { kalshiClient } from '../kalshi/client';
import { matchMarkets, calculateArbitrage } from '../unified/transformer';
import { ArbitrageOpportunity, UnifiedMarket } from '../unified/types';
import { prisma } from '../db';

export class ArbitrageScanner {
  private minGapThreshold: number = 0.5; // Dev: consider smaller gaps to surface candidates

  /**
   * Find arbitrage opportunities between Polymarket and Kalshi
   */
  async findOpportunities(): Promise<ArbitrageOpportunity[]> {
    try {
      console.log('Scanning for arbitrage opportunities...');

      // 1. Fetch active markets from both platforms
      const [polymarkets, kalshiMarkets] = await Promise.all([
        polymarketClient.getMarkets({ closed: false, limit: 200 }),
        kalshiClient.getMarkets({ status: 'open', limit: 200 }),
      ]);

      console.log(`Found ${polymarkets.length} Polymarket markets and ${kalshiMarkets.length} Kalshi markets`);

      // 2. Match markets by title similarity
      const matches = matchMarkets(polymarkets, kalshiMarkets);
      console.log(`Matched ${matches.length} market pairs`);

      // 3. Calculate arbitrage for each match
      const opportunities: ArbitrageOpportunity[] = [];

      for (const match of matches) {
        const { polymarket, kalshi } = match;

        // Evaluate both YES and NO sides and choose the best gap
        const arbYes = calculateArbitrage(polymarket.yesPrice, kalshi.yesPrice, 100);
        const arbNo = calculateArbitrage(polymarket.noPrice, kalshi.noPrice, 100);
        const best = arbYes.priceDifference >= arbNo.priceDifference ? { side: 'yes', ...arbYes } : { side: 'no', ...arbNo };

        if (best.priceDifference >= this.minGapThreshold && best.direction) {
          const polyPrice = best.side === 'yes' ? polymarket.yesPrice : polymarket.noPrice;
          const kalPrice = best.side === 'yes' ? kalshi.yesPrice : kalshi.noPrice;

          opportunities.push({
            id: `${polymarket.id}-${kalshi.id}-${best.side}`,
            marketTitle: `${polymarket.title} (${best.side.toUpperCase()})`,
            polymarket: {
              id: polymarket.id,
              price: polyPrice,
              url: polymarket.url,
            },
            kalshi: {
              id: kalshi.id,
              price: kalPrice,
              url: kalshi.url,
            },
            priceDifference: best.priceDifference,
            percentageGap: best.percentageGap,
            potentialProfit: best.potentialProfit,
            detectedAt: new Date(),
            status: 'active',
          });
        }
      }

      console.log(`Found ${opportunities.length} arbitrage opportunities`);

      // 4. Save opportunities to database
      await this.saveOpportunities(opportunities);

      return opportunities;
    } catch (error) {
      console.error('Error scanning for arbitrage opportunities:', error);
      throw error;
    }
  }

  /**
   * Save opportunities to database
   */
  private async saveOpportunities(opportunities: ArbitrageOpportunity[]): Promise<void> {
    try {
      // Mark all existing opportunities as expired
      await prisma.arbitrageOpportunity.updateMany({
        where: { status: 'active' },
        data: { status: 'expired' },
      });

      // Insert new opportunities
      for (const opp of opportunities) {
        await prisma.arbitrageOpportunity.upsert({
          where: {
            id: opp.id,
          },
          create: {
            id: opp.id,
            marketTitle: opp.marketTitle,
            polymarketId: opp.polymarket.id,
            polymarketPrice: opp.polymarket.price,
            polymarketUrl: opp.polymarket.url,
            kalshiId: opp.kalshi.id,
            kalshiPrice: opp.kalshi.price,
            kalshiUrl: opp.kalshi.url,
            priceDifference: opp.priceDifference,
            percentageGap: opp.percentageGap,
            potentialProfit: opp.potentialProfit,
            status: 'active',
            detectedAt: new Date(),
          },
          update: {
            polymarketPrice: opp.polymarket.price,
            kalshiPrice: opp.kalshi.price,
            priceDifference: opp.priceDifference,
            percentageGap: opp.percentageGap,
            potentialProfit: opp.potentialProfit,
            status: 'active',
            detectedAt: new Date(),
          },
        });
      }

      console.log(`Saved ${opportunities.length} opportunities to database`);
    } catch (error) {
      console.error('Error saving arbitrage opportunities:', error);
      throw error;
    }
  }

  /**
   * Get active opportunities from database
   */
  async getActiveOpportunities(filters?: {
    minGap?: number;
    sortBy?: 'gap' | 'profit' | 'detected';
    limit?: number;
  }): Promise<ArbitrageOpportunity[]> {
    try {
      const whereClause: any = { status: 'active' };

      if (filters?.minGap) {
        whereClause.percentageGap = { gte: filters.minGap };
      }

      const orderBy: any = {};
      switch (filters?.sortBy) {
        case 'gap':
          orderBy.percentageGap = 'desc';
          break;
        case 'profit':
          orderBy.potentialProfit = 'desc';
          break;
        case 'detected':
        default:
          orderBy.detectedAt = 'desc';
          break;
      }

      const opportunities = await prisma.arbitrageOpportunity.findMany({
        where: whereClause,
        orderBy,
        take: filters?.limit ?? 50,
      });

      return opportunities.map((opp: any) => ({
        id: opp.id,
        marketTitle: opp.marketTitle,
        polymarket: {
          id: opp.polymarketId || '',
          price: opp.polymarketPrice,
          url: opp.polymarketUrl || '',
        },
        kalshi: {
          id: opp.kalshiId || '',
          price: opp.kalshiPrice,
          url: opp.kalshiUrl || '',
        },
        priceDifference: opp.priceDifference,
        percentageGap: opp.percentageGap,
        potentialProfit: opp.potentialProfit,
        detectedAt: opp.detectedAt,
        status: opp.status as 'active' | 'expired',
      }));
    } catch (error) {
      console.error('Error fetching active opportunities:', error);
      return [];
    }
  }

  /**
   * Get opportunity statistics
   */
  async getStats(): Promise<{
    totalOpportunities: number;
    largestGap: number;
    averageGap: number;
    totalPotentialProfit: number;
  }> {
    try {
      const opportunities = await prisma.arbitrageOpportunity.findMany({
        where: { status: 'active' },
      });

      if (opportunities.length === 0) {
        return {
          totalOpportunities: 0,
          largestGap: 0,
          averageGap: 0,
          totalPotentialProfit: 0,
        };
      }

      const largestGap = Math.max(...opportunities.map((o: any) => o.percentageGap));
      const averageGap = opportunities.reduce((sum: number, o: any) => sum + o.percentageGap, 0) / opportunities.length;
      const totalPotentialProfit = opportunities.reduce((sum: number, o: any) => sum + o.potentialProfit, 0);

      return {
        totalOpportunities: opportunities.length,
        largestGap,
        averageGap,
        totalPotentialProfit,
      };
    } catch (error) {
      console.error('Error getting arbitrage stats:', error);
      return {
        totalOpportunities: 0,
        largestGap: 0,
        averageGap: 0,
        totalPotentialProfit: 0,
      };
    }
  }

  /**
   * Calculate estimated profit for a given investment
   */
  calculateProfit(opportunity: ArbitrageOpportunity, investment: number): number {
    // Simplified calculation: profit proportional to investment
    return (opportunity.potentialProfit / 100) * investment;
  }

  /**
   * Set minimum gap threshold
   */
  setMinGapThreshold(threshold: number): void {
    this.minGapThreshold = threshold;
  }
}

// Export singleton instance
export const arbitrageScanner = new ArbitrageScanner();

