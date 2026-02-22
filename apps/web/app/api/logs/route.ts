import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after"); // ISO timestamp for polling new entries

  const supabase = getServerSupabase();
  let query = supabase
    .from("agent_logs")
    .select("*")
    .order("created_at", { ascending: true });

  if (after) {
    query = query.gt("created_at", after);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
