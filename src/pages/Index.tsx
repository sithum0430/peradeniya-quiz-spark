import { useState } from "react";
import Registration from "@/components/Registration";
import Quiz from "@/components/Quiz";
import Results from "@/components/Results";

type AppState = "registration" | "quiz" | "results";

interface PlayerData {
  username: string;
  name: string;
  phone: string;
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>("registration");
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  const handleRegistrationSuccess = (username: string, name: string, phone: string) => {
    setPlayerData({ username, name, phone });
    setAppState("quiz");
  };

  const handleQuizComplete = (score: number) => {
    setFinalScore(score);
    setAppState("results");
  };

  const handlePlayAgain = () => {
    setAppState("registration");
    setPlayerData(null);
    setFinalScore(0);
  };

  if (appState === "registration") {
    return <Registration onRegistrationSuccess={handleRegistrationSuccess} />;
  }

  if (appState === "quiz" && playerData) {
    return (
      <Quiz
        username={playerData.username}
        name={playerData.name}
        phone={playerData.phone}
        onQuizComplete={handleQuizComplete}
      />
    );
  }

  if (appState === "results") {
    return <Results score={finalScore} onPlayAgain={handlePlayAgain} />;
  }

  return null;
};

export default Index;
