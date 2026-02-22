"use client";

import { useEffect, useState } from "react";

export function AgentStatus() {
  const [status, setStatus] = useState<{
    running: boolean;
    trade_count: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agent/status");
        if (res.ok) {
          setStatus(await res.json());
        }
      } catch {
        // Agent status endpoint may not be available
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          status.running ? "bg-accent animate-pulse-dot" : "bg-error"
        }`}
      />
      <span>{status.running ? "Agent Running" : "Agent Stopped"}</span>
    </div>
  );
}
