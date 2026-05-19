import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Missing VITE_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  try {
    console.log("Fetching auth user...");
    // Since service role can query auth schema or profiles:
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Auth list users error:", userError);
    }
    
    const targetUser = users?.users?.find(u => u.email === 'ankitbihar5678@gmail.com');
    if (!targetUser) {
      console.log("User not found in auth.users list.");
      return;
    }
    console.log(`Found User: ${targetUser.email} (ID: ${targetUser.id})`);

    // Fetch parties
    const { data: parties, error: pError } = await supabase
      .from('parties')
      .select('*')
      .eq('user_id', targetUser.id);
    if (pError) throw pError;

    console.log(`\nParties list (${parties.length}):`);
    parties.forEach(p => {
      console.log(`- ID: ${p.id} | Name: ${p.party_name} | SR: ${p.sr_no} | Status: ${p.status} | Monday Final: ${p.monday_final} | System Type: ${p.system_type}`);
    });

    // Fetch transactions
    const { data: tns, error: tnsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', targetUser.id)
      .order('created_at', { ascending: true });
    if (tnsError) throw tnsError;

    console.log(`\nTransactions count: ${tns.length}`);
    const partyMap = new Map(parties.map(p => [p.id, p.party_name]));

    tns.forEach(t => {
      const pName = partyMap.get(t.party_id) || 'Unknown';
      console.log(`ID: ${t.id} | Party: ${pName} (${t.party_id}) | Remarks: ${t.remarks} | Type: ${t.tns_type} | Credit: ${t.credit} | Debit: ${t.debit} | Balance: ${t.balance} | Finalized: ${t.is_finalized} | Settlement: ${t.is_settlement} | Linked ID: ${t.linked_transaction_id}`);
    });

  } catch (error) {
    console.error("Error in script:", error);
  }
}

main();
