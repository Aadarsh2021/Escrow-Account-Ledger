import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  const ankitId = '9a5e92ee-c6b1-49de-9126-f86488da58ac';
  console.log(`Fetching profile for user ID: ${ankitId}...`);
  const { data, error } = await supabase.from('profiles').select('*').eq('id', ankitId);
  if (error) {
    console.error('Error fetching profile:', error);
  } else {
    console.log('Profile details:', JSON.stringify(data, null, 2));
  }
}

checkProfiles();
