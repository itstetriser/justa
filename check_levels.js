const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cyucfgpssaljhhoyvybd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dWNmZ3Bzc2Fsamhob3l2eWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MzA4NDEsImV4cCI6MjA4MjQwNjg0MX0.kHIVno90kZyvLitqIGRBtAgc9lD00k85Of1czUpDoCk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLevels() {
    console.log('Checking Question Levels...');

    const { data, error } = await supabase
        .from('questions')
        .select('level');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const counts = {};
    data.forEach(q => {
        counts[q.level] = (counts[q.level] || 0) + 1;
    });

    console.log('Question Counts by Level:', counts);
}

checkLevels();
