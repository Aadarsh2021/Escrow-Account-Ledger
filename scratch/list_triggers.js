import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Query ALL triggers on transactions and parties tables
  const { data, error } = await supabase.rpc('get_all_triggers');
  if (error) {
    // Fallback: raw SQL via a custom approach
    console.log('RPC not available, trying direct query...');
    const { data: d2, error: e2 } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table, event_manipulation, action_timing')
      .in('event_object_table', ['transactions', 'parties']);
    console.log(d2, e2);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
main();
