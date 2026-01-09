-- Add columns to track if participants have finished
ALTER TABLE public.challenge_rooms 
ADD COLUMN IF NOT EXISTS host_finished BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guest_finished BOOLEAN DEFAULT FALSE;

-- Allow updates (covered by existing policy, but good to be aware)
