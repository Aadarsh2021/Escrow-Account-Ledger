import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: tns, error } = await supabase
    .from('transactions')
    .select('*, parties(party_name, system_type)')
    .eq('party_id', '8ff479dc-bb02-4d1d-b345-07a29f3fecdf')
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error(error);
    return;
  }
  
  // For each transaction, get the partner name by querying the transaction linked to it
  const formatted = [];
  for (const t of tns) {
    let partner_name = '-';
    if (t.linked_transaction_id) {
      const { data: pData } = await supabase
        .from('transactions')
        .select('parties(party_name, system_type)')
        .eq('linked_transaction_id', t.linked_transaction_id)
        .neq('party_id', t.party_id);
      
      const realPartner = pData?.find((p) => p.parties?.system_type !== 'commission') || pData?.[0];
      partner_name = realPartner?.parties?.party_name || 'System';
    }
    
    formatted.push({
      id: t.id,
      date: t.transaction_date,
      remarks: t.remarks,
      credit: t.credit,
      debit: t.debit,
      balance: t.balance,
      partner_name: partner_name,
      is_settlement: t.is_settlement
    });
  }
  
  console.log(JSON.stringify(formatted, null, 2));
}
main();
