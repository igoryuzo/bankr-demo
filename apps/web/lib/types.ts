export type LogType =
  | "prompt"
  | "response"
  | "trade"
  | "error"
  | "balance_update"
  | "analysis"
  | "scanning"
  | "system";

export interface AgentLog {
  id: string;
  created_at: string;
  type: LogType;
  content: string;
  raw_data: Record<string, unknown> | null;
  job_id: string | null;
  thread_id: string | null;
}

export interface Trade {
  id: string;
  created_at: string;
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out: string | null;
  status: "pending" | "completed" | "failed";
  job_id: string | null;
  tx_hash: string | null;
  raw_response: Record<string, unknown> | null;
}

export interface Balance {
  id: string;
  created_at: string;
  total_usd: number;
  breakdown: Record<string, number> | null;
}

export interface AgentStatus {
  running: boolean;
  uptime_ms: number;
  last_cycle_at: string | null;
  balance: Balance | null;
  trade_count: number;
  win_rate: number;
}
