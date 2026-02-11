
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cyucfgpssaljhhoyvybd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dWNmZ3Bzc2Fsamhob3l2eWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MzA4NDEsImV4cCI6MjA4MjQwNjg0MX0.kHIVno90kZyvLitqIGRBtAgc9lD00k85Of1czUpDoCk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRpc() {
    console.log("Testing get_user_stats...");
    // 1. Valid UUID (random)
    const validId = 'd0e3d23f-f90b-4107-8889-4b6848796541';

    // We need to sign in probably? 
    // The RPC has grants for anon, so it should work without auth if logic allows (it definitely uses p_user_id arg).
    // The function `get_user_stats` uses `p_user_id` argument, so it doesn't strictly depend on `auth.uid()` inside query.

    try {
        const { data, error } = await supabase.rpc('get_user_stats', { p_user_id: validId });
        if (error) {
            console.error("Error with valid UUID:", error);
        } else {
            console.log("Success with valid UUID:", data);
        }
    } catch (e) {
        console.error("Exception valid:", e);
    }

    // 2. Test with actual user ID from file if possible, or just note validity.
}

testRpc();
