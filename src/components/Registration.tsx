import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import universityLogo from "@/assets/university-logo.png";
import engexLogo from "@/assets/engex-logo.png";

interface LeaderboardEntry {
  username: string;
  name: string;
  score: number;
  achieved_at: string;
}

interface RegistrationProps {
  onRegistrationSuccess: (username: string, name: string, phone: string) => void;
}

export default function Registration({ onRegistrationSuccess }: RegistrationProps) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const { toast } = useToast();

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
        setLeaderboardLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !name.trim() || !phone.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if username already exists
      const { data: existingPlayer } = await supabase
        .from("players")
        .select("username")
        .eq("username", username.trim())
        .single();

      if (existingPlayer) {
        toast({
          title: "Username taken",
          description: "This username is already taken. Please choose another one.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Insert new player
      const { error } = await supabase
        .from("players")
        .insert({
          username: username.trim(),
          name: name.trim(),
          phone: phone.trim(),
        });

      if (error) throw error;

      toast({
        title: "Registration successful!",
        description: "Get ready to start the quiz!",
      });

      onRegistrationSuccess(username.trim(), name.trim(), phone.trim());
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "There was an error during registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bubble-effect">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Registration Form */}
          <div className="flex items-center justify-center min-h-screen lg:min-h-0">
            <Card className="w-full max-w-md quiz-card border-0 shadow-2xl float-animation">
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center items-center gap-6 mb-4">
                  <img src={universityLogo} alt="University of Peradeniya" className="h-16 w-auto" />
                  <img src={engexLogo} alt="EngEX Exhibition" className="h-16 w-auto" />
                </div>
                <CardTitle className="text-2xl font-bold gradient-text">
                  Math Quiz Challenge
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-2">
                  Celebrating 75 Years of Excellence
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your unique username"
                      className="mt-1 glass border-0"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="mt-1 glass border-0"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="mt-1 glass border-0"
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full quiz-gradient text-white font-semibold py-3"
                    disabled={loading}
                  >
                    {loading ? "Registering..." : "Start Quiz Challenge! 🚀"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Display */}
          <div className="lg:pt-20">
            <Card className="quiz-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-2xl text-center gradient-text flex items-center justify-center gap-2">
                  🏆 Top 10 Champions
                </CardTitle>
                <p className="text-center text-muted-foreground">Current Leaderboard</p>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading champions...</p>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No champions yet!</p>
                    <p className="text-sm text-muted-foreground mt-1">Be the first to claim the throne 👑</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={`${entry.username}-${entry.achieved_at}`}
                        className={`leaderboard-entry flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                          index === 0
                            ? "bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border-2 border-yellow-400/40 shadow-lg"
                            : index === 1
                            ? "bg-gradient-to-r from-gray-400/20 to-gray-600/20 border-2 border-gray-400/40 shadow-lg"
                            : index === 2
                            ? "bg-gradient-to-r from-orange-400/20 to-orange-600/20 border-2 border-orange-400/40 shadow-lg"
                            : "glass border"
                        }`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg" :
                          index === 1 ? "bg-gradient-to-br from-gray-400 to-gray-600 text-white shadow-lg" :
                          index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg" :
                          "bg-gradient-to-br from-primary to-accent text-white"
                        }`}>
                          {index === 0 ? "👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{entry.name}</div>
                          <div className="text-sm text-muted-foreground truncate">@{entry.username}</div>
                        </div>
                        <div className="text-xl font-bold score-pulse">
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
      </div>
    </div>
  );
}