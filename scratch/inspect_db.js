import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  console.log("Fetching auth users...");
  const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) {
    console.error("Error listing users:", userErr);
  } else {
    console.log("Users:");
    users.forEach(u => console.log(`- ID: ${u.id}, Email: ${u.email}, Metadata:`, u.user_metadata));
  }

  console.log("\nFetching parties...");
  const { data: parties, error: partyErr } = await supabase.from('parties').select('*');
  if (partyErr) {
    console.error("Error listing parties:", partyErr);
  } else {
    console.log(`Parties (${parties.length}):`);
    parties.forEach(p => console.log(`- ID: ${p.id}, Name: ${p.party_name}, Status: ${p.status}, SystemType: ${p.system_type}, UserID: ${p.user_id}, SR NO: ${p.sr_no}, CommRate: ${p.commission_rate}`));
  }
}

main().catch(console.error);
