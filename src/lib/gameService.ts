import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  username: string;
  name: string;
  phone: string;
  score: number;
  achieved_at: string;
}

export interface GameSession {
  sessionId: number;
  startTime: number;
}

export interface EndSessionResult {
  top10: LeaderboardEntry[];
  inTop10: boolean;
  rankIfAny?: number;
}

export class GameService {
  /**
   * Start a new quiz session
   */
  static async startSession(username: string): Promise<GameSession> {
    console.log("GameService: Starting session for username:", username);
    
    const startTime = Date.now();
    
    try {
      const { data: session, error } = await supabase
        .from("quiz_sessions")
        .insert({
          username,
          total_score: 0,
          duration_seconds: 0,
        })
        .select("id")
        .single();

      if (error) {
        console.error("GameService: Failed to create session:", error);
        throw error;
      }

      console.log("GameService: Session created successfully:", session.id);
      return {
        sessionId: session.id,
        startTime,
      };
    } catch (error) {
      console.error("GameService: Error in startSession:", error);
      throw error;
    }
  }

  /**
   * End a quiz session and update leaderboard
   */
  static async endSession(
    sessionId: number,
    finalScore: number,
    startedAt: number,
    username: string,
    name: string,
    phone: string
  ): Promise<EndSessionResult> {
    const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);
    
    console.log("GameService: Ending session", {
      sessionId,
      finalScore,
      durationSeconds,
      username,
      name,
      phone
    });

    try {
      // Step 1: Update quiz_sessions
      console.log("GameService: Updating quiz session...");
      const { error: sessionError } = await supabase
        .from("quiz_sessions")
        .update({
          total_score: finalScore,
          duration_seconds: durationSeconds,
        })
        .eq("id", sessionId);

      if (sessionError) {
        console.error("GameService: Failed to update quiz session:", sessionError);
        // Continue with leaderboard update even if session update fails
      } else {
        console.log("GameService: Quiz session updated successfully");
      }

      // Step 2: Upsert leaderboard using RPC function
      console.log("GameService: Upserting leaderboard entry...");
      const { error: leaderboardError } = await supabase.rpc("upsert_leaderboard", {
        p_username: username,
        p_name: name,
        p_phone: phone,
        p_score: finalScore,
      });

      if (leaderboardError) {
        console.error("GameService: Failed to upsert leaderboard:", leaderboardError);
        // Continue with fetching leaderboard even if upsert fails
      } else {
        console.log("GameService: Leaderboard upserted successfully");
      }

      // Step 3: Fetch top 10 leaderboard
      console.log("GameService: Fetching top 10 leaderboard...");
      const { data: top10, error: fetchError } = await supabase
        .from("leaderboard")
        .select("username, name, phone, score, achieved_at")
        .order("score", { ascending: false })
        .order("achieved_at", { ascending: true })
        .limit(10);

      if (fetchError) {
        console.error("GameService: Failed to fetch leaderboard:", fetchError);
        throw fetchError;
      }

      // Step 4: Check if player made it to top 10 and find rank
      const inTop10 = top10?.some(entry => entry.username === username) || false;
      let rankIfAny: number | undefined;
      
      if (inTop10 && top10) {
        rankIfAny = top10.findIndex(entry => entry.username === username) + 1;
      }

      console.log("GameService: End session complete", {
        top10Count: top10?.length || 0,
        inTop10,
        rankIfAny
      });

      // Health check: log if more than 10 entries (trigger issue)
      const { count } = await supabase
        .from("leaderboard")
        .select("*", { count: 'exact' });
      
      if (count && count > 10) {
        console.warn("GameService: HEALTH CHECK FAILED - Leaderboard has", count, "entries (should be max 10)");
      }

      return {
        top10: top10 || [],
        inTop10,
        rankIfAny,
      };
    } catch (error) {
      console.error("GameService: Error in endSession:", error);
      throw error;
    }
  }

  /**
   * Fetch current leaderboard
   */
  static async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("username, name, phone, score, achieved_at")
        .order("score", { ascending: false })
        .order("achieved_at", { ascending: true })
        .limit(10);

      if (error) {
        console.error("GameService: Failed to fetch leaderboard:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("GameService: Error in getLeaderboard:", error);
      throw error;
    }
  }
}