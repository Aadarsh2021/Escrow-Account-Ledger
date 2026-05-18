const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectLocked() {
  console.log('Fetching all transactions for Give and Take to check is_finalized status...');
  
  const { data: tns, error } = await supabase
    .from('transactions')
    .select('id, party_id, remarks, is_finalized, is_settlement, linked_transaction_id, parties(party_name)');
    
  if (error) {
    console.error(error);
    return;
  }
  
  const map = {};
  tns.forEach(t => {
    map[t.id] = t;
  });
  
  console.log('\n--- Link Analysis of Transactions ---');
  tns.forEach(t => {
    if (t.linked_transaction_id && t.linked_transaction_id !== t.id) {
      const partner = map[t.linked_transaction_id];
      console.log(`Tns ID: ${t.id} (${t.parties?.party_name}) - is_finalized: ${t.is_finalized}`);
      if (partner) {
        console.log(`  -> Linked to Partner ID: ${partner.id} (${partner.parties?.party_name}) - is_finalized: ${partner.is_finalized}`);
      } else {
        console.log(`  -> Linked to Partner ID: ${t.linked_transaction_id} (NOT FOUND in active/past records!)`);
      }
    }
  });
}

inspectLocked();
