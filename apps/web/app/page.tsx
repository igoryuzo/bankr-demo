"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { LiveFeed } from "@/components/live-feed";
import { BalanceTracker } from "@/components/balance-tracker";
import { RecentTrades } from "@/components/trade-card";

export default function Dashboard() {
  const [startedAt] = useState(() => new Date());

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-background">
      <Header startedAt={startedAt} />

      <div className="flex flex-1 min-h-0">
        {/* Left panel — Live Feed */}
        <div className="flex-1 border-r border-border flex flex-col min-w-0">
          <LiveFeed />
        </div>

        {/* Right panel — Portfolio + Trades */}
        <div className="w-[320px] shrink-0 flex flex-col overflow-y-auto">
          <div className="py-4">
            <BalanceTracker />
          </div>
          <div className="py-4 border-t border-border">
            <RecentTrades />
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-center px-5 py-2 border-t border-border text-xs text-muted/40">
        Powered by Bankr · bankr.bot
      </footer>
    </div>
  );
}
