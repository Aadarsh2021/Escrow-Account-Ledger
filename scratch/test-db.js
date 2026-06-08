import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    console.log('Fetching last 10 transactions...');
    const { data: tns, error } = await supabase
      .from('transactions')
      .select('id, remarks, credit, debit, is_checked, is_finalized, party_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log('Last 10 transactions:');
    console.table(tns);

    if (tns && tns.length > 0) {
      const firstTns = tns[0];
      console.log(`\nAttempting to toggle is_checked for transaction ${firstTns.id} from ${firstTns.is_checked} to ${!firstTns.is_checked}...`);
      const { data: updated, error: updateErr } = await supabase
        .from('transactions')
        .update({ is_checked: !firstTns.is_checked })
        .eq('id', firstTns.id)
        .select();

      if (updateErr) throw updateErr;

      console.log('Update result:');
      console.table(updated);
    }
  } catch (err) {
    console.error('Error running test script:', err);
  }
}

run();
