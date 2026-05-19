const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    // Fetch parties
    const partiesRes = await fetch(`${supabaseUrl}/rest/v1/parties?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const parties = await partiesRes.json();
    
    // Fetch all transactions
    const tnsRes = await fetch(`${supabaseUrl}/rest/v1/transactions?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const transactions = await tnsRes.json();
    
    console.log('--- COMMISSION CALCULATION FOR EACH PARTY ---');
    for (const p of parties) {
      if (p.system_type !== 'normal') continue;
      
      const isTake = p.status === 'take';
      const pTns = transactions.filter(t => t.party_id === p.id);
      const mainTns = pTns.filter(t => t.remarks !== 'COMMISSION');
      
      const totalVolume = mainTns.reduce((sum, t) => sum + (isTake ? t.credit : t.debit), 0);
      const calculatedComm = (totalVolume * p.commission_rate) / 100;
      
      console.log(`Party: ${p.party_name} | status: ${p.status} | rate: ${p.commission_rate}% | Total Volume: ${totalVolume} | Calculated Comm: ${calculatedComm}`);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
