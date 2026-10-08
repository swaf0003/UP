
-- Thanks table for the "Merci" reward system
CREATE TABLE public.thanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  message_source text NOT NULL DEFAULT 'private',
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, sender_id)
);

ALTER TABLE public.thanks ENABLE ROW LEVEL SECURITY;

-- Users can thank others (insert)
CREATE POLICY "Users can send thanks"
  ON public.thanks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND auth.uid() != receiver_id);

-- Users can see thanks they sent or received
CREATE POLICY "Users can read own thanks"
  ON public.thanks FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Anyone authenticated can count thanks (for leaderboard)
CREATE POLICY "Authenticated can read all thanks"
  ON public.thanks FOR SELECT TO authenticated
  USING (true);

-- Users can delete their own thanks (undo)
CREATE POLICY "Users can undo thanks"
  ON public.thanks FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.thanks;
