const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cyucfgpssaljhhoyvybd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dWNmZ3Bzc2Fsamhob3l2eWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MzA4NDEsImV4cCI6MjA4MjQwNjg0MX0.kHIVno90kZyvLitqIGRBtAgc9lD00k85Of1czUpDoCk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyQuestions() {
  const questionIds = [
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', // A2 Bus
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', // C2 Supporters
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'  // C2 Trial
  ];

  console.log('Checking for new questions...');

  const { data, error } = await supabase
    .from('questions')
    .select(`
      id,
      level,
      category,
      sentence_en,
      words (
        word_text,
        is_correct
      )
    `)
    .in('id', questionIds);

  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No questions found. Did you run the SQL script in Supabase?');
    return;
  }

  console.log(`Found ${data.length} questions:\n`);

  data.forEach(q => {
    console.log(`✅ [${q.level}] ${q.category}: ${q.sentence_en}`);
    console.log(`   Options: ${q.words.map(w => w.word_text + (w.is_correct ? ' (Correct)' : '')).join(', ')}`);
    console.log('---');
  });
}

verifyQuestions();
