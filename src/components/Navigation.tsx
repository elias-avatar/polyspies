"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import Image from "next/image";

export function Navigation() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="border-b bg-background">
      <div className="px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Home">
              <Image src="/polyspies.png" alt="Polyspies" width={28} height={28} className="rounded" />
              <span className="text-2xl font-bold">Polyspies</span>
            </Link>
          </div>
          {/* Desktop menu */}
          <div className="hidden md:flex gap-4 items-center flex-1 justify-end">
            <Link href="/breaking"><Button variant="ghost">Breaking</Button></Link>
            <Link href="/leaderboard"><Button variant="ghost">Leaderboard</Button></Link>
            <Link href="/trades"><Button variant="ghost">Trades</Button></Link>
            <Link href="/competitions"><Button variant="ghost">Competitions</Button></Link>
            <Link href="/insider-finder">
              <Button variant="ghost">
                Insider Finder
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 align-middle">
                  Coming Soon
                </span>
              </Button>
            </Link>
            <a href="https://apps.apple.com/us/app/polymarket/id6648798962" target="_blank" rel="noopener noreferrer" aria-label="Download on the App Store" className="inline-block">
              <Image src="/app-store.svg" alt="App Store" width={20} height={20} />
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.polymarket.android&hl=en_US" target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play" className="inline-block">
              <Image src="/google-play.svg" alt="Google Play" width={20} height={20} />
            </a>
          </div>
          {/* Mobile menu trigger */}
          <button aria-label="Open menu" className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded border" onClick={() => setOpen(v=>!v)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {/* Mobile dropdown */}
      {/* Mobile overlay menu (doesn't push content) */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-64 bg-background border-l shadow-xl transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="p-4 flex flex-col gap-2">
                <Link href="/breaking" onClick={()=>setOpen(false)} className="py-2">Breaking</Link>
                <Link href="/leaderboard" onClick={()=>setOpen(false)} className="py-2">Leaderboard</Link>
                <Link href="/trades" onClick={()=>setOpen(false)} className="py-2">Trades</Link>
                <Link href="/competitions" onClick={()=>setOpen(false)} className="py-2">Competitions</Link>
                <Link href="/insider-finder" onClick={()=>setOpen(false)} className="py-2 flex items-center gap-2">Insider Finder <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">Coming Soon</span></Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

