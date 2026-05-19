const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const targetUserId = '9a5e92ee-c6b1-49de-9126-f86488da58ac';
    
    // Test nested query
    const url = `${supabaseUrl}/rest/v1/parties?user_id=eq.${targetUserId}&select=id,party_name,transactions(balance,transaction_date,created_at)&transactions.order=transaction_date.desc,created_at.desc&transactions.limit=1`;
    const res = await fetch(url, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const data = await res.json();
    console.log('=== NESTED QUERY RESULT ===');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
