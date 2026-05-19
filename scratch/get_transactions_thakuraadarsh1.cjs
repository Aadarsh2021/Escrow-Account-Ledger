const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const targetUserId = 'd25083e1-1b6a-4675-ad3e-c9a2549ba7d7';
    
    // Fetch parties first to map names
    const partiesRes = await fetch(`${supabaseUrl}/rest/v1/parties?user_id=eq.${targetUserId}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const parties = await partiesRes.json();
    const partyMap = {};
    parties.forEach(p => {
      partyMap[p.id] = p.party_name;
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/transactions?user_id=eq.${targetUserId}&select=*&order=transaction_date.asc,created_at.asc`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const transactions = await res.json();
    console.log("=== TRANSACTIONS FOR thakuraadarsh1@gmail.com ===");
    console.table(transactions.map(t => ({
      date: t.transaction_date,
      party: partyMap[t.party_id] || t.party_id,
      remarks: t.remarks,
      credit: t.credit,
      debit: t.debit,
      balance: t.balance,
      is_finalized: t.is_finalized,
      is_settlement: t.is_settlement,
      linked_id: t.linked_transaction_id ? t.linked_transaction_id.slice(0, 8) : null
    })));
  } catch (err) {
    console.error(err);
  }
}
run();
