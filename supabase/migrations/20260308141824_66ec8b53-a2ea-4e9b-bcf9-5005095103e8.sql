
-- Rename concept: thanks → stars, add daily limit tracking
-- Add a stars_given_today tracking via a date column on thanks table
ALTER TABLE public.thanks ADD COLUMN IF NOT EXISTS given_date date NOT NULL DEFAULT CURRENT_DATE;

-- Create a function to check if user can still give stars today (max 3)
CREATE OR REPLACE FUNCTION public.can_give_star(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) FROM public.thanks 
    WHERE sender_id = _user_id AND given_date = CURRENT_DATE
  ) < 3
$$;

-- Drop old insert policy and create new one with daily limit
DROP POLICY IF EXISTS "Users can send thanks" ON public.thanks;

CREATE POLICY "Users can send stars with daily limit"
  ON public.thanks FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id 
    AND auth.uid() != receiver_id
    AND public.can_give_star(auth.uid())
  );

-- Create quests tracking table
CREATE TABLE public.quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quest_id text NOT NULL,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  points_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id, completed_date)
);

ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quests"
  ON public.quest_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can complete quests"
  ON public.quest_completions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Leaderboard: allow everyone to read all thanks for counting
-- (policy already exists: "Authenticated can read all thanks")
