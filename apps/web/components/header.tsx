"use client";

import { useEffect, useState } from "react";

const WALLET_ADDRESS = "0x04026dc6f2a1000fcb0d673bff24656233240249";

export function Header({ startedAt }: { startedAt: Date }) {
  const [uptime, setUptime] = useState("00:00");
  const [copied, setCopied] = useState(false);

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

  const copyAddress = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
        <button
          onClick={copyAddress}
          className="flex items-center gap-1.5 text-xs text-muted font-mono px-2 py-0.5 rounded bg-card border border-border hover:border-accent/40 hover:text-foreground transition-colors cursor-pointer"
          title="Copy wallet address"
        >
          <span>{WALLET_ADDRESS.slice(0, 6)}...{WALLET_ADDRESS.slice(-4)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={copied ? "text-accent" : ""}>
            {copied ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted font-mono tabular-nums">{uptime}</span>
      </div>
    </header>
  );
}
