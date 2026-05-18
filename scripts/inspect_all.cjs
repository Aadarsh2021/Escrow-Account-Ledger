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

async function inspectAllTransactions() {
  console.log('Fetching all transactions from DB...');
  const { data: tns, error } = await supabase
    .from('transactions')
    .select('id, party_id, remarks, is_finalized, is_settlement, linked_transaction_id, parties(party_name)');
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.table(tns.map(t => ({
    id: t.id,
    party: t.parties?.party_name,
    remarks: t.remarks,
    is_finalized: t.is_finalized,
    is_settlement: t.is_settlement,
    linked_transaction_id: t.linked_transaction_id
  })));
}

inspectAllTransactions();
