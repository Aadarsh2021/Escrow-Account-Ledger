import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // Fetch transactions for VIPUL
  const { data: tns, error } = await supabase
    .from('transactions')
    .select('*, parties(party_name, system_type)')
    .eq('party_id', '1f4220b9-f091-4b1e-b0df-da8b6f33a11e')
    .order('transaction_date', { ascending: true })
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error(error);
    return;
  }
  
  // Also get the partner names
  const linkedIds = tns.map(t => t.linked_transaction_id).filter(Boolean);
  const { data: partners } = await supabase
    .from('transactions')
    .select('linked_transaction_id, party_id, parties(party_name, system_type)')
    .in('linked_transaction_id', linkedIds)
    .neq('party_id', '1f4220b9-f091-4b1e-b0df-da8b6f33a11e');
    
  const partnerMap = new Map();
  partners?.forEach(p => {
    partnerMap.set(p.linked_transaction_id, p.parties?.party_name);
  });
  
  const result = tns.map(t => ({
    date: t.transaction_date,
    remarks: t.remarks,
    credit: t.credit,
    debit: t.debit,
    balance: t.balance,
    partner: partnerMap.get(t.linked_transaction_id)
  }));
  
  console.log(JSON.stringify(result, null, 2));
}
main();
