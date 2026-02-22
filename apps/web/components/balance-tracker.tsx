"use client";

import { useEffect, useState } from "react";
import type { Balance } from "@/lib/types";

const POLL_INTERVAL = 5000;

export function BalanceTracker() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/balances");
        const data = await res.json();
        if (data && data.id) {
          setBalance((prev) => {
            if (prev?.id !== data.id) {
              setFlash(true);
              setTimeout(() => setFlash(false), 1500);
            }
            return data;
          });
        }
      } catch {}
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const breakdown = balance?.breakdown ?? {};
  const tokens = Object.entries(breakdown).sort(([, a], [, b]) => b - a);

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 py-2.5 border-b border-border">
        <h2 className="text-xs font-bold tracking-widest uppercase text-muted">
          Portfolio
        </h2>
      </div>
      <div className="px-4">
        <div
          className={`text-3xl font-bold tabular-nums ${
            flash ? "animate-balance-flash" : "text-foreground"
          }`}
        >
          ${balance?.total_usd?.toFixed(2) ?? "\u2014"}
        </div>
      </div>
      {tokens.length > 0 && (
        <div className="px-4 space-y-2">
          <div className="h-px bg-border" />
          {tokens.map(([token, value]) => (
            <div
              key={token}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted">{token}</span>
              <span className="tabular-nums">${value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
