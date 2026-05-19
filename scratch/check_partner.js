import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  const vipulId = '1f4220b9-f091-4b1e-b0df-da8b6f33a11e';
  
  // 1. Fetch active transactions for VIPUL
  const { data: currentTns } = await supabase
    .from('transactions')
    .select('*')
    .eq('party_id', vipulId)
    .neq('is_finalized', true)
    .order('transaction_date', { ascending: true });

  console.log(`Active transactions for VIPUL: ${currentTns.length}`);
  
  const linkedIds = currentTns.map(t => t.linked_transaction_id).filter(Boolean);
  console.log(`Linked IDs:`, linkedIds);

  if (linkedIds.length > 0) {
    const { data: partnerData, error: err } = await supabase
      .from('transactions')
      .select('linked_transaction_id, party_id, parties(party_name)')
      .in('linked_transaction_id', linkedIds)
      .neq('party_id', vipulId);

    console.log(`Partner Data fetch result:`, partnerData);
    if (err) console.error("Error fetching partnerData:", err);
  }
}

main();
