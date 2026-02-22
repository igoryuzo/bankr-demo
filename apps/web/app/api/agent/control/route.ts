import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { action } = await request.json();

  if (!["start", "stop"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Log the control action
  await supabase.from("agent_logs").insert({
    type: "system",
    content: `Agent ${action} requested via dashboard`,
  });

  // In production, this would signal the Railway worker via
  // an external mechanism (e.g., a shared flag in Supabase,
  // or a Railway API call). For now, we just log it.
  return NextResponse.json({
    success: true,
    action,
    message: `Agent ${action} signal sent`,
  });
}
