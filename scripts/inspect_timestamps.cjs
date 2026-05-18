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

async function inspectTimestamps() {
  const { data: tns, error } = await supabase
    .from('transactions')
    .select('id, party_id, remarks, created_at, is_settlement, parties(party_name)')
    .eq('remarks', 'MONDAY FINAL SETTLEMENT');
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Monday Final Settlement Timestamps:');
  console.table(tns.map(t => ({
    id: t.id,
    party: t.parties?.party_name,
    remarks: t.remarks,
    created_at: t.created_at
  })));
}

inspectTimestamps();
