import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env configuration from root .env
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const SUPABASE_URL = envConfig.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const USER_ID = 'd25083e1-1b6a-4675-ad3e-c9a2549ba7d7'; // thakuraadarsh1@gmail.com

async function deleteAllUserData() {
  console.log(`\n=== Deleting all data for user: thakuraadarsh1@gmail.com ===\n`);

  // First, list all transactions to see what we have
  const { data: allTx, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, is_settlement, is_finalized, tns_type, credit, debit, balance')
    .eq('user_id', USER_ID);
  
  if (fetchErr) {
    console.error('ERROR fetching transactions:', fetchErr.message);
    return;
  }

  console.log(`Found ${allTx?.length ?? 0} transactions:`);
  allTx?.forEach(t => {
    console.log(`  id=${t.id.slice(0,8)}... settlement=${t.is_settlement} finalized=${t.is_finalized} type=${t.tns_type} cr=${t.credit} dr=${t.debit}`);
  });
  
  // Try deleting in batches: non-settlement first, then settlement
  const ids = allTx?.map(t => t.id) ?? [];
  
  if (ids.length === 0) {
    console.log('No transactions found for this user.');
    return;
  }

  // Delete all at once by ID (bypassing RLS with service role)
  console.log(`\nAttempting to delete ${ids.length} transactions by ID...`);
  const { error: delErr } = await supabase
    .from('transactions')
    .delete()
    .in('id', ids);

  if (delErr) {
    console.error('ERROR:', delErr.message, delErr.details, delErr.hint);
    return;
  }
  console.log(`✅ Deleted all ${ids.length} transactions.`);

  // Now delete parties
  const { count: partyCount } = await supabase
    .from('parties')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', USER_ID);
  
  console.log(`Found ${partyCount ?? 0} parties to delete...`);

  const { error: partyErr } = await supabase
    .from('parties')
    .delete()
    .eq('user_id', USER_ID);

  if (partyErr) {
    console.error('ERROR deleting parties:', partyErr.message);
    return;
  }
  console.log(`✅ Deleted all parties.`);

  console.log('\n✅ All data for thakuraadarsh1@gmail.com has been cleaned up!');
}

deleteAllUserData().catch(console.error);
