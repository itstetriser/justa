-- Add current_level to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_level text DEFAULT 'A1';

-- Update RLS if needed (already allows update of own profile)
-- Policy: "Users can update own profile." on public.profiles for update using ( auth.uid() = id );
-- This covers the new column automatically.
