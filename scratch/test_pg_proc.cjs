const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/pg_proc?select=*&limit=1`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('pg_proc query status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('pg_proc data sample:', data);
    } else {
      const txt = await res.text();
      console.log('Error output:', txt);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
