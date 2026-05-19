const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    // 1. Fetch all profiles to map user_ids
    const profilesRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const profiles = await profilesRes.json();
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // 2. Fetch all parties
    const partiesRes = await fetch(`${supabaseUrl}/rest/v1/parties?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const parties = await partiesRes.json();
    const partyMap = new Map(parties.map(p => [p.id, p]));

    // 3. Fetch all transactions
    const tnsRes = await fetch(`${supabaseUrl}/rest/v1/transactions?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const transactions = await tnsRes.json();

    // Group by user_id
    const userGroups = new Map();
    transactions.forEach(t => {
      if (!userGroups.has(t.user_id)) {
        userGroups.set(t.user_id, []);
      }
      userGroups.get(t.user_id).push(t);
    });

    console.log('=== GLOBAL TRANSACTION PAIR AUDIT ===');
    for (const [userId, tnsList] of userGroups.entries()) {
      const email = profileMap.get(userId)?.company_email || 'Unknown';
      const name = profileMap.get(userId)?.full_name || 'Unknown';
      console.log(`\nUser: ${name} (${email}) - ID: ${userId}`);

      // Group by linked_transaction_id
      const linkedGroups = new Map();
      tnsList.forEach(t => {
        if (t.is_settlement) return; // Settlements are single-sided by design
        const lid = t.linked_transaction_id || t.id;
        if (!linkedGroups.has(lid)) {
          linkedGroups.set(lid, []);
        }
        linkedGroups.get(lid).push(t);
      });

      let userUnmatchedCount = 0;
      for (const [lid, tns] of linkedGroups.entries()) {
        if (tns.length !== 2) {
          userUnmatchedCount++;
          console.log(`  [UNMATCHED PAIR] linked_transaction_id: ${lid}`);
          tns.forEach(t => {
            console.log(`    - Party: ${partyMap.get(t.party_id)?.party_name || t.party_id}, Type: ${t.tns_type}, Credit: ${t.credit}, Debit: ${t.debit}, Remarks: "${t.remarks}", Date: ${t.transaction_date}`);
          });
        }
      }
      if (userUnmatchedCount === 0) {
        console.log('  All transaction pairs match perfectly.');
      } else {
        console.log(`  Total unmatched pairs: ${userUnmatchedCount}`);
      }
    }

  } catch (err) {
    console.error(err);
  }
}
run();
