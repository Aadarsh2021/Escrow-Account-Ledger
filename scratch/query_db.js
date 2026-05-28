import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdm16Y3NocGdmdGxiamRtdnRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODgxNzI3OCwiZXhwIjoyMDk0MzkzMjc4fQ.BBEXYvRXJ3zHz5eGM44dTIt5vZLFPJeLb8AXpRwqBcE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    console.log('--- Fetching Database Object Sizes via get_db_sizes() RPC ---');
    const { data, error } = await supabase.rpc('get_db_sizes');
    if (error) {
      console.error('Error executing RPC get_db_sizes:', error.message);
      console.log('\nMake sure you have executed the helper SQL block in your Supabase SQL Editor first!');
      return;
    }

    console.log('\n%-12s | %-30s | %-12s | %-12s | %-12s | %-12s'.replace(/%/g, ''));
    console.log('-----------------------------------------------------------------------------------------------------');
    
    // Sort by size bytes descending
    const sorted = [...(data || [])].sort((a, b) => b.total_size_bytes - a.total_size_bytes);
    
    for (const obj of sorted) {
      console.log(
        `${obj.schema_name.padEnd(12)} | ${obj.object_name.padEnd(30)} | ${obj.object_type.padEnd(12)} | ${obj.total_size.padStart(12)} | ${obj.data_size.padStart(12)} | ${obj.index_size.padStart(12)}`
      );
    }
  } catch (err) {
    console.error(err);
  }
}

main();
