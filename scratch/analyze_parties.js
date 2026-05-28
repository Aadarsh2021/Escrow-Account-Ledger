import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Service role key bypasses RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
  console.log('Fetching all parties using service role key...');
  const { data: parties, error: pError } = await supabase.from('parties').select('*');
  if (pError) {
    console.error('Error fetching parties:', pError);
    return;
  }
  console.log(`Total parties in database: ${parties.length}`);

  // Count parties per user_id
  const userCounts = {};
  parties.forEach(p => {
    userCounts[p.user_id] = (userCounts[p.user_id] || 0) + 1;
  });
  console.log('Parties count per user_id:', userCounts);

  // Fetch users from auth to map user_id to email/metadata
  console.log('Fetching users from auth...');
  const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
  if (uError) {
    console.error('Error fetching auth users:', uError);
  } else {
    console.log(`Found ${users.length} users in auth.`);
    users.forEach(u => {
      console.log(`User ID: ${u.id} | Email: ${u.email} | Name: ${u.user_metadata?.full_name || 'N/A'} | Parties Count: ${userCounts[u.id] || 0}`);
    });
  }
}

analyze();
