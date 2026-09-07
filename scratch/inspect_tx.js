import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspectTx() {
  const { data, error } = await supabase.from('transactions').select('*').limit(1);
  if (error) {
    console.error(error);
    return;
  }
  console.log('Transaction columns:', Object.keys(data[0]));
  console.log('Sample row:', data[0]);
}

inspectTx();
