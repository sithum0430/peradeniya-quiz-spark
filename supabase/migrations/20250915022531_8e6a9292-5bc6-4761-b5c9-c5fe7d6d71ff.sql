-- 1) Enable RLS and open policies for public access (no auth)
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (keeps idempotency safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leaderboard' AND policyname = 'leaderboard select public'
  ) THEN
    EXECUTE 'DROP POLICY "leaderboard select public" ON public.leaderboard';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leaderboard' AND policyname = 'leaderboard insert public'
  ) THEN
    EXECUTE 'DROP POLICY "leaderboard insert public" ON public.leaderboard';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leaderboard' AND policyname = 'leaderboard update public'
  ) THEN
    EXECUTE 'DROP POLICY "leaderboard update public" ON public.leaderboard';
  END IF;
END$$;

-- Create permissive policies to allow public access via anon key
CREATE POLICY "leaderboard select public"
ON public.leaderboard
FOR SELECT
USING (true);

CREATE POLICY "leaderboard insert public"
ON public.leaderboard
FOR INSERT
WITH CHECK (true);

CREATE POLICY "leaderboard update public"
ON public.leaderboard
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 2) Secure and attach the trigger to keep only top 10
CREATE OR REPLACE FUNCTION public.maintain_top_10_leaderboard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete rows outside top 10 (highest score wins, earlier timestamp breaks ties)
  DELETE FROM public.leaderboard l
  WHERE (l.username, l.score, l.achieved_at) NOT IN (
    SELECT username, score, achieved_at
    FROM public.leaderboard
    ORDER BY score DESC, achieved_at ASC
    LIMIT 10
  );
  RETURN NEW;
END;
$$;

-- Ensure trigger is present
DROP TRIGGER IF EXISTS trg_maintain_leaderboard ON public.leaderboard;
CREATE TRIGGER trg_maintain_leaderboard
AFTER INSERT OR UPDATE ON public.leaderboard
FOR EACH ROW
EXECUTE FUNCTION public.maintain_top_10_leaderboard();

-- 3) RPC to perform conditional UPSERT (only update if new score is higher)
CREATE OR REPLACE FUNCTION public.upsert_leaderboard(
  p_username text,
  p_name     text,
  p_phone    text,
  p_score    integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leaderboard (username, name, phone, score, achieved_at)
  VALUES (p_username, p_name, p_phone, p_score, now())
  ON CONFLICT (username) DO UPDATE
  SET score = EXCLUDED.score,
      achieved_at = EXCLUDED.achieved_at,
      name = EXCLUDED.name,
      phone = EXCLUDED.phone
  WHERE public.leaderboard.score < EXCLUDED.score;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_leaderboard(text, text, text, integer) TO anon, authenticated;