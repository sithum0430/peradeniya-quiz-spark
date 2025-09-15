import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id: number;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
}

interface QuizProps {
  username: string;
  name: string;
  phone: string;
  onQuizComplete: (score: number, madeLeaderboard?: boolean) => void;
}

export default function Quiz({ username, name, phone, onQuizComplete }: QuizProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const { toast } = useToast();

  // Load questions and create session
  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        // Get all questions
        const { data: allQuestions } = await supabase
          .from("questions")
          .select("*");

        if (!allQuestions || allQuestions.length === 0) {
          toast({
            title: "No questions available",
            description: "Please contact the administrator.",
            variant: "destructive",
          });
          return;
        }

        // Randomize questions
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);

        // Create quiz session
        const { data: session, error } = await supabase
          .from("quiz_sessions")
          .insert({
            username,
            total_score: 0,
            duration_seconds: 0,
          })
          .select()
          .single();

        if (error) throw error;
        setSessionId(session.id);
        setQuestionStartTime(Date.now());
      } catch (error) {
        console.error("Failed to initialize quiz:", error);
        toast({
          title: "Failed to start quiz",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeQuiz();
  }, [username, toast]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const calculateScore = (answerTimeMs: number) => {
    const answerTimeSeconds = answerTimeMs / 1000;
    if (answerTimeSeconds <= 10) {
      // Full bonus for answers within 10 seconds (linear scale)
      const timeBonus = Math.max(0, 10 - answerTimeSeconds);
      return 10 + Math.round(timeBonus);
    }
    return 10; // Base score only for slower answers
  };

  const handleAnswer = async (selectedOption: number) => {
    if (!sessionId || currentQuestionIndex >= questions.length) return;

    const currentQuestion = questions[currentQuestionIndex];
    const answerTime = Date.now() - questionStartTime;
    const isCorrect = selectedOption === currentQuestion.correct_option;
    
    let questionScore = 0;
    if (isCorrect) {
      questionScore = calculateScore(answerTime);
    } else {
      questionScore = -5;
    }

    const newScore = score + questionScore;
    setScore(newScore);

    try {
      // Record the answer
      await supabase.from("player_answers").insert({
        session_id: sessionId,
        question_id: currentQuestion.id,
        selected_option: selectedOption,
        correct: isCorrect,
        answer_time_seconds: answerTime / 1000,
        passed: false,
      });

      moveToNextQuestion();
    } catch (error) {
      console.error("Failed to record answer:", error);
    }
  };

  const handlePass = async () => {
    if (!sessionId || currentQuestionIndex >= questions.length) return;

    const currentQuestion = questions[currentQuestionIndex];

    try {
      // Record the pass
      await supabase.from("player_answers").insert({
        session_id: sessionId,
        question_id: currentQuestion.id,
        selected_option: null,
        correct: false,
        answer_time_seconds: (Date.now() - questionStartTime) / 1000,
        passed: true,
      });

      moveToNextQuestion();
    } catch (error) {
      console.error("Failed to record pass:", error);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    } else {
      endQuiz();
    }
  };

  const endQuiz = useCallback(async () => {
    if (!sessionId) return;

    const totalDuration = Math.floor((Date.now() - startTime) / 1000);

    try {
      // Update session with final score
      const { error: sessionError } = await supabase
        .from("quiz_sessions")
        .update({
          total_score: score,
          duration_seconds: totalDuration,
        })
        .eq("id", sessionId);

      if (sessionError) {
        console.error("Failed to update quiz session:", sessionError);
        toast({
          title: "Warning",
          description: "Failed to save session data",
          variant: "destructive",
        });
      }

      // Use the secure RPC function to handle leaderboard upsert
      const { error: leaderboardError } = await supabase.rpc("upsert_leaderboard", {
        p_username: username,
        p_name: name,
        p_phone: phone,
        p_score: score,
      });

      if (leaderboardError) {
        console.error("Failed to update leaderboard:", leaderboardError);
        toast({
          title: "Error",
          description: "Failed to update leaderboard",
          variant: "destructive",
        });
        onQuizComplete(score, false);
        return;
      }

      // Check if player made it to top 10 (after the upsert)
      const { data: leaderboard, error: checkError } = await supabase
        .from("leaderboard")
        .select("username")
        .order("score", { ascending: false })
        .order("achieved_at", { ascending: true })
        .limit(10);

      if (checkError) {
        console.error("Failed to check leaderboard:", checkError);
        onQuizComplete(score, false);
        return;
      }

      const madeLeaderboard = leaderboard?.some(entry => entry.username === username) || false;
      onQuizComplete(score, madeLeaderboard);

    } catch (error) {
      console.error("Failed to end quiz:", error);
      toast({
        title: "Error",
        description: "Quiz completion failed",
        variant: "destructive",
      });
      onQuizComplete(score, false);
    }
  }, [sessionId, score, startTime, username, name, phone, onQuizComplete, toast]);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="quiz-card">
          <CardContent className="p-8 text-center">
            <p>Loading questions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (timeLeft === 0 || currentQuestionIndex >= questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bubble-effect">
        <Card className="quiz-card celebrate">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-6">⏰</div>
            <h2 className="text-4xl font-bold gradient-text mb-6">Time's Up!</h2>
            <div className="text-6xl font-bold score-pulse bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
              {score}
            </div>
            <p className="text-xl text-muted-foreground">Final Score</p>
            <div className="mt-6 text-sm text-muted-foreground">
              Calculating your position on the leaderboard...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = (currentQuestionIndex / questions.length) * 100;

  return (
    <div className="min-h-screen p-4 bubble-effect">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="quiz-card mb-6 float-animation">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Score: {score}
              </div>
              <div className={`text-lg font-semibold ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <Progress value={progress} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </CardContent>
        </Card>

        {/* Question */}
        <Card className="quiz-card">
          <CardHeader>
            <CardTitle className="text-2xl gradient-text leading-relaxed">
              {currentQuestion.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleAnswer(1)}
              variant="outline"
              className="w-full text-left justify-start h-auto p-6 text-wrap glass border-0 hover:scale-105 transition-all duration-200 text-lg"
            >
              <span className="font-semibold text-primary mr-3">A)</span>
              {currentQuestion.option_1}
            </Button>
            <Button
              onClick={() => handleAnswer(2)}
              variant="outline"
              className="w-full text-left justify-start h-auto p-6 text-wrap glass border-0 hover:scale-105 transition-all duration-200 text-lg"
            >
              <span className="font-semibold text-primary mr-3">B)</span>
              {currentQuestion.option_2}
            </Button>
            <Button
              onClick={() => handleAnswer(3)}
              variant="outline"
              className="w-full text-left justify-start h-auto p-6 text-wrap glass border-0 hover:scale-105 transition-all duration-200 text-lg"
            >
              <span className="font-semibold text-primary mr-3">C)</span>
              {currentQuestion.option_3}
            </Button>
            <Button
              onClick={() => handleAnswer(4)}
              variant="outline"
              className="w-full text-left justify-start h-auto p-6 text-wrap glass border-0 hover:scale-105 transition-all duration-200 text-lg"
            >
              <span className="font-semibold text-primary mr-3">D)</span>
              {currentQuestion.option_4}
            </Button>
            <div className="pt-4 border-t border-border/20">
              <Button
                onClick={handlePass}
                variant="secondary"
                className="w-full glass border-0 hover:bg-muted/80 text-lg py-3"
              >
                ⏭️ Pass Question
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
