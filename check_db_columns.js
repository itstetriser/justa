const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cyucfgpssaljhhoyvybd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dWNmZ3Bzc2Fsamhob3l2eWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MzA4NDEsImV4cCI6MjA4MjQwNjg0MX0.kHIVno90kZyvLitqIGRBtAgc9lD00k85Of1czUpDoCk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
    console.log('Fetching one question...');

    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
        console.log('One record:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No questions found.');
    }
}

checkColumns();
