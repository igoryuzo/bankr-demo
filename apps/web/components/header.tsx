"use client";

import { useEffect, useState } from "react";

export function Header({ startedAt }: { startedAt: Date }) {
  const [uptime, setUptime] = useState("00:00");

  useEffect(() => {
    const tick = () => {
      const diff = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setUptime(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
          <span className="text-sm font-bold tracking-wider uppercase text-foreground">
            Bankr Agent
          </span>
        </div>
        <span className="text-xs text-muted px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
          Live
        </span>
        <span className="text-xs text-muted px-2 py-0.5 rounded bg-card border border-border">
          Base Network
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted font-mono tabular-nums">{uptime}</span>
      </div>
    </header>
  );
}
