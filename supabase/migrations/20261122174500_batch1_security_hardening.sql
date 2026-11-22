-- =============================================================================
-- Union Project (UP) — Batch 1: Critical & High Security Hardening Migration
-- Idempotent, safe to apply on top of existing 2026-03 migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop legacy orphaned OTP table & function (now using Supabase native OTP)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cleanup_expired_codes();
DROP TABLE IF EXISTS public.verification_codes;

-- -----------------------------------------------------------------------------
-- 2. Academic .be email enforcement & MFA (aal2) helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_academic_email(p_email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  domain text;
  allowed text[] := ARRAY[
    'ulb.be', 'student.ulb.be', 'ulb.ac.be',
    'uclouvain.be', 'student.uclouvain.be',
    'uliege.be', 'student.uliege.be', 'ulg.ac.be',
    'umons.ac.be', 'student.umons.ac.be',
    'unamur.be', 'student.unamur.be',
    'uantwerpen.be', 'student.uantwerpen.be',
    'ugent.be',
    'uhasselt.be', 'student.uhasselt.be',
    'vub.be', 'vub.ac.be',
    'kuleuven.be', 'student.kuleuven.be',
    'saintlouis.be', 'usaintlouis.be',
    'he2b.be', 'heh.be', 'helb-prigogine.be', 'helmo.be', 'henallux.be',
    'ephec.be', 'ichec.be', 'vinci.be', 'condorcet.be', 'hers.be', 'hepl.be'
  ];
BEGIN
  IF p_email IS NULL OR position('@' IN p_email) = 0 THEN
    RETURN false;
  END IF;
  domain := lower(split_part(trim(p_email), '@', 2));
  IF domain = ANY(allowed) THEN
    RETURN true;
  END IF;
  -- Allow subdomains of recognized Belgian academic domains (.ac.be or allowed parent)
  IF domain LIKE '%.ac.be' OR domain LIKE '%.ulb.be' OR domain LIKE '%.uclouvain.be'
     OR domain LIKE '%.uliege.be' OR domain LIKE '%.unamur.be' OR domain LIKE '%.ugent.be'
     OR domain LIKE '%.vub.be' OR domain LIKE '%.kuleuven.be' OR domain LIKE '%.uantwerpen.be'
     OR domain LIKE '%.uhasselt.be' THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- Helper: true if user has no verified MFA factors, OR current session JWT is aal2
CREATE OR REPLACE FUNCTION public.mfa_satisfied()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1 FROM auth.mfa_factors
      WHERE user_id = auth.uid() AND status = 'verified'
    )
    OR coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- -----------------------------------------------------------------------------
-- 3. Private Profile Isolation (PII: date_of_birth, gender, ics_link)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_private (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth date,
  gender text DEFAULT '',
  ics_link text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own private profile" ON public.profile_private;
CREATE POLICY "Users can view own private profile"
  ON public.profile_private FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.mfa_satisfied());

DROP POLICY IF EXISTS "Users can insert own private profile" ON public.profile_private;
CREATE POLICY "Users can insert own private profile"
  ON public.profile_private FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.mfa_satisfied());

DROP POLICY IF EXISTS "Users can update own private profile" ON public.profile_private;
CREATE POLICY "Users can update own private profile"
  ON public.profile_private FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.mfa_satisfied())
  WITH CHECK (auth.uid() = user_id AND public.mfa_satisfied());

-- Backfill existing PII from public.profiles into public.profile_private
INSERT INTO public.profile_private (user_id, date_of_birth, gender, ics_link)
SELECT p.user_id, p.date_of_birth, COALESCE(p.gender, ''), p.ics_link
FROM public.profiles p
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)
ON CONFLICT (user_id) DO UPDATE SET
  date_of_birth = COALESCE(EXCLUDED.date_of_birth, public.profile_private.date_of_birth),
  gender = COALESCE(NULLIF(EXCLUDED.gender, ''), public.profile_private.gender),
  ics_link = COALESCE(EXCLUDED.ics_link, public.profile_private.ics_link);

-- Scrub sensitive PII columns from public.profiles so cross-user SELECT cannot leak them
UPDATE public.profiles SET date_of_birth = NULL, gender = '', ics_link = NULL;

