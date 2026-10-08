-- Set both users as owner
DELETE FROM public.user_roles WHERE user_id IN ('b4772f23-b001-40d8-8ea9-01d75e6ff28a', '2527c174-c08e-44d7-9f53-89020889619a');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('b4772f23-b001-40d8-8ea9-01d75e6ff28a', 'owner'),
  ('2527c174-c08e-44d7-9f53-89020889619a', 'owner');

-- Update has_role so owners inherit admin+moderator powers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR (role = 'owner' AND _role IN ('admin', 'moderator')))
  )
$$;

-- Only owners can manage roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Owners can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
);