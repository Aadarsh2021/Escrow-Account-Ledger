const { createClient } = require('c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/node_modules/@supabase/supabase-js');
const dotenv = require('c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/node_modules/dotenv');

// Load .env from root workspace directory
dotenv.config({ path: 'c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfileInsert() {
  console.log('--- TESTING DIRECT INSERT INTO profiles ---');
  
  const testId = '00000000-0000-0000-0000-000000000001';
  
  // Try inserting a profile exactly like the handle_new_user trigger does
  const { data, error } = await supabase.from('profiles').insert({
    id: testId,
    full_name: 'Test Full Name',
    company_name: 'Test Company',
    company_email: 'test@company.com'
  }).select();

  if (error) {
    console.error('Insert Error details:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
  } else {
    console.log('Insert Succeeded!', data);
    // Delete the test profile to clean up
    await supabase.from('profiles').delete().eq('id', testId);
    console.log('Cleaned up test profile.');
  }
}

testProfileInsert();
