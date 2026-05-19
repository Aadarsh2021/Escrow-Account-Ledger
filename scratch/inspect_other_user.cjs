const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const targetUserId = '9a5e92ee-c6b1-49de-9126-f86488da58ac';
    
    // 1. Fetch user profile
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${targetUserId}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const profile = await profileRes.json();
    console.log('=== OTHER USER PROFILE ===');
    console.log(profile);

    // 2. Fetch parties
    const partiesRes = await fetch(`${supabaseUrl}/rest/v1/parties?user_id=eq.${targetUserId}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const parties = await partiesRes.json();
    console.log('\n=== OTHER USER PARTIES ===');
    console.table(parties.map(p => ({
      id: p.id,
      name: p.party_name,
      status: p.status,
      system_type: p.system_type,
      commission_type: p.commission_type,
      commission_rate: p.commission_rate
    })));

    // 3. Fetch transactions
    const tnsRes = await fetch(`${supabaseUrl}/rest/v1/transactions?user_id=eq.${targetUserId}&select=*,parties(party_name)&order=transaction_date.asc`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const transactions = await tnsRes.json();
    console.log('\n=== OTHER USER TRANSACTIONS ===');
    console.table(transactions.map(t => ({
      id: t.id,
      date: t.transaction_date,
      party: t.parties?.party_name || 'Unknown',
      remarks: t.remarks,
      type: t.tns_type,
      credit: t.credit,
      debit: t.debit,
      balance: t.balance,
      is_settlement: t.is_settlement
    })));
  } catch (err) {
    console.error(err);
  }
}
run();
