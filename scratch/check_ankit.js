import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnkit() {
  const ankitId = '9a5e92ee-c6b1-49de-9126-f86488da58ac';
  console.log(`Fetching parties for Ankit Kumar (ID: ${ankitId})...`);
  const { data, error } = await supabase.from('parties').select('*').eq('user_id', ankitId);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} parties:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

checkAnkit();
