import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdm16Y3NocGdmdGxiamRtdnRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODgxNzI3OCwiZXhwIjoyMDk0MzkzMjc4fQ.BBEXYvRXJ3zHz5eGM44dTIt5vZLFPJeLb8AXpRwqBcE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUserParties() {
  console.log('Searching for user thakuraadarsh1@gmail.com...');

  // Get user ID from profiles or auth.users
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', '%thakuraadarsh1@gmail.com%');

  let userId = profiles?.[0]?.id;

  if (!userId) {
    // Try querying auth.users via admin RPC or service role listUsers if available
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (!usersErr && usersData?.users) {
      const targetUser = usersData.users.find(u => u.email?.toLowerCase() === 'thakuraadarsh1@gmail.com');
      if (targetUser) {
        userId = targetUser.id;
      }
    }
  }

  console.log('Found User ID:', userId || 'None');

  if (!userId) {
    console.log('User not found. Listing all profiles...');
    const { data: allProfiles } = await supabase.from('profiles').select('id, email, full_name, company_name');
    console.log(allProfiles);
    return;
  }

  // Fetch all parties for this user
  const { data: parties, error: partiesErr } = await supabase
    .from('parties')
    .select('*')
    .eq('user_id', userId)
    .order('sr_no', { ascending: true });

  if (partiesErr) {
    console.error('Error fetching parties:', partiesErr);
    return;
  }

  console.log(`Found ${parties.length} parties for user:`);

  const withCommission = [];
  const withoutCommission = [];
  const systemParties = [];

  parties.forEach(p => {
    if (p.system_type !== 'normal') {
      systemParties.push(p);
    } else if (p.commission_rate && Number(p.commission_rate) > 0) {
      withCommission.push(p);
    } else {
      withoutCommission.push(p);
    }
  });

  console.log('\n========================================');
  console.log(`PARTIES WITH COMMISSION (> 0%): ${withCommission.length}`);
  console.log('========================================');
  withCommission.forEach(p => {
    console.log(`SR: ${p.sr_no} | Name: ${p.party_name} | Rate: ${p.commission_rate}% | Status: ${p.status}`);
  });

  console.log('\n========================================');
  console.log(`PARTIES WITHOUT COMMISSION (0% or Null): ${withoutCommission.length}`);
  console.log('========================================');
  withoutCommission.forEach(p => {
    console.log(`SR: ${p.sr_no} | Name: ${p.party_name} | Rate: ${p.commission_rate || 0}% | Status: ${p.status}`);
  });

  console.log('\n========================================');
  console.log(`SYSTEM PARTIES (Commission/Company A/C): ${systemParties.length}`);
  console.log('========================================');
  systemParties.forEach(p => {
    console.log(`SR: ${p.sr_no} | Name: ${p.party_name} | Type: ${p.system_type}`);
  });
}

checkUserParties();