-- Public-safe view for directory/chat lookups
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, user_id, display_name, university, faculty, academic_year, avatar_url, email_verified, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Guard profiles.email_verified & sync from auth.users.email_confirmed_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent authenticated clients from tampering with email_verified or writing PII back to public profiles
  IF auth.role() = 'authenticated' THEN
    NEW.email_verified := OLD.email_verified;
    NEW.ics_link := NULL;
    NEW.date_of_birth := NULL;
    NEW.gender := '';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_updates ON public.profiles;
CREATE TRIGGER trg_guard_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_updates();

CREATE OR REPLACE FUNCTION public.sync_email_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at <> NEW.email_confirmed_at) THEN
    UPDATE public.profiles SET email_verified = true WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_email_verified ON auth.users;
CREATE TRIGGER trg_sync_email_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_verified();

-- Harden handle_new_user(): validate academic .be email, safe date cast, insert profile_private
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dob date := NULL;
  v_dob_raw text;
BEGIN
  IF NOT public.is_academic_email(NEW.email) THEN
    RAISE EXCEPTION 'Seuls les emails universitaires belges (.be) sont autorisés.';
  END IF;

  v_dob_raw := NEW.raw_user_meta_data ->> 'date_of_birth';
  IF v_dob_raw IS NOT NULL AND v_dob_raw ~ '^\d{4}-\d{2}-\d{2}$' THEN
    BEGIN
      v_dob := v_dob_raw::date;
    EXCEPTION WHEN others THEN
      v_dob := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, university, faculty, academic_year, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'university', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'faculty', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'academic_year', ''),
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.profile_private (user_id, date_of_birth, gender)
  VALUES (
    NEW.id,
    v_dob,
    COALESCE(NEW.raw_user_meta_data ->> 'gender', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Tighten profiles UPDATE policy with MFA check
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.mfa_satisfied())
  WITH CHECK (auth.uid() = user_id AND public.mfa_satisfied());

-- -----------------------------------------------------------------------------
-- 5. Storage Buckets: Private voice-messages & resources, MIME & size limits
-- -----------------------------------------------------------------------------
UPDATE storage.buckets
SET public = true,
    file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';

UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav']
WHERE id = 'voice-messages';

UPDATE storage.buckets
SET public = false,
    file_size_limit = 20971520, -- 20 MB
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png',
      'image/jpeg',
      'image/webp'
    ]
WHERE id = 'resources';

-- Remove public SELECT policy on voice-messages; restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Voice messages are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read voice messages" ON storage.objects;
CREATE POLICY "Authenticated users can read voice messages"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-messages' AND public.mfa_satisfied());

-- -----------------------------------------------------------------------------
-- 6. Lock hub_messages to hub_members & lock messages UPDATE to read-only
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view hub messages" ON public.hub_messages;
DROP POLICY IF EXISTS "Hub members can view hub messages" ON public.hub_messages;
CREATE POLICY "Hub members can view hub messages"
  ON public.hub_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hub_members hm
      WHERE hm.course_id = hub_messages.course_id AND hm.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Authenticated users can insert hub messages" ON public.hub_messages;
DROP POLICY IF EXISTS "Hub members can insert hub messages" ON public.hub_messages;
CREATE POLICY "Hub members can insert hub messages"
  ON public.hub_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.mfa_satisfied()
    AND EXISTS (
      SELECT 1 FROM public.hub_members hm
      WHERE hm.course_id = hub_messages.course_id AND hm.user_id = auth.uid()
    )
  );

-- Lock DM UPDATE so recipients can ONLY mark read = true
CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.message_type IS DISTINCT FROM OLD.message_type
       OR NEW.voice_url IS DISTINCT FROM OLD.voice_url
       OR NEW.voice_duration IS DISTINCT FROM OLD.voice_duration
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Seul le statut de lecture peut être modifié sur un message reçu.';
    END IF;
    IF OLD.read = true AND NEW.read = false THEN
      RAISE EXCEPTION 'Un message lu ne peut pas redevenir non lu.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_message_update ON public.messages;
CREATE TRIGGER trg_guard_message_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_message_update();

-- Enforce MFA on sensitive tables (messages, calendar_events, user_roles)
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT TO authenticated
  USING ((auth.uid() = sender_id OR auth.uid() = receiver_id) AND public.mfa_satisfied());

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.mfa_satisfied());

DROP POLICY IF EXISTS "Users can update received messages" ON public.messages;
CREATE POLICY "Users can update received messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id AND public.mfa_satisfied())
  WITH CHECK (auth.uid() = receiver_id AND public.mfa_satisfied());

