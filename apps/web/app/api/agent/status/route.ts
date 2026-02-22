import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getServerSupabase();

  // Get latest balance
  const { data: balance } = await supabase
    .from("balances")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get trade count and stats
  const { data: trades } = await supabase
    .from("trades")
    .select("status")
    .order("created_at", { ascending: false });

  const tradeCount = trades?.length ?? 0;
  const completed = trades?.filter((t) => t.status === "completed").length ?? 0;
  const total = trades?.filter((t) => t.status !== "pending").length ?? 0;
  const winRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Check if agent is active (last log within 5 minutes)
  const { data: lastLog } = await supabase
    .from("agent_logs")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const lastCycleAt = lastLog?.created_at ?? null;
  const running = lastCycleAt
    ? Date.now() - new Date(lastCycleAt).getTime() < 5 * 60 * 1000
    : false;

  return NextResponse.json({
    running,
    last_cycle_at: lastCycleAt,
    balance,
    trade_count: tradeCount,
    win_rate: winRate,
  });
}
