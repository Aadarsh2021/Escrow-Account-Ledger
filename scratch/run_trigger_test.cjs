const { createClient } = require('c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/node_modules/@supabase/supabase-js');
const dotenv = require('c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/node_modules/dotenv');
const crypto = require('crypto');

// Load .env from root workspace directory
dotenv.config({ path: 'c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTriggerTest() {
  const testId = crypto.randomUUID();
  const testEmail = `test_diag_${Math.floor(Math.random() * 100000)}@gmail.com`;
  
  console.log(`--- CALLING test_trigger_logic FOR ID: ${testId} ---`);
  
  const { data, error } = await supabase.rpc('test_trigger_logic', {
    new_id: testId,
    new_email: testEmail,
    new_full_name: 'Diagnostic Test User',
    new_company_name: 'Diagnostic Company LLC'
  });

  if (error) {
    console.error('RPC Call Error:', error);
  } else {
    console.log('\n==================================================');
    console.log('DIAGNOSTIC RESULT:', data);
    console.log('==================================================\n');
    
    // Clean up if it succeeded
    if (data === 'ALL INSERTS SUCCEEDED!') {
      console.log('Cleaning up created rows...');
      await supabase.from('parties').delete().eq('user_id', testId);
      await supabase.from('profiles').delete().eq('id', testId);
      console.log('Clean up done.');
    }
  }
}

runTriggerTest();
