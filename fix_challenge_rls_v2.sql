-- Drop policies again to be sure
DROP POLICY IF EXISTS "Participants can update challenge rooms" ON public.challenge_rooms;

-- Update: Split USING and WITH CHECK
CREATE POLICY "Participants can update challenge rooms" ON public.challenge_rooms
    FOR UPDATE
    USING (
        auth.uid() = host_id OR 
        auth.uid() = guest_id OR
        (status = 'WAITING' AND guest_id IS NULL)
    )
    WITH CHECK (
        auth.uid() = host_id OR 
        auth.uid() = guest_id 
        -- Note: We don't check for WAITING/NULL here because after update, guest_id is set.
    );
