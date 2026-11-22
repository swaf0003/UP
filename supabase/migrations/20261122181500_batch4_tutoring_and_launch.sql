-- =============================================================================
-- Union Project (UP) — Batch 4: Tutoring Marketplace MVP, Persistent Favorites,
-- Student Resource Submissions & Real resource_id FK on Hub Messages
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Real resource_id FK on hub_messages (replaces spoofable text tags)
-- -----------------------------------------------------------------------------
ALTER TABLE public.hub_messages
  ADD COLUMN IF NOT EXISTS resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hub_messages_resource_id ON public.hub_messages(resource_id) WHERE resource_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Persistent Favorites (user_favorites)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own favorites" ON public.user_favorites;
CREATE POLICY "Users manage own favorites"
  ON public.user_favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. Student Resource Submissions + Moderation Status on resources
-- -----------------------------------------------------------------------------
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_work_certified boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Students can submit pending original resources" ON public.resources;
CREATE POLICY "Students can submit pending original resources"
  ON public.resources FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by
    AND status = 'pending'
    AND original_work_certified = true
  );

-- -----------------------------------------------------------------------------
-- 4. Tutoring Marketplace MVP (Stripe Connect Ready, Zero Client Tampering)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tutor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id text NOT NULL,
  faculty text NOT NULL,
  academic_year text NOT NULL,
  bio text NOT NULL DEFAULT '',
  courses text[] NOT NULL DEFAULT '{}',
  hourly_rate_cents integer NOT NULL CHECK (hourly_rate_cents >= 1000 AND hourly_rate_cents <= 15000),
  mode text NOT NULL DEFAULT 'both' CHECK (mode IN ('online', 'campus', 'both')),
  campus_location text DEFAULT '',
  verified_tutor boolean NOT NULL DEFAULT false,
  verified_grade_note text DEFAULT '',
  rating_avg numeric(3,2) NOT NULL DEFAULT 0.00,
  review_count integer NOT NULL DEFAULT 0,
  stripe_account_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active tutors" ON public.tutor_profiles;
CREATE POLICY "Authenticated users can view active tutors"
  ON public.tutor_profiles FOR SELECT TO authenticated
  USING (is_active = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Tutors can update own profile" ON public.tutor_profiles;
CREATE POLICY "Tutors can update own profile"
  ON public.tutor_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Guard trigger: prevent clients from self-verifying or tampering with rating/stripe_account_id
CREATE OR REPLACE FUNCTION public.guard_tutor_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.verified_tutor := OLD.verified_tutor;
    NEW.verified_grade_note := OLD.verified_grade_note;
    NEW.rating_avg := OLD.rating_avg;
    NEW.review_count := OLD.review_count;
    NEW.stripe_account_id := OLD.stripe_account_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_tutor_profile_updates ON public.tutor_profiles;
CREATE TRIGGER trg_guard_tutor_profile_updates
  BEFORE UPDATE ON public.tutor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_tutor_profile_updates();

-- Tutor Applications (reviewed by Admin)
CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id text NOT NULL,
  faculty text NOT NULL,
  academic_year text NOT NULL,
  courses text[] NOT NULL DEFAULT '{}',
  hourly_rate_cents integer NOT NULL CHECK (hourly_rate_cents >= 1000 AND hourly_rate_cents <= 15000),
  mode text NOT NULL DEFAULT 'both' CHECK (mode IN ('online', 'campus', 'both')),
  campus_location text DEFAULT '',
  motivation text NOT NULL,
  grade_proof_note text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit own tutor application" ON public.tutor_applications;
CREATE POLICY "Users can submit own tutor application"
  ON public.tutor_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users and admins can view tutor applications" ON public.tutor_applications;
CREATE POLICY "Users and admins can view tutor applications"
  ON public.tutor_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can review tutor applications" ON public.tutor_applications;
CREATE POLICY "Admins can review tutor applications"
  ON public.tutor_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tutor Bookings (server-calculated 15% platform commission, Stripe Connect ready)
CREATE TABLE IF NOT EXISTS public.tutor_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  course_code text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes IN (60, 90, 120)),
  mode text NOT NULL CHECK (mode IN ('online', 'campus')),
  notes text DEFAULT '',
  hourly_rate_cents integer NOT NULL,
  fee_bps integer NOT NULL DEFAULT 1500 CHECK (fee_bps BETWEEN 1000 AND 2000),
  total_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending_payment'
    CHECK (payment_status IN ('pending_payment', 'paid', 'completed', 'cancelled', 'refunded')),
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view own bookings" ON public.tutor_bookings;
CREATE POLICY "Participants can view own bookings"
  ON public.tutor_bookings FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM public.tutor_profiles tp WHERE tp.id = tutor_bookings.tutor_id AND tp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Students can create bookings" ON public.tutor_bookings;
CREATE POLICY "Students can create bookings"
  ON public.tutor_bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND payment_status = 'pending_payment');

-- Server-side pricing & commission integrity trigger (prevents client price/fee/payment_status tampering)
CREATE OR REPLACE FUNCTION public.compute_tutor_booking_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate integer;
  v_tutor_user uuid;
BEGIN
  SELECT hourly_rate_cents, user_id INTO v_rate, v_tutor_user
  FROM public.tutor_profiles
  WHERE id = NEW.tutor_id AND is_active = true;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'Tuteur introuvable ou inactif.';
  END IF;

  IF v_tutor_user = NEW.student_id THEN
    RAISE EXCEPTION 'Tu ne peux pas réserver ta propre séance.';
  END IF;

  NEW.hourly_rate_cents := v_rate;
  NEW.fee_bps := 1500; -- Fixed 15% platform fee server-side
  NEW.total_cents := ROUND((v_rate::numeric * NEW.duration_minutes) / 60.0);
  NEW.platform_fee_cents := ROUND((NEW.total_cents::numeric * NEW.fee_bps) / 10000.0);
  NEW.payment_status := 'pending_payment';
  NEW.stripe_payment_intent_id := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_tutor_booking_pricing ON public.tutor_bookings;
CREATE TRIGGER trg_compute_tutor_booking_pricing
  BEFORE INSERT ON public.tutor_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_tutor_booking_pricing();