-- -----------------------------------------------------------------------------
-- 7. Lock Gamification (thanks & quest_completions) against tampering
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_thanks_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_count integer;
BEGIN
  IF NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Tu ne peux pas te donner une étoile à toi-même.';
  END IF;

  -- Force server-side date to prevent timezone/past-date bypass
  NEW.given_date := CURRENT_DATE;

  -- Advisory lock per sender to prevent concurrent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('thanks:' || NEW.sender_id::text));

  SELECT COUNT(*) INTO today_count
  FROM public.thanks
  WHERE sender_id = NEW.sender_id AND given_date = CURRENT_DATE;

  IF today_count >= 3 THEN
    RAISE EXCEPTION 'Limite quotidienne de 3 étoiles atteinte.';
  END IF;

  -- Verify referenced message exists in either hub_messages or messages
  IF NEW.message_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.hub_messages WHERE id = NEW.message_id)
       AND NOT EXISTS (SELECT 1 FROM public.messages WHERE id = NEW.message_id) THEN
      RAISE EXCEPTION 'Message introuvable.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_thanks_insert ON public.thanks;
CREATE TRIGGER trg_guard_thanks_insert
  BEFORE INSERT ON public.thanks
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_thanks_insert();

-- Revoke arbitrary direct INSERT on quest_completions; expose safe RPC
DROP POLICY IF EXISTS "Users can complete quests" ON public.quest_completions;

CREATE OR REPLACE FUNCTION public.complete_quest(p_quest_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  v_points := CASE p_quest_id
    WHEN 'daily_message' THEN 5
    WHEN 'give_star' THEN 5
    WHEN 'visit_archive' THEN 3
    WHEN 'sync_agenda' THEN 5
    ELSE NULL
  END;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Quête inconnue';
  END IF;

  INSERT INTO public.quest_completions (user_id, quest_id, completed_date, points_earned)
  VALUES (auth.uid(), p_quest_id, CURRENT_DATE, v_points)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. Revoke public/anon execution on privileged role-check RPCs
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_give_star(uuid) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- 9. Resource URL protocol check (prevent javascript: / data: XSS)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resources_url_http_check'
  ) THEN
    ALTER TABLE public.resources
      ADD CONSTRAINT resources_url_http_check
      CHECK (url ~* '^https?://') NOT VALID;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 10. GDPR Cascade Foreign Keys (ON DELETE CASCADE to auth.users)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hub_messages_sender_cascade') THEN
    DELETE FROM public.hub_messages WHERE sender_id NOT IN (SELECT id FROM auth.users);
    ALTER TABLE public.hub_messages
      ADD CONSTRAINT fk_hub_messages_sender_cascade
      FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hub_members_user_cascade') THEN
    DELETE FROM public.hub_members WHERE user_id NOT IN (SELECT id FROM auth.users);
    ALTER TABLE public.hub_members
      ADD CONSTRAINT fk_hub_members_user_cascade
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_thanks_sender_cascade') THEN
    DELETE FROM public.thanks WHERE sender_id NOT IN (SELECT id FROM auth.users);
    ALTER TABLE public.thanks
      ADD CONSTRAINT fk_thanks_sender_cascade
      FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_thanks_receiver_cascade') THEN
    DELETE FROM public.thanks WHERE receiver_id NOT IN (SELECT id FROM auth.users);
    ALTER TABLE public.thanks
      ADD CONSTRAINT fk_thanks_receiver_cascade
      FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quest_completions_user_cascade') THEN
    DELETE FROM public.quest_completions WHERE user_id NOT IN (SELECT id FROM auth.users);
    ALTER TABLE public.quest_completions
      ADD CONSTRAINT fk_quest_completions_user_cascade
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_events_user_cascade') THEN
    DELETE FROM public.calendar_events WHERE user_id NOT IN (SELECT id FROM auth.users);
    ALTER TABLE public.calendar_events
      ADD CONSTRAINT fk_calendar_events_user_cascade
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 11. DSA Art. 16 Content Reporting & Moderation Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('hub_message', 'direct_message', 'resource', 'profile', 'tutor')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('copyright', 'harassment', 'spam', 'inappropriate', 'misinformation', 'other')),
  details text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.content_reports;
CREATE POLICY "Authenticated users can submit reports"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own reports" ON public.content_reports;
CREATE POLICY "Users can view own reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can moderate reports" ON public.content_reports;
CREATE POLICY "Admins can moderate reports"
  ON public.content_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
