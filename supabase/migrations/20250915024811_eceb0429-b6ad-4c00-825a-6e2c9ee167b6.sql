-- Maintain top 10 leaderboard trigger (creates if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_maintain_top_10_leaderboard'
  ) THEN
    CREATE TRIGGER trg_maintain_top_10_leaderboard
    AFTER INSERT OR UPDATE ON public.leaderboard
    FOR EACH ROW
    EXECUTE FUNCTION public.maintain_top_10_leaderboard();
  END IF;
END $$;