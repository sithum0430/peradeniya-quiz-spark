-- Enable RLS on all remaining tables
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all tables (no auth required)
CREATE POLICY "players select public" ON public.players FOR SELECT USING (true);
CREATE POLICY "players insert public" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "players update public" ON public.players FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "questions select public" ON public.questions FOR SELECT USING (true);

CREATE POLICY "quiz_sessions select public" ON public.quiz_sessions FOR SELECT USING (true);
CREATE POLICY "quiz_sessions insert public" ON public.quiz_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "quiz_sessions update public" ON public.quiz_sessions FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "player_answers select public" ON public.player_answers FOR SELECT USING (true);
CREATE POLICY "player_answers insert public" ON public.player_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "player_answers update public" ON public.player_answers FOR UPDATE USING (true) WITH CHECK (true);