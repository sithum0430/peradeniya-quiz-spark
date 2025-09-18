// src/services/gameService.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Start a quiz session.
 * Inserts required fields so types/constraints are satisfied.
 */
export async function startSession(username: string) {
  const startISO = new Date().toISOString();

  const { data, error } = await supabase
    .from("quiz_sessions")
    .insert([{ username, start_time: startISO, total_score: 0, duration_seconds: 0 }])
    .select("id, start_time")
    .single();

  console.log("quiz_sessions start", { error, data }); // debug

  if (error) {
    console.error("quiz_sessions start error", error);
    return { ok: false as const, sessionId: undefined, startedAtISO: undefined };
  }
  return {
    ok: true as const,
    sessionId: data?.id as number | undefined,
    startedAtISO: data?.start_time as string | undefined,
  };
}

/**
 * End the session: update totals, upsert leaderboard, then fetch Top 10.
 * Includes .select() after writes so failures aren’t silent during debugging.
 */
export async function endSessionAndUpdateLeaderboard(params: {
  sessionId: number;
  startedAtISO: string;
  finalScore: number;
  player: { username: string; name: string; phone: string };
}) {
  const startedMs = new Date(params.startedAtISO).getTime();
  const durationSeconds = Math.max(0, Math.round((Date.now() - startedMs) / 1000));

  // 1) Update quiz_sessions and return the updated row (for verification)
  const { data: updData, error: sessionErr } = await supabase
    .from("quiz_sessions")
    .update({ total_score: params.finalScore, duration_seconds: durationSeconds })
    .eq("id", params.sessionId)
    .select("id, total_score, duration_seconds"); // return updated row [web:83][web:221]

  console.log("quiz_sessions update", { sessionErr, updData }); // debug

  // 2) UPSERT leaderboard (always write), and return the row (for verification)
  // Requires UNIQUE or PK on leaderboard.username and will return the upserted row with .select()
  const { data: lbData, error: lbErr } = await supabase
    .from("leaderboard")
    .upsert(
      {
        username: params.player.username,
        name: params.player.name,
        phone: params.player.phone,
        score: params.finalScore,
        achieved_at: new Date().toISOString(),
      },
      { onConflict: "username" }
    )
    .select("username, score, achieved_at"); // return upserted row [web:95][web:221]

  console.log("leaderboard upsert", { lbErr, lbData }); // debug

  // 3) Read Top 10 for UI
  const { data: top10, error: topErr } = await supabase
    .from("leaderboard")
    .select("username, name, score, achieved_at")
    .order("score", { ascending: false })
    .order("achieved_at", { ascending: true })
    .limit(10);

  console.log("leaderboard top10", { topErr, top10 }); // debug

  const madeLeaderboard = !!top10?.some((r) => r.username === params.player.username);

  return {
    ok: !sessionErr && !lbErr && !topErr,
    top10: top10 ?? [],
    madeLeaderboard,
    durationSeconds,
  };
}
