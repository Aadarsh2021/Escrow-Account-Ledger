import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const USER_ID = '9a5e92ee-c6b1-49de-9126-f86488da58ac';

async function main() {
  // 1. Transactions count
  const { count: tnsCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', USER_ID);

  // 2. Parties list with monday_final status
  const { data: parties } = await supabase
    .from('parties')
    .select('party_name, system_type, monday_final, status')
    .eq('user_id', USER_ID)
    .order('party_name');

  // 3. Profile info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name')
    .eq('id', USER_ID)
    .single();

  console.log('\n========== VERIFICATION REPORT ==========');
  console.log(`User: ${profile?.full_name} (${profile?.company_name})`);
  console.log(`User ID: ${USER_ID}`);
  console.log('-----------------------------------------');
  console.log(`✅ Total Transactions: ${tnsCount} (expected: 0)`);
  console.log('\nParties & their monday_final status:');
  parties?.forEach(p => {
    const flag = p.monday_final ? '🔴 monday_final=true (PROBLEM!)' : '✅ monday_final=false';
    console.log(`  - ${p.party_name} [${p.system_type}/${p.status}] → ${flag}`);
  });
  console.log('=========================================\n');
}
main();
