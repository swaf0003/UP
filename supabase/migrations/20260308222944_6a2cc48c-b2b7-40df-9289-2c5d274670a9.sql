
-- Create resources storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true);

-- Storage policies for resources bucket
CREATE POLICY "Admins can upload resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Everyone can view resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resources');

CREATE POLICY "Admins can delete resources"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Add file_url column to resources for uploaded files (separate from external url)
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.resources ALTER COLUMN url SET DEFAULT '';
