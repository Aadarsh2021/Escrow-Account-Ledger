import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNulls() {
  console.log('Fetching all parties...');
  const { data, error } = await supabase.from('parties').select('*');
  if (error) {
    console.error('Error fetching parties:', error);
    return;
  }
  console.log(`Checking ${data.length} parties for null values...`);
  data.forEach((p, idx) => {
    if (!p.party_name) {
      console.log(`[!] Party at index ${idx} has null/missing party_name! ID: ${p.id}, User ID: ${p.user_id}`);
    }
    if (!p.sr_no) {
      console.log(`[!] Party at index ${idx} has null/missing sr_no! ID: ${p.id}, User ID: ${p.user_id}`);
    }
  });
  console.log('Check complete.');
}

checkNulls();
