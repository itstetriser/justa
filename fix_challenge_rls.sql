-- Drop existing policies to be clean
DROP POLICY IF EXISTS "Challenge rooms are viewable by participants or by code" ON public.challenge_rooms;
DROP POLICY IF EXISTS "Users can create challenge rooms" ON public.challenge_rooms;
DROP POLICY IF EXISTS "Participants can update challenge rooms" ON public.challenge_rooms;

-- 1. Read: Public can read rooms if they know the code (to join) or if they are participants
CREATE POLICY "Challenge rooms are viewable by participants or by code" ON public.challenge_rooms
    FOR SELECT
    USING (
        auth.uid() = host_id OR 
        auth.uid() = guest_id OR
        (status = 'WAITING') -- Allow anyone to look up waiting rooms by code
    );

-- 2. Insert: Authenticated users can create rooms
CREATE POLICY "Users can create challenge rooms" ON public.challenge_rooms
    FOR INSERT
    WITH CHECK (auth.uid() = host_id);

-- 3. Update: Participants can update AND Guests can join
CREATE POLICY "Participants can update challenge rooms" ON public.challenge_rooms
    FOR UPDATE
    USING (
        auth.uid() = host_id OR 
        auth.uid() = guest_id OR
        (status = 'WAITING' AND guest_id IS NULL) -- Allow users to "Claim" the guest spot
    );
