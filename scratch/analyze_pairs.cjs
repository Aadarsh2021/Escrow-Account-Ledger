const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const targetUserId = '9a5e92ee-c6b1-49de-9126-f86488da58ac';
    
    // 1. Fetch parties
    const partiesRes = await fetch(`${supabaseUrl}/rest/v1/parties?user_id=eq.${targetUserId}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const parties = await partiesRes.json();
    const partyMap = new Map(parties.map(p => [p.id, p]));

    // 2. Fetch transactions (all)
    const tnsRes = await fetch(`${supabaseUrl}/rest/v1/transactions?user_id=eq.${targetUserId}&select=*&order=transaction_date.asc`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const transactions = await tnsRes.json();

    // 3. Group by linked_transaction_id
    const groups = new Map();
    transactions.forEach(t => {
      if (t.is_settlement) return; // Skip settlements
      const lid = t.linked_transaction_id || t.id;
      if (!groups.has(lid)) {
        groups.set(lid, []);
      }
      groups.get(lid).push(t);
    });

    console.log('=== TRANSACTION PAIRS ANALYSIS ===');
    let totalUnmatched = 0;
    for (const [lid, tns] of groups.entries()) {
      if (tns.length !== 2) {
        totalUnmatched++;
        console.log(`Unmatched or multi-linked transaction ID: ${lid}`);
        tns.forEach(t => {
          console.log(`  - Party: ${partyMap.get(t.party_id)?.party_name}, Type: ${t.tns_type}, Credit: ${t.credit}, Debit: ${t.debit}, Remarks: "${t.remarks}", Date: ${t.transaction_date}`);
        });
      } else {
        const [t1, t2] = tns;
        const amt1 = t1.credit > 0 ? t1.credit : t1.debit;
        const amt2 = t2.credit > 0 ? t2.credit : t2.debit;
        if (amt1 !== amt2) {
          console.log(`Amount mismatch in pair ${lid}:`);
          console.log(`  - ${partyMap.get(t1.party_id)?.party_name}: ${t1.tns_type} ${amt1}`);
          console.log(`  - ${partyMap.get(t2.party_id)?.party_name}: ${t2.tns_type} ${amt2}`);
        }
        if (t1.tns_type === t2.tns_type) {
          console.log(`Same type in pair ${lid}:`);
          console.log(`  - ${partyMap.get(t1.party_id)?.party_name}: ${t1.tns_type}`);
          console.log(`  - ${partyMap.get(t2.party_id)?.party_name}: ${t2.tns_type}`);
        }
      }
    }
    console.log(`Total unmatched/odd groups: ${totalUnmatched}`);

  } catch (err) {
    console.error(err);
  }
}
run();
