-- Create challenge_rooms table
DROP TABLE IF EXISTS public.challenge_rooms CASCADE;
CREATE TABLE public.challenge_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    code TEXT NOT NULL UNIQUE, -- 6 character code
    host_id UUID NOT NULL REFERENCES public.profiles(id),
    guest_id UUID REFERENCES public.profiles(id), -- Null initially
    status TEXT DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'PLAYING', 'FINISHED', 'CANCELED')),
    settings JSONB DEFAULT '{}'::jsonb, -- Store question_count, time_limit, level, etc.
    host_score INT DEFAULT 0,
    guest_score INT DEFAULT 0,
    winner_id UUID -- populated at end
);

-- Index for faster lookups by code
CREATE INDEX IF NOT EXISTS idx_challenge_code ON public.challenge_rooms(code);

-- Enable RLS
ALTER TABLE public.challenge_rooms ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Read: Public can read rooms if they know the code (to join) or if they are participants
CREATE POLICY "Challenge rooms are viewable by participants or by code" ON public.challenge_rooms
    FOR SELECT
    USING (
        auth.uid() = host_id OR 
        auth.uid() = guest_id OR
        (guest_id IS NULL AND status = 'WAITING') -- Allow potential guests to query by code
    );

-- 2. Insert: Authenticated users can create rooms
CREATE POLICY "Users can create challenge rooms" ON public.challenge_rooms
    FOR INSERT
    WITH CHECK (auth.uid() = host_id);

-- 3. Update: Participants can update (e.g., guest joining, scores updating)
CREATE POLICY "Participants can update challenge rooms" ON public.challenge_rooms
    FOR UPDATE
    USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Realtime needs to be enabled for this table to listen for changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_rooms;
