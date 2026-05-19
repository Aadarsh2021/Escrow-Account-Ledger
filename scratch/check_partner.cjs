const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const targetUserId = '9a5e92ee-c6b1-49de-9126-f86488da58ac';
    
    // Find the unmatched transaction details
    const tnsRes = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.15299e8e-7a90-46c0-b6f2-339ce4073fd0&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const tns = await tnsRes.json();
    console.log('Unmatched transaction:', tns);

    // Let's search for any transaction created around the same second or millisecond!
    const time = new Date('2026-05-19T10:50:00.185547+00:00').getTime();
    
    const allTnsRes = await fetch(`${supabaseUrl}/rest/v1/transactions?user_id=eq.${targetUserId}&select=*,parties(party_name)`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const allTns = await allTnsRes.json();
    
    console.log('\nTransactions created within 10 seconds of 10:50:00:');
    const closeTns = allTns.filter(t => {
      const tTime = new Date(t.created_at || t.transaction_date).getTime();
      return Math.abs(tTime - time) < 10000;
    });
    console.table(closeTns.map(t => ({
      id: t.id,
      party: t.parties?.party_name,
      credit: t.credit,
      debit: t.debit,
      created_at: t.created_at,
      linked: t.linked_transaction_id
    })));

  } catch (err) {
    console.error(err);
  }
}
run();
