
-- Create voice-messages storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload voice messages
CREATE POLICY "Users can upload voice messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their voice messages
CREATE POLICY "Users can delete own voice messages"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-messages' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can listen to voice messages (public bucket)
CREATE POLICY "Anyone can listen to voice messages"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-messages');

-- Add message_type column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS voice_url text DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS voice_duration numeric DEFAULT NULL;
