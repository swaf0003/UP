-- Allow users to delete their own sent messages (DMs)
CREATE POLICY "Users can delete own sent messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- Allow users to delete their own sent hub messages
CREATE POLICY "Users can delete own hub messages"
ON public.hub_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);