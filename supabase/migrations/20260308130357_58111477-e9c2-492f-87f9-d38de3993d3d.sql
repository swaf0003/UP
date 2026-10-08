
-- Create contacts table for the Union feature
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Users can see their own contacts
CREATE POLICY "Users can read own contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can add contacts
CREATE POLICY "Users can insert own contacts"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can remove contacts
CREATE POLICY "Users can delete own contacts"
ON public.contacts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Update profiles RLS: allow authenticated users to see all profiles (for explore/search)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
