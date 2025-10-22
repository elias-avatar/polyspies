"use client";

import { useEffect, useState } from "react";
import { ArbitrageCard } from "@/components/ArbitrageCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArbitrageOpportunity } from "@/lib/unified/types";
import { formatPercentage, formatCurrency } from "@/lib/unified/transformer";
import { RefreshCw, TrendingUp, DollarSign, Target } from "lucide-react";

interface ArbitrageStats {
  totalOpportunities: number;
  largestGap: number;
  averageGap: number;
  totalPotentialProfit: number;
}

export default function ArbitragePage() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [stats, setStats] = useState<ArbitrageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [minGap, setMinGap] = useState(0);

  useEffect(() => {
    fetchOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minGap]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/arbitrage?minGap=${minGap}&sortBy=gap&limit=50`);
      const data = await response.json();
      if (data.success) {
        setOpportunities(data.data);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerScan = async () => {
    setScanning(true);
    try {
      const response = await fetch("/api/arbitrage/scan", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        await fetchOpportunities();
      }
    } catch (error) {
      console.error("Error scanning for arbitrage:", error);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Arbitrage Opportunities</h1>
            <p className="text-xl text-muted-foreground">
              Find profitable price differences between Polymarket and Kalshi
            </p>
          </div>
          <Button
            onClick={triggerScan}
            disabled={scanning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning..." : "Scan Now"}
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Target className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Opportunities</p>
                    <p className="text-2xl font-bold">{stats.totalOpportunities}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Largest Gap</p>
                    <p className="text-2xl font-bold">
                      {formatPercentage(stats.largestGap)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Target className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Average Gap</p>
                    <p className="text-2xl font-bold">
                      {formatPercentage(stats.averageGap)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Profit ($100 each)</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(stats.totalPotentialProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={minGap === 0 ? "default" : "outline"}
            onClick={() => setMinGap(0)}
          >
            All
          </Button>
          <Button
            variant={minGap === 2 ? "default" : "outline"}
            onClick={() => setMinGap(2)}
          >
            &gt; 2%
          </Button>
          <Button
            variant={minGap === 5 ? "default" : "outline"}
            onClick={() => setMinGap(5)}
          >
            &gt; 5%
          </Button>
          <Button
            variant={minGap === 10 ? "default" : "outline"}
            onClick={() => setMinGap(10)}
          >
            &gt; 10%
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        )}

        {/* Opportunities Grid */}
        {!loading && opportunities.length > 0 && (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {opportunities.length} opportunities
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opportunity) => (
                <ArbitrageCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && opportunities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-2">
              No arbitrage opportunities found
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Try scanning for new opportunities or lowering the minimum gap filter
            </p>
            <Button onClick={triggerScan} className="flex items-center gap-2 mx-auto">
              <RefreshCw className="h-4 w-4" />
              Scan for Opportunities
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

