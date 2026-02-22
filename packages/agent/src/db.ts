import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const db = createClient(supabaseUrl, supabaseKey);

export type LogType =
  | "prompt"
  | "response"
  | "trade"
  | "error"
  | "balance_update"
  | "analysis"
  | "scanning"
  | "system";

export async function log(
  type: LogType,
  content: string,
  extra?: { raw_data?: unknown; job_id?: string; thread_id?: string }
) {
  const { error } = await db.from("agent_logs").insert({
    type,
    content,
    raw_data: extra?.raw_data ?? null,
    job_id: extra?.job_id ?? null,
    thread_id: extra?.thread_id ?? null,
  });
  if (error) console.error("[db] Failed to log:", error.message);
}

export async function insertTrade(trade: {
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out?: string;
  status: "pending" | "completed" | "failed";
  job_id?: string;
  tx_hash?: string;
  raw_response?: unknown;
}) {
  const { data, error } = await db
    .from("trades")
    .insert({
      token_in: trade.token_in,
      token_out: trade.token_out,
      amount_in: trade.amount_in,
      amount_out: trade.amount_out ?? null,
      status: trade.status,
      job_id: trade.job_id ?? null,
      tx_hash: trade.tx_hash ?? null,
      raw_response: trade.raw_response ?? null,
    })
    .select()
    .single();

  if (error) console.error("[db] Failed to insert trade:", error.message);
  return data;
}

export async function updateTrade(
  id: string,
  updates: { status?: string; amount_out?: string; tx_hash?: string; raw_response?: unknown }
) {
  const { error } = await db.from("trades").update(updates).eq("id", id);
  if (error) console.error("[db] Failed to update trade:", error.message);
}

export async function insertBalance(total_usd: number, breakdown: Record<string, number>) {
  const { error } = await db.from("balances").insert({ total_usd, breakdown });
  if (error) console.error("[db] Failed to insert balance:", error.message);
}
