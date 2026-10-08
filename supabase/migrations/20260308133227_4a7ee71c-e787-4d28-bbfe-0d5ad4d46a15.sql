-- Hub members: track who joined which course hub
CREATE TABLE public.hub_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

ALTER TABLE public.hub_members ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see member counts
CREATE POLICY "Authenticated can read hub members"
ON public.hub_members FOR SELECT
TO authenticated
USING (true);

-- Users can join hubs
CREATE POLICY "Users can join hubs"
ON public.hub_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can leave hubs
CREATE POLICY "Users can leave hubs"
ON public.hub_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all members
CREATE POLICY "Admins can manage hub members"
ON public.hub_members FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow admins to insert hub_messages for announcements
CREATE POLICY "Admins can send any hub message"
ON public.hub_messages FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert courses (already exists but let's ensure)
-- Already covered by existing RLS policies on courses

CREATE INDEX idx_hub_members_course ON public.hub_members(course_id);
CREATE INDEX idx_hub_members_user ON public.hub_members(user_id);