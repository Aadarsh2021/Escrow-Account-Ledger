import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: parties, error } = await supabase
    .from('parties')
    .select('*');
  if (error) {
    console.error(error);
    return;
  }
  console.log(JSON.stringify(parties, null, 2));
}
main();
