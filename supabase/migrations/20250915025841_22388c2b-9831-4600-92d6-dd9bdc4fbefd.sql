-- Fix RLS policies for no-auth access to quiz_sessions and leaderboard

-- Enable RLS on quiz_sessions (if not already enabled)
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "quiz_sessions insert public" ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions select public" ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions update public" ON public.quiz_sessions;

-- Create permissive policies for quiz_sessions (no-auth friendly)
CREATE POLICY "quiz_sessions insert public" 
ON public.quiz_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "quiz_sessions select public" 
ON public.quiz_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "quiz_sessions update public" 
ON public.quiz_sessions 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Ensure leaderboard RLS policies are also permissive
DROP POLICY IF EXISTS "leaderboard insert public" ON public.leaderboard;
DROP POLICY IF EXISTS "leaderboard select public" ON public.leaderboard;
DROP POLICY IF EXISTS "leaderboard update public" ON public.leaderboard;

CREATE POLICY "leaderboard insert public" 
ON public.leaderboard 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "leaderboard select public" 
ON public.leaderboard 
FOR SELECT 
USING (true);

CREATE POLICY "leaderboard update public" 
ON public.leaderboard 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Ensure the maintain_top_10_leaderboard trigger is properly set up
DROP TRIGGER IF EXISTS trg_maintain_top_10_leaderboard ON public.leaderboard;

CREATE TRIGGER trg_maintain_top_10_leaderboard
AFTER INSERT OR UPDATE ON public.leaderboard
FOR EACH ROW
EXECUTE FUNCTION public.maintain_top_10_leaderboard();