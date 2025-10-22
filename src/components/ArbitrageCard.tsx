import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArbitrageOpportunity } from "@/lib/unified/types";
import { formatPrice, formatPercentage, formatCurrency } from "@/lib/unified/transformer";
import { ArrowRight, TrendingUp } from "lucide-react";

interface ArbitrageCardProps {
  opportunity: ArbitrageOpportunity;
}

export function ArbitrageCard({ opportunity }: ArbitrageCardProps) {
  const timeSince = Math.floor(
    (Date.now() - new Date(opportunity.detectedAt).getTime()) / 1000 / 60
  );

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg line-clamp-2">
            {opportunity.marketTitle}
          </CardTitle>
          <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {formatPercentage(opportunity.percentageGap)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Price Comparison */}
          <div className="flex items-center justify-between">
            <div className="text-center">
              <Badge variant="outline" className="mb-2 bg-blue-50">
                Polymarket
              </Badge>
              <p className="text-2xl font-bold">
                {formatPrice(opportunity.polymarket.price)}
              </p>
            </div>

            <ArrowRight className="h-6 w-6 text-muted-foreground" />

            <div className="text-center">
              <Badge variant="outline" className="mb-2 bg-purple-50">
                Kalshi
              </Badge>
              <p className="text-2xl font-bold">
                {formatPrice(opportunity.kalshi.price)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Price Difference</p>
              <p className="font-medium">{formatPrice(opportunity.priceDifference)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Potential Profit</p>
              <p className="font-medium text-green-600">
                {formatCurrency(opportunity.potentialProfit)}
              </p>
            </div>
          </div>

          {/* Time */}
          <p className="text-xs text-muted-foreground">
            Detected {timeSince < 60 ? `${timeSince}m ago` : `${Math.floor(timeSince / 60)}h ago`}
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={opportunity.polymarket.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center bg-blue-500 text-white hover:bg-blue-600 rounded-md py-2 text-sm font-medium transition-colors"
            >
              Polymarket
            </a>
            <a
              href={opportunity.kalshi.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center bg-purple-500 text-white hover:bg-purple-600 rounded-md py-2 text-sm font-medium transition-colors"
            >
              Kalshi
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

