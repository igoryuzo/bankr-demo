"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentLog } from "@/lib/types";

const POLL_INTERVAL = 2000;

const typeColor: Record<string, string> = {
  trade: "text-accent",
  response: "text-foreground",
  analysis: "text-info",
  scanning: "text-muted",
  prompt: "text-muted",
  error: "text-error",
  balance_update: "text-warning",
  system: "text-muted/60",
};

const typeIcon: Record<string, string> = {
  trade: "\u2192",
  response: "\u25C6",
  analysis: "\u25C8",
  scanning: "\u25CB",
  prompt: "\u25B8",
  error: "\u2717",
  balance_update: "$",
  system: "\u00B7",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function LiveFeed() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const lastTimestamp = useRef<string | null>(null);

  // Initial load
  useEffect(() => {
    fetch("/api/logs")
      .then((r) => r.json())
      .then((data: AgentLog[]) => {
        if (Array.isArray(data)) {
          setLogs(data);
          if (data.length > 0) {
            lastTimestamp.current = data[data.length - 1].created_at;
          }
        }
      })
      .catch(() => {});
  }, []);

  // Poll for new logs
  useEffect(() => {
    const id = setInterval(async () => {
      const url = lastTimestamp.current
        ? `/api/logs?after=${encodeURIComponent(lastTimestamp.current)}`
        : "/api/logs";
      try {
        const res = await fetch(url);
        const data: AgentLog[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLogs((prev) => [...prev, ...data].slice(-200));
          lastTimestamp.current = data[data.length - 1].created_at;
        }
      } catch {}
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll
  useEffect(() => {
    const el = feedRef.current;
    if (el && isNearBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  function handleScroll() {
    const el = feedRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-border">
        <h2 className="text-xs font-bold tracking-widest uppercase text-muted">
          Live Agent Feed
        </h2>
      </div>
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            Waiting for agent activity...
          </div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className="animate-fade-in flex gap-2 text-[13px] leading-relaxed"
          >
            <span className="text-muted/50 shrink-0 tabular-nums">
              [{formatTime(log.created_at)}]
            </span>
            <span className={`shrink-0 w-3 text-center ${typeColor[log.type] || "text-muted"}`}>
              {typeIcon[log.type] || "\u00B7"}
            </span>
            <span className={typeColor[log.type] || "text-foreground"}>
              {log.content}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1 text-muted/40 text-[13px]">
          <span className="animate-blink">{"\u2588"}</span>
        </div>
      </div>
    </div>
  );
}
