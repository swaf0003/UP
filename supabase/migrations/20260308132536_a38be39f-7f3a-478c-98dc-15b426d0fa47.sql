-- Hub messages for group chats (per course)
CREATE TABLE public.hub_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  voice_url text,
  voice_duration numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hub_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read hub messages
CREATE POLICY "Authenticated users can read hub messages"
ON public.hub_messages FOR SELECT
TO authenticated
USING (true);

-- Users can send hub messages (sender_id must match)
CREATE POLICY "Users can send hub messages"
ON public.hub_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Admins can delete hub messages
CREATE POLICY "Admins can delete hub messages"
ON public.hub_messages FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_messages;

-- Index for fast lookups
CREATE INDEX idx_hub_messages_course_id ON public.hub_messages(course_id);
CREATE INDEX idx_hub_messages_created_at ON public.hub_messages(created_at);