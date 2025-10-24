import Link from "next/link";
import { Button } from "./ui/button";

export function Navigation() {
  return (
    <nav className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            PolyGuild
          </Link>
          
          <div className="flex gap-4">
            <Link href="/breaking">
              <Button variant="ghost">Breaking</Button>
            </Link>
            <Link href="/insider-finder">
              <Button variant="ghost">Insider Finder</Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="ghost">Leaderboard</Button>
            </Link>
            {/* Kalshi/Arbitrage removed per request */}
          </div>
        </div>
      </div>
    </nav>
  );
}

