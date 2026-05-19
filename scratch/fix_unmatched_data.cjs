const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const targetUserId = '9a5e92ee-c6b1-49de-9126-f86488da58ac';
    const targetTxId = '15299e8e-7a90-46c0-b6f2-339ce4073fd0';
    const settlementId = '8b804354-b847-48a0-8b9e-f6c65fca631c';

    console.log('=== FIXING UNMATCHED DATA ===');

    // 1. Delete the unmatched transaction
    console.log(`Deleting unmatched transaction ${targetTxId}...`);
    const delRes = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${targetTxId}`, {
      method: 'DELETE',
      headers: { 
        'apikey': supabaseKey, 
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Delete status:', delRes.status);

    // 2. Update the settlement record
    console.log(`Updating settlement record ${settlementId} to Credit 100,000 and Balance 100,000...`);
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${settlementId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        credit: 100000,
        balance: 100000
      })
    });
    const updatedData = await updateRes.json();
    console.log('Updated settlement record:', updatedData);

  } catch (err) {
    console.error(err);
  }
}
run();
