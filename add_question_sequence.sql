-- Add column to store the ordered list of question IDs
ALTER TABLE public.challenge_rooms 
ADD COLUMN IF NOT EXISTS question_sequence JSONB;

-- Update RLS to ensure this column can be updated by participants
-- (Existing policy "Participants can update challenge rooms" should cover it as it checks for host_id/guest_id)
