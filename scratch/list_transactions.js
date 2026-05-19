import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const userId = 'd25083e1-1b6a-4675-ad3e-c9a2549ba7d7'; // thakuraadarsh1@gmail.com
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);
    
  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log(`Fetched ${data.length} transactions for user:`);
    data.forEach(t => {
      console.log(`ID: ${t.id}, is_settlement: ${t.is_settlement}, is_finalized: ${t.is_finalized}, credit: ${t.credit}, debit: ${t.debit}, remarks: ${t.remarks}`);
    });
  }
}

main().catch(console.error);
