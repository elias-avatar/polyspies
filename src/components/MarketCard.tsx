import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { UnifiedMarket } from "@/lib/unified/types";
import { TopHolders } from "./TopHolders";
import { formatPrice, formatCurrency } from "@/lib/unified/transformer";

interface MarketCardProps {
  market: UnifiedMarket;
}

export function MarketCard({ market }: MarketCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg line-clamp-2">{market.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">YES</p>
              <p className="text-2xl font-bold text-green-600">
                {formatPrice(market.yesPrice)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">NO</p>
              <p className="text-2xl font-bold text-red-600">
                {formatPrice(market.noPrice)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {market.volume24h && (
              <div>
                <p className="text-muted-foreground">24h Volume</p>
                <p className="font-medium">{formatCurrency(market.volume24h)}</p>
              </div>
            )}
            {market.liquidity && (
              <div>
                <p className="text-muted-foreground">Liquidity</p>
                <p className="font-medium">{formatCurrency(market.liquidity)}</p>
              </div>
            )}
            {/* Best Bid/Ask removed per request */}
          </div>

          {/* Top Holders */}
          {market.externalId && (
            <TopHolders conditionId={market.externalId} />
          )}

          {/* View button */}
          <a
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md py-2 text-sm font-medium transition-colors"
          >
            Trade on Polymarket
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

