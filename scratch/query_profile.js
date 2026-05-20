import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', '9a5e92ee-c6b1-49de-9126-f86488da58ac')
    .single();
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(JSON.stringify(profile, null, 2));
}
main();
