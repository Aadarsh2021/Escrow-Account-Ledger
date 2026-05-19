const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const targetUserId = '9a5e92ee-c6b1-49de-9126-f86488da58ac';
    const devilRtgsPartyId = '8ff479dc-bb02-4d1d-b345-07a29f3fecdf';

    console.log('=== INSERTING ONE-SIDED CORRECTION TRANSACTION ===');
    
    // We insert a one-sided DR transaction of 100,000 for DEVIL RTGS to offset the duplicate CR 100,000 transaction.
    const res = await fetch(`${supabaseUrl}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: targetUserId,
        party_id: devilRtgsPartyId,
        remarks: 'System Balance Correction (Duplicate Entry Adjustment)',
        tns_type: 'DR',
        credit: 0,
        debit: 100000,
        balance: 100000, // New running balance of the active ledger for DEVIL RTGS
        is_finalized: false,
        is_settlement: false,
        transaction_date: new Date().toISOString()
      })
    });
    
    console.log('Insert status:', res.status);
    const data = await res.json();
    console.log('Inserted transaction:', data);

  } catch (err) {
    console.error(err);
  }
}
run();
