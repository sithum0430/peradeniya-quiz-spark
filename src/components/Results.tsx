import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import universityLogo from "@/assets/university-logo.png";
import engexLogo from "@/assets/engex-logo.png";

interface LeaderboardEntry {
  username: string;
  name: string;
  score: number;
  achieved_at: string;
}

interface ResultsProps {
  score: number;
  onPlayAgain: () => void;
  madeLeaderboard?: boolean;
  playerData?: {
    username: string;
    name: string;
  };
}

export default function Results({ score, onPlayAgain, madeLeaderboard, playerData }: ResultsProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const { data } = await supabase
          .from("leaderboard")
          .select("username, name, score, achieved_at")
          .order("score", { ascending: false })
          .order("achieved_at", { ascending: true })
          .limit(10);

        if (data) {
          setLeaderboard(data);
        }
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const getRankSuffix = (rank: number) => {
    if (rank >= 11 && rank <= 13) return "th";
    switch (rank % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  return (
    <div className="min-h-screen p-4 bubble-effect">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Congratulations Message */}
        {madeLeaderboard && (
          <Card className="quiz-card text-center border-2 border-yellow-400/40 bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 celebrate">
            <CardContent className="p-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold gradient-text mb-2">
                Congratulations {playerData?.name}!
              </h2>
              <p className="text-lg text-muted-foreground">
                You made it to the Top 10 Leaderboard! 🏆
              </p>
            </CardContent>
          </Card>
        )}

        {/* Score Display */}
        <Card className="quiz-card text-center float-animation">
          <CardHeader>
            <div className="flex justify-center items-center gap-6 mb-4">
              <img src={universityLogo} alt="University of Peradeniya" className="h-12 w-auto" />
              <img src={engexLogo} alt="EngEX Exhibition" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-3xl font-bold gradient-text">
              Quiz Complete!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-8xl font-bold score-pulse bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-4">
              {score}
            </div>
            <p className="text-2xl text-muted-foreground mb-8">Final Score</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={onPlayAgain} className="quiz-gradient text-white font-semibold px-8 py-3">
                🚀 Try Again
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="quiz-card">
          <CardHeader>
            <CardTitle className="text-2xl text-center">🏆 Top 10 Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center">Loading leaderboard...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground">No scores yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <div
                    key={`${entry.username}-${entry.achieved_at}`}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-300 dark:border-yellow-600"
                        : index === 1
                        ? "bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800/20 dark:to-gray-700/20 border-2 border-gray-300 dark:border-gray-600"
                        : index === 2
                        ? "bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/20 border-2 border-orange-300 dark:border-orange-600"
                        : "bg-muted/50 border"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? "bg-yellow-500 text-white" :
                        index === 1 ? "bg-gray-500 text-white" :
                        index === 2 ? "bg-orange-500 text-white" :
                        "bg-primary text-primary-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{entry.name}</div>
                        <div className="text-sm text-muted-foreground">@{entry.username}</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">
                      {entry.score}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}