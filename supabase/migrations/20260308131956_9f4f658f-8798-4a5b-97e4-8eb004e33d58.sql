CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, gender, date_of_birth, university, faculty, academic_year)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'gender', ''),
    CASE WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL AND NEW.raw_user_meta_data->>'date_of_birth' != ''
         THEN (NEW.raw_user_meta_data->>'date_of_birth')::date
         ELSE NULL END,
    COALESCE(NEW.raw_user_meta_data->>'university', ''),
    COALESCE(NEW.raw_user_meta_data->>'faculty', ''),
    COALESCE(NEW.raw_user_meta_data->>'academic_year', '')
  );
  RETURN NEW;
END;
$$;

-- Backfill existing profiles from auth.users metadata
UPDATE public.profiles p
SET
  display_name = COALESCE(NULLIF(u.raw_user_meta_data->>'display_name', ''), p.display_name),
  gender = COALESCE(NULLIF(u.raw_user_meta_data->>'gender', ''), p.gender),
  university = COALESCE(NULLIF(u.raw_user_meta_data->>'university', ''), p.university),
  faculty = COALESCE(NULLIF(u.raw_user_meta_data->>'faculty', ''), p.faculty),
  academic_year = COALESCE(NULLIF(u.raw_user_meta_data->>'academic_year', ''), p.academic_year)
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.display_name = '' OR p.university = '' OR p.faculty = '' OR p.academic_year = '');