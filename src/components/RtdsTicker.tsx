"use client";

import React from "react";

type CryptoKey = "BTC" | "ETH" | "SOL";

type RtdsMsg = {
  topic?: string;
  type?: string;
  timestamp?: number;
  payload?: { symbol?: string; timestamp?: number; value?: number };
};

const WS_FALLBACKS = (
  process.env.NEXT_PUBLIC_RTDS_WS
    ? [process.env.NEXT_PUBLIC_RTDS_WS]
    : [
        "wss://rtds.polymarket.com/stream",
        "wss://rtds.polymarket.com/ws",
        "wss://rtds.polymarket.com/",
      ]
);

export function RtdsTicker() {
  const [prices, setPrices] = React.useState<Record<CryptoKey, number | undefined>>({ BTC: undefined, ETH: undefined, SOL: undefined });
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectRef = React.useRef<number>(0);

  React.useEffect(() => {
    let stopped = false;

    function connect() {
      if (stopped) return;
      try {
        const idx = reconnectRef.current % WS_FALLBACKS.length;
        const url = WS_FALLBACKS[idx];
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
          reconnectRef.current = 0;
          const sub = {
            action: "subscribe",
            subscriptions: [
              // Binance source (concatenated lowercase pairs)
              { topic: "crypto_prices", type: "update", filters: "btcusdt,ethusdt,solusdt" },
              // Chainlink source (slash-separated pairs) - subscribe individually
              { topic: "crypto_prices_chainlink", type: "*", filters: "{\"symbol\":\"btc/usd\"}" },
              { topic: "crypto_prices_chainlink", type: "*", filters: "{\"symbol\":\"eth/usd\"}" },
              { topic: "crypto_prices_chainlink", type: "*", filters: "{\"symbol\":\"sol/usd\"}" },
            ],
          } as const;
          ws.send(JSON.stringify(sub));
        };
        ws.onmessage = (ev) => {
          try {
            const msg: RtdsMsg = JSON.parse(ev.data);
            const val = typeof msg?.payload?.value === "number" ? msg.payload.value : undefined;
            if (!val) return;
            const sym = (msg?.payload?.symbol || "").toLowerCase();
            if (msg?.topic === "crypto_prices") {
              if (sym === "btcusdt") setPrices((p) => ({ ...p, BTC: val }));
              else if (sym === "ethusdt") setPrices((p) => ({ ...p, ETH: val }));
              else if (sym === "solusdt") setPrices((p) => ({ ...p, SOL: val }));
            } else if (msg?.topic === "crypto_prices_chainlink") {
              if (sym === "btc/usd") setPrices((p) => ({ ...p, BTC: val }));
              else if (sym === "eth/usd") setPrices((p) => ({ ...p, ETH: val }));
              else if (sym === "sol/usd") setPrices((p) => ({ ...p, SOL: val }));
            }
          } catch {}
        };
        ws.onclose = () => {
          if (stopped) return;
          const delay = Math.min(1000 * Math.pow(2, reconnectRef.current++), 15000);
          setTimeout(connect, delay);
        };
        ws.onerror = () => {
          try { ws.close(); } catch {}
        };
      } catch {
        const delay = Math.min(1000 * Math.pow(2, reconnectRef.current++), 15000);
        setTimeout(connect, delay);
      }
    }

    connect();
    return () => {
      stopped = true;
      try { wsRef.current?.close(); } catch {}
    };
  }, []);

  const fmt = (n?: number) => {
    if (typeof n !== "number" || Number.isNaN(n)) return "-";
    try {
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
    } catch {
      return String(n);
    }
  };

  return (
    <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
      <div className="inline-flex items-center gap-1">
        <span className="font-semibold text-foreground">BTC</span>
        <span>${fmt(prices.BTC)}</span>
      </div>
      <div className="inline-flex items-center gap-1">
        <span className="font-semibold text-foreground">ETH</span>
        <span>${fmt(prices.ETH)}</span>
      </div>
      <div className="inline-flex items-center gap-1">
        <span className="font-semibold text-foreground">SOL</span>
        <span>${fmt(prices.SOL)}</span>
      </div>
    </div>
  );
}


