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
    .eq('user_id', '9a5e92ee-c6b1-49de-9126-f86488da58ac')
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(JSON.stringify(tns.map(t => ({
    id: t.id,
    party: t.parties?.party_name,
    system_type: t.parties?.system_type,
    date: t.transaction_date,
    remarks: t.remarks,
    credit: t.credit,
    debit: t.debit,
    balance: t.balance,
    linked_id: t.linked_transaction_id
  })), null, 2));
}
main();
